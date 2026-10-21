// Google's public APIs, called straight from the browser with the user's key:
//   PageSpeed Insights v5  runPagespeed                (lab: Lighthouse)
//   Chrome UX Report       records:queryRecord         (field: last 28 days)
//                          records:queryHistoryRecord  (field: weekly history)
// Each API has its own concurrency limit. Rate limits (429) and server errors
// (5xx) are retried with backoff; a daily quota, a bad key or a disabled API
// are not, since waiting would not help.

const PSI = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
const CRUX = 'https://chromeuxreport.googleapis.com/v1/records';
const CRUX_METRICS = ['largest_contentful_paint', 'interaction_to_next_paint', 'cumulative_layout_shift'];
export const FORM_FACTOR = { mobile: 'PHONE', desktop: 'DESKTOP' };
export const HISTORY_WEEKS = 26;

// kind: key · disabled · quota · notfound · lighthouse · timeout · network · http · aborted
export class ApiError extends Error {
  constructor(kind, { status = 0, message = '', api = '', code = '' } = {}) {
    super(message || kind);
    Object.assign(this, { kind, status, api, code });
  }
}

const sleep = (ms, signal) => new Promise((resolve, reject) => {
  if (signal?.aborted) { reject(new ApiError('aborted')); return; }
  const timer = setTimeout(() => { signal?.removeEventListener('abort', stop); resolve(); }, ms);
  const stop = () => { clearTimeout(timer); reject(new ApiError('aborted')); };
  signal?.addEventListener('abort', stop, { once: true });
});

// At most n tasks at a time, the rest wait their turn in order.
export function limiter(n) {
  let active = 0;
  const queue = [];
  const next = () => {
    if (active >= n || !queue.length) return;
    active++;
    const { task, resolve, reject } = queue.shift();
    Promise.resolve().then(task).then(resolve, reject).finally(() => { active--; next(); });
  };
  return task => new Promise((resolve, reject) => { queue.push({ task, resolve, reject }); next(); });
}

// Google's error body → a kind the analysis can act on.
function classify(status, body, api) {
  const err = body?.error ?? {};
  const message = err.message ?? '';
  const reasons = [...(err.details ?? []).map(d => d.reason), ...(err.errors ?? []).map(e => e.reason)].filter(Boolean).join(' ');
  const opts = { status, message, api };
  if (/API_KEY_INVALID|API_KEY_HTTP_REFERRER_BLOCKED|API_KEY_SERVICE_BLOCKED|keyInvalid/i.test(reasons) || /API key not valid|referer .* blocked/i.test(message)) return new ApiError('key', opts);
  if (/SERVICE_DISABLED|accessNotConfigured/i.test(reasons) || /has not been used in project|is disabled/i.test(message)) return new ApiError('disabled', opts);
  if (status === 429) return new ApiError(/per day|PerDay/i.test(message + JSON.stringify(err.details ?? [])) ? 'quota' : 'rate', opts);
  if (status === 404) return new ApiError('notfound', opts);
  const lh = message.match(/Lighthouse returned error: ([A-Z_]+)/);
  if (lh) return new ApiError('lighthouse', { ...opts, code: lh[1] });
  return new ApiError('http', opts);
}

const RETRY = new Set(['rate', 'http', 'timeout', 'network', 'lighthouse']);

export function createClient({ key, fetch: fetchImpl = globalThis.fetch?.bind(globalThis), signal, psiConcurrency = 5, cruxConcurrency = 4, retries = 3, backoff = 1500 } = {}) {
  const psiQueue = limiter(psiConcurrency);
  const cruxQueue = limiter(cruxConcurrency);

  async function once(url, init, api, timeoutMs) {
    // A request still queued when the run stops never leaves.
    if (signal?.aborted) throw new ApiError('aborted', { api });
    const ctrl = new AbortController();
    const abort = () => ctrl.abort();
    signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(abort, timeoutMs);
    try {
      const res = await fetchImpl(url, { ...init, signal: ctrl.signal });
      const body = await res.json().catch(() => null);
      if (res.ok) return body;
      const error = classify(res.status, body, api);
      error.retryAfter = Number(res.headers?.get?.('retry-after')) || 0;
      throw error;
    } catch (e) {
      if (e instanceof ApiError) throw e;
      if (signal?.aborted) throw new ApiError('aborted', { api });
      if (ctrl.signal.aborted) throw new ApiError('timeout', { api });
      throw new ApiError('network', { api, message: e?.message });
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    }
  }

  // Lighthouse errors are often a bad page, not a bad moment: one retry only.
  async function call(url, init, api, timeoutMs) {
    for (let attempt = 0; ; attempt++) {
      try {
        return await once(url, init, api, timeoutMs);
      } catch (e) {
        const max = e.kind === 'lighthouse' ? 1 : retries;
        if (!RETRY.has(e.kind) || (e.kind === 'http' && e.status < 500) || attempt >= max) throw e;
        const wait = e.retryAfter ? e.retryAfter * 1000 : backoff * 2 ** attempt * (0.75 + Math.random() / 2);
        await sleep(Math.min(wait, 60000), signal);
      }
    }
  }

  return {
    // onStart: the run leaves the queue (progress shows it measuring only then).
    psi(url, device, onStart) {
      const q = new URLSearchParams({ url, strategy: device, category: 'performance', key });
      return psiQueue(() => { onStart?.(); return call(`${PSI}?${q}`, {}, 'psi', 120000); });
    },
    // null when CrUX has no data for this page or site (too little traffic).
    async cruxRecord(target, device) {
      return cruxQueue(() => call(`${CRUX}:queryRecord?key=${encodeURIComponent(key)}`, post({ ...target, formFactor: FORM_FACTOR[device], metrics: CRUX_METRICS }), 'crux', 20000))
        .catch(e => { if (e.kind === 'notfound') return null; throw e; });
    },
    async cruxHistory(target, device) {
      return cruxQueue(() => call(`${CRUX}:queryHistoryRecord?key=${encodeURIComponent(key)}`, post({ ...target, formFactor: FORM_FACTOR[device], metrics: CRUX_METRICS, collectionPeriodCount: HISTORY_WEEKS }), 'crux', 20000))
        .catch(e => { if (e.kind === 'notfound') return null; throw e; });
    },
  };
}

const post = body => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

// ── What a key opens, without measuring anything ─────────────
// One light request per API. Google checks the key and the API at the door,
// before reading the request: PageSpeed gets one with no page to measure, so
// a working key comes straight back "missing parameter"; CrUX is asked about
// a site it always knows. Verdict per API:
//   ok · off (API not enabled, or not allowed for this key) · refused (bad or
//   restricted key) · quota (today's is spent) · network · unknown

export const KEY_FORMAT = /^AIza[0-9A-Za-z_-]{35}$/;

function verdict(status, body, api) {
  const err = body?.error ?? {};
  const message = err.message ?? '';
  const reasons = [...(err.details ?? []).map(d => d.reason), ...(err.errors ?? []).map(e => e.reason)].filter(Boolean).join(' ');
  if (/API_KEY_SERVICE_BLOCKED/.test(reasons)) return 'off';
  if (/API_KEY_INVALID|API_KEY_HTTP_REFERRER_BLOCKED|API_KEY_IP_ADDRESS_BLOCKED|keyInvalid/i.test(reasons) || /API key not valid|referer .* blocked/i.test(message)) return 'refused';
  if (/SERVICE_DISABLED|accessNotConfigured/i.test(reasons) || /has not been used in project|is disabled/i.test(message)) return 'off';
  if (status === 429) return /per day|PerDay/i.test(message + JSON.stringify(err.details ?? [])) ? 'quota' : 'ok';
  // Past the door: the key works and the API is on (CrUX may know no data).
  if (status === 400 || (api === 'crux' && status === 404)) return 'ok';
  return 'unknown';
}

export async function checkKey(key, { fetch: fetchImpl = globalThis.fetch?.bind(globalThis), signal, timeoutMs = 15000 } = {}) {
  const probe = async (url, init, api) => {
    const ctrl = new AbortController();
    const abort = () => ctrl.abort();
    signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(abort, timeoutMs);
    try {
      const res = await fetchImpl(url, { ...init, signal: ctrl.signal });
      if (res.ok) return 'ok';
      return verdict(res.status, await res.json().catch(() => null), api);
    } catch {
      return 'network';
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    }
  };
  const k = encodeURIComponent(key);
  const [psi, crux] = await Promise.all([
    probe(`${PSI}?key=${k}`, {}, 'psi'),
    probe(`${CRUX}:queryRecord?key=${k}`, post({ origin: 'https://www.google.com', formFactor: 'PHONE' }), 'crux'),
  ]);
  return { psi, crux };
}
