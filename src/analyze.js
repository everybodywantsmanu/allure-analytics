// A real analysis, end to end: PageSpeed Insights for every page and device
// (yours and each competitor's equivalent pages), then Chrome UX Report for
// what real visitors live, with its weekly history.
//
// It produces exactly the shape src/demo.js builds, so position, quick wins
// and every view run unchanged on real data:
//   measurements[device] = { device, ts, origin:{field},
//     pages:{ id:{ field, fieldSource, lab:{fcp,si,lcp,tbt,cls,score}, audits:[{id,savings,detail}] } },
//     competitors:{ id:{ field, pages:{ id:{ lab } } } } }
// A failed page never stops the rest: it is left without `lab`, and the
// like-for-like comparison drops it. Only a refused key, a disabled API or a
// spent daily quota stop the run, since nothing could be measured anyway.

import { pageSpeedScore, AUDITS, AUDIT_ALIASES } from './metrics.js';
import { createClient, ApiError } from './api.js';
import { pageUrl, sameSite, samePage, hashId } from './url.js';

export const DEVICES = ['mobile', 'desktop'];
// No field data for a page: its lab score is the median of three runs (SPEC § 4).
export const RUNS_WITHOUT_FIELD = 3;
const CART = /(panier|cart|basket|bag|checkout|commande|paiement|payment)/i;
const finite = Number.isFinite;

// ── Lighthouse → lab metrics, findings, signals ──────────────

export function labOf(lhr, device) {
  const v = id => lhr?.audits?.[id]?.numericValue;
  const lab = { fcp: v('first-contentful-paint'), si: v('speed-index'), lcp: v('largest-contentful-paint'), tbt: v('total-blocking-time'), cls: v('cumulative-layout-shift') };
  if (!Object.values(lab).every(finite)) return null;
  for (const k of ['fcp', 'si', 'lcp', 'tbt']) lab[k] = Math.round(lab[k]);
  lab.cls = Math.round(lab.cls * 1000) / 1000;
  return { ...lab, score: pageSpeedScore(lab, device) };
}

const entityName = e => (typeof e === 'string' ? e : e?.text ?? e?.value ?? e?.name ?? '');

// What the fix copy needs from Lighthouse's details (see AUDIT_COPY in i18n).
function detailOf(id, lhId, audit, lhr) {
  const items = Array.isArray(audit.details?.items) ? audit.details.items : [];
  if (id === 'image-delivery-insight') {
    const bytes = items.reduce((s, it) => s + (finite(it.totalBytes) ? it.totalBytes : 0), 0);
    return bytes > 0 ? { n: items.length, kb: Math.round(bytes / 1000) } : {};
  }
  if (lhId === 'unused-javascript') {
    const bytes = audit.details?.overallSavingsBytes;
    return finite(bytes) && bytes > 0 ? { kb: Math.round(bytes / 1000) } : {};
  }
  if (id === 'third-parties-insight') {
    const cost = it => it.mainThreadTime ?? it.blockingTime ?? 0;
    const top = [...items].sort((a, b) => cost(b) - cost(a)).map(it => entityName(it.entity)).find(Boolean);
    return top ? { name: top } : {};
  }
  if (id === 'document-latency-insight') {
    const ms = lhr.audits?.['server-response-time']?.numericValue;
    return finite(ms) && ms > 0 ? { ms: Math.round(ms) } : {};
  }
  return {};
}

// Audits and insights with savings → catalogue fixes. "inp" savings are Total
// Blocking Time, Lighthouse's lab stand-in for responsiveness.
export function findingsOf(lhr) {
  const found = new Map();
  for (const [lhId, audit] of Object.entries(lhr?.audits ?? {})) {
    const id = AUDITS[lhId] ? lhId : AUDIT_ALIASES[lhId];
    if (!id || !audit || audit.score === 1) continue;
    const ms = audit.metricSavings ?? {};
    const savings = {};
    if (ms.LCP >= 1) savings.lcp = Math.round(ms.LCP);
    if (ms.TBT >= 1) savings.inp = Math.round(ms.TBT);
    if (ms.CLS >= 0.001) savings.cls = Math.round(ms.CLS * 1000) / 1000;
    if (!Object.keys(savings).length) continue;
    const f = found.get(id) ?? { id, savings: {}, detail: {} };
    for (const [m, s] of Object.entries(savings)) f.savings[m] = Math.max(f.savings[m] ?? 0, s);
    const detail = detailOf(id, lhId, audit, lhr);
    // The catalogue's own audit describes the fix best; an alias only fills gaps.
    f.detail = lhId === id ? { ...f.detail, ...detail } : { ...detail, ...f.detail };
    found.set(id, f);
  }
  return [...found.values()];
}

// Consent platforms, by the requests they make or the third party they are.
const CMP = /onetrust|cookielaw|didomi|axeptio|cookiebot|usercentrics|trustarc|consensu\.org|quantcast|consentmanager|sourcepoint|sp-prod\.net|privacy-mgmt|iubenda|tarteaucitron|cookiefirst|cookieyes|cookie-script|termly|osano|klaro|complianz|cookiehub|commandersact|trustcommander|sirdata|cookie-?consent/i;
const BLOCKED_STATUS = new Set([401, 403, 429, 503]);

export function signalsOf(lhr) {
  const requests = lhr?.audits?.['network-requests']?.details?.items ?? [];
  const parties = [lhr?.audits?.['third-parties-insight'], lhr?.audits?.['third-party-summary']]
    .flatMap(a => a?.details?.items ?? []).map(it => entityName(it.entity));
  const doc = requests.find(r => r.resourceType === 'Document');
  return {
    cookie: requests.some(r => CMP.test(r.url ?? '')) || parties.some(p => CMP.test(p)),
    // A challenge page is fast and empty: measuring it would flatter the site.
    blocked: BLOCKED_STATUS.has(doc?.statusCode),
  };
}

const finalUrlOf = (lhr, requested) => lhr?.mainDocumentUrl ?? lhr?.finalUrl ?? lhr?.finalDisplayedUrl ?? requested;

// Why a page could not be measured, in a few words.
export function reasonOf(error) {
  const msg = error?.message ?? '';
  if (error?.kind === 'lighthouse') {
    const status = Number(msg.match(/Status code: (\d{3})/)?.[1]);
    if (error.code === 'BLOCKED' || BLOCKED_STATUS.has(status)) return 'blocked';
    if (status === 404 || status === 410) return 'notfound';
    if (error.code === 'DNS_FAILURE' || /ERR_NAME_NOT_RESOLVED/.test(msg)) return 'dns';
    if (/^(NO_FCP|NO_LCP|NO_SCREENSHOTS|NO_SPEEDLINE_FRAMES|NO_METRICS)$/.test(error.code)) return 'nopaint';
    if (/TIMEOUT|PAGE_HUNG|TIMED_OUT/.test(error.code + msg)) return 'timeout';
    if (error.code === 'NOT_HTML') return 'nothtml';
    if (/DOCUMENT_REQUEST/.test(error.code)) return 'unreachable';
    return 'error';
  }
  if (error?.kind === 'timeout') return 'timeout';
  if (error?.kind === 'network') return 'network';
  return 'error';
}

// ── CrUX → field values and weekly rows ──────────────────────

const num = v => { const n = typeof v === 'string' ? Number(v) : v; return finite(n) ? n : null; };
const CRUX_KEYS = { lcp: 'largest_contentful_paint', inp: 'interaction_to_next_paint', cls: 'cumulative_layout_shift' };

// p75 values, plus the share of visits Google counts as good (the first bin
// of its histogram): field = { lcp, inp, cls, good: { lcp, inp, cls } }.
const share = v => { const n = num(v); return n == null ? null : Math.round(Math.max(0, Math.min(1, n)) * 1000) / 1000; };
export function fieldFromCrux(json) {
  const metrics = json?.record?.metrics ?? {};
  const field = {}, good = {};
  for (const [m, k] of Object.entries(CRUX_KEYS)) {
    const v = num(metrics[k]?.percentiles?.p75);
    if (v != null) field[m] = m === 'cls' ? Math.round(v * 1000) / 1000 : Math.round(v);
    const g = share(metrics[k]?.histogram?.[0]?.density);
    if (g != null) good[m] = g;
  }
  if (Object.keys(good).length) field.good = good;
  return field;
}

const dateOf = d => (d ? new Date(d.year, d.month - 1, d.day) : null);
export function rowsFromHistory(json) {
  const rec = json?.record;
  const periods = rec?.collectionPeriods ?? [];
  const series = Object.fromEntries(Object.entries(CRUX_KEYS).map(([m, k]) => [m, rec?.metrics?.[k]?.percentilesTimeseries?.p75s ?? []]));
  return periods.map((p, i) => {
    const row = { end: dateOf(p.lastDate)?.toISOString() ?? null };
    for (const m of Object.keys(CRUX_KEYS)) {
      const v = num(series[m][i]);
      row[m] = v == null ? null : m === 'cls' ? Math.round(v * 1000) / 1000 : Math.round(v);
    }
    return row;
  }).filter(r => r.end);
}

// PageSpeed's own copy of CrUX, used when the CrUX API is unavailable.
const PSI_KEYS = { lcp: 'LARGEST_CONTENTFUL_PAINT_MS', inp: 'INTERACTION_TO_NEXT_PAINT', cls: 'CUMULATIVE_LAYOUT_SHIFT_SCORE' };
export function fieldFromPsi(le) {
  const field = {}, good = {};
  for (const [m, k] of Object.entries(PSI_KEYS)) {
    const v = num(le?.metrics?.[k]?.percentile);
    if (v != null) field[m] = m === 'cls' ? v / 100 : v;
    const g = share(le?.metrics?.[k]?.distributions?.[0]?.proportion);
    if (g != null) good[m] = g;
  }
  if (Object.keys(good).length) field.good = good;
  return field;
}
const hasUrlField = le => !!le && !le.origin_fallback && Object.keys(fieldFromPsi(le)).length > 0;
const filled = field => Object.keys(field ?? {}).length > 0;

// ── The run ──────────────────────────────────────────────────

// Every site and every PageSpeed run to make. A competitor's home page is
// compared by default; its other pages only when an equivalent is given.
export function planRun(project) {
  const sites = [
    { id: 'you', you: true, name: project.name, origin: project.origin,
      pages: project.pages.map(p => ({ pageId: p.id, url: pageUrl(project.origin, p.path) })) },
    ...project.competitors.map(c => ({ id: c.id, name: c.name, origin: c.origin,
      pages: project.pages.filter(p => c.pages?.[p.id]).map(p => ({ pageId: p.id, url: c.pages[p.id] })) })),
  ];
  const jobs = sites.flatMap(s => s.pages.flatMap(p => DEVICES.map(device => ({
    key: `${s.id}|${p.pageId}|${device}`, site: s.id, pageId: p.pageId, url: p.url, device, status: 'wait', run: 0, runs: 1,
  }))));
  // CrUX steps: for each device, every site's origin and each of your pages
  // (a record and its weekly history each).
  const fieldSteps = DEVICES.length * (sites.length + project.pages.length);
  return { sites, jobs, fieldSteps };
}

const FATAL = e => e?.kind === 'key' || e?.kind === 'quota' || (e?.kind === 'disabled' && e.api === 'psi') || e?.kind === 'aborted';

export async function runAnalysis({ project, key, fetch, signal, onProgress = () => {}, now = new Date(), clientOptions = {} }) {
  const ctrl = new AbortController();
  const stop = () => ctrl.abort();
  if (signal?.aborted) stop();
  signal?.addEventListener('abort', stop, { once: true });
  const client = createClient({ key, fetch, signal: ctrl.signal, ...clientOptions });

  const { sites, jobs, fieldSteps } = planRun(project);
  const progress = { jobs, field: { total: fieldSteps, done: 0, off: null }, fatal: null };
  const emit = () => onProgress(progress);
  const fail = e => {
    if (!progress.fatal && e?.kind !== 'aborted') progress.fatal = { kind: e.kind, api: e.api };
    stop();
  };

  // One PageSpeed run → what Allure keeps from it (the raw result is dropped).
  async function psiRun(job, k) {
    const json = await client.psi(job.url, job.device, () => { job.status = 'run'; job.run = k; emit(); });
    const lhr = json?.lighthouseResult;
    if (!lhr) throw new ApiError('http', { api: 'psi', message: 'empty result' });
    if (lhr.runtimeError?.code && lhr.runtimeError.code !== 'NO_ERROR') throw new ApiError('lighthouse', { api: 'psi', code: lhr.runtimeError.code, message: lhr.runtimeError.message });
    const signals = signalsOf(lhr);
    if (signals.blocked) throw new ApiError('lighthouse', { api: 'psi', code: 'BLOCKED' });
    const lab = labOf(lhr, job.device);
    if (!lab) throw new ApiError('lighthouse', { api: 'psi', code: 'NO_METRICS' });
    return { lab, audits: findingsOf(lhr), finalUrl: finalUrlOf(lhr, job.url), signals, le: json.loadingExperience, ole: json.originLoadingExperience };
  }

  async function measure(job) {
    try {
      const runs = [await psiRun(job, 1)];
      if (!hasUrlField(runs[0].le)) {
        job.runs = RUNS_WITHOUT_FIELD;
        for (let k = 2; k <= RUNS_WITHOUT_FIELD; k++) {
          try { runs.push(await psiRun(job, k)); } catch (e) { if (FATAL(e)) throw e; break; }
        }
      }
      // The median run, kept whole: its metrics and findings belong together.
      const sorted = [...runs].sort((a, b) => a.lab.score - b.lab.score);
      job.result = sorted[Math.floor((sorted.length - 1) / 2)];
      job.result.cookie = runs.some(r => r.signals.cookie);
      job.status = 'done'; job.score = job.result.lab.score;
    } catch (e) {
      if (FATAL(e)) { fail(e); job.status = 'wait'; return; }
      job.status = 'fail'; job.reason = reasonOf(e);
    }
    emit();
  }

  // CrUX: no data is not an error, and a disabled or refused CrUX API switches
  // to PageSpeed's own copy of the field data for the rest of the run.
  async function crux(kind, target, device) {
    if (progress.field.off || ctrl.signal.aborted) return null;
    try {
      return await (kind === 'record' ? client.cruxRecord(target, device) : client.cruxHistory(target, device));
    } catch (e) {
      if (e.kind === 'disabled' || e.kind === 'key' || e.kind === 'quota') progress.field.off = e.kind;
      return null;
    }
  }
  const step = async fn => { try { return await fn(); } finally { progress.field.done++; emit(); } };

  // The exact origin CrUX knows: where PageSpeed landed, then the address as
  // entered, then its www / non-www twin.
  const field = Object.fromEntries(sites.map(s => [s.id, {}]));
  const canonical = {};
  const originOf = href => { try { return new URL(href).origin; } catch { return null; } };
  const twin = o => { const u = new URL(o); u.hostname = u.hostname.startsWith('www.') ? u.hostname.slice(4) : `www.${u.hostname}`; return u.origin; };
  async function fieldFor(site) {
    const landed = jobs.filter(j => j.site === site.id && j.status === 'done').map(j => originOf(j.result.finalUrl)).find(o => o && sameSite(o, site.origin));
    canonical[site.id] = landed ?? site.origin;
    const origins = [...new Set([canonical[site.id], site.origin, twin(canonical[site.id])])];
    await Promise.all(DEVICES.map(async device => {
      const out = field[site.id][device] = { origin: {}, history: [], pages: {} };
      await step(async () => {
        for (const origin of origins) {
          const rec = await crux('record', { origin }, device);
          if (!rec) continue;
          out.origin = fieldFromCrux(rec);
          out.history = rowsFromHistory(await crux('history', { origin }, device));
          break;
        }
      });
      if (!site.you) return;
      await Promise.all(site.pages.map(p => step(async () => {
        const job = jobs.find(j => j.site === 'you' && j.pageId === p.pageId && j.device === device);
        const url = job?.status === 'done' ? job.result.finalUrl : p.url;
        const rec = await crux('record', { url }, device);
        out.pages[p.pageId] = { field: fieldFromCrux(rec), history: rec ? rowsFromHistory(await crux('history', { url }, device)) : [] };
      })));
    }));
  }

  emit();
  // Sites are queued in order (you first); each site's field data follows its lab runs.
  await Promise.all(sites.map(async site => {
    await Promise.all(jobs.filter(j => j.site === site.id).map(measure));
    if (!ctrl.signal.aborted) await fieldFor(site);
  }));
  signal?.removeEventListener('abort', stop);
  if (signal?.aborted) return { status: 'aborted', progress };
  if (progress.fatal) return { status: 'failed', progress };
  return { status: 'done', progress, ...assemble({ project, sites, jobs, field, canonical, progress, now }) };
}

// ── Assembly: the demo's shape, plus notes on what to keep in mind ──

function assemble({ project, sites, jobs, field, canonical, progress, now }) {
  const ts = now.toISOString();
  const job = (site, pageId, device) => jobs.find(j => j.site === site && j.pageId === pageId && j.device === device);
  const resolved = {
    ...project,
    origin: canonical.you ?? project.origin,
    competitors: project.competitors.map(c => ({ ...c, origin: canonical[c.id] ?? c.origin })),
  };

  const measurements = {}, history = {}, lab = {};
  for (const device of DEVICES) {
    const mine = jobs.filter(j => j.site === 'you' && j.device === device && j.status === 'done');
    // Field: the CrUX API first, then PageSpeed's copy of it; never the lab.
    const fieldOf = siteId => {
      const api = field[siteId]?.[device]?.origin;
      if (filled(api)) return api;
      const ole = jobs.find(j => j.site === siteId && j.device === device && j.status === 'done' && filled(fieldFromPsi(j.result.ole)));
      return ole ? fieldFromPsi(ole.result.ole) : {};
    };
    const origin = { field: fieldOf('you') };
    const pages = {};
    for (const p of project.pages) {
      const j = job('you', p.id, device);
      if (j?.status !== 'done') { pages[p.id] = { error: j?.reason ?? 'error' }; continue; }
      const { lab: l, audits, le } = j.result;
      // Repli: page field → site field → lab estimate (always labelled as such).
      const api = field.you?.[device]?.pages?.[p.id]?.field;
      let fieldSource = 'url', pageField = filled(api) ? api : hasUrlField(le) ? fieldFromPsi(le) : null;
      if (!pageField && filled(origin.field)) { pageField = origin.field; fieldSource = 'origin'; }
      if (!pageField) { pageField = { lcp: l.lcp, cls: l.cls }; fieldSource = 'lab'; }
      pages[p.id] = { url: j.result.finalUrl, field: pageField, fieldSource, lab: l, audits };
    }
    const competitors = Object.fromEntries(project.competitors.map(c => [c.id, {
      field: fieldOf(c.id),
      pages: Object.fromEntries(project.pages.flatMap(p => {
        const j = job(c.id, p.id, device);
        return j?.status === 'done' ? [[p.id, { url: j.result.finalUrl, lab: j.result.lab }]] : [];
      })),
    }]));
    measurements[device] = { device, ts, origin, pages, competitors };
    history[device] = {
      origin: field.you?.[device]?.history ?? [],
      pages: Object.fromEntries(project.pages.map(p => [p.id, field.you?.[device]?.pages?.[p.id]?.history ?? []])),
      competitors: Object.fromEntries(project.competitors.map(c => [c.id, field[c.id]?.[device]?.history ?? []])),
    };
    // This run's contribution to the weekly PageSpeed history. A competitor's
    // score carries a hash of the page measured: change the page, restart its line.
    lab[device] = {
      you: Object.fromEntries(mine.map(j => [j.pageId, j.score])),
      competitors: Object.fromEntries(project.competitors.map(c => [c.id, Object.fromEntries(
        jobs.filter(j => j.site === c.id && j.device === device && j.status === 'done').map(j => [j.pageId, { s: j.score, h: hashId(j.url) }]),
      )])),
    };
  }

  return { ts, project: resolved, measurements, history, lab, notes: notesOf({ project, resolved, sites, jobs, measurements, progress }), ok: jobs.some(j => j.site === 'you' && j.status === 'done') };
}

// Things worth knowing about this run, none of them an alert.
function notesOf({ project, resolved, sites, jobs, measurements, progress }) {
  const notes = [];
  const pageName = id => project.pages.find(p => p.id === id)?.name ?? '';
  for (const s of sites) {
    const to = s.you ? resolved.origin : resolved.competitors.find(c => c.id === s.id)?.origin;
    if (to && to !== s.origin) notes.push({ kind: 'origin', site: s.id, name: s.name, to });
  }
  // A page that lands somewhere else (a login, the home page) is what gets measured.
  const seen = new Set();
  for (const j of jobs) {
    if (j.status !== 'done' || samePage(j.url, j.result.finalUrl) || seen.has(`${j.site}|${j.pageId}`)) continue;
    seen.add(`${j.site}|${j.pageId}`);
    const site = sites.find(s => s.id === j.site);
    notes.push({ kind: 'redirect', site: j.site, name: site.name, page: pageName(j.pageId), to: j.result.finalUrl });
  }
  const mine = jobs.filter(j => j.site === 'you');
  const ids = pred => [...new Set(mine.filter(pred).map(j => j.pageId))];
  const blocked = ids(j => j.status === 'fail' && j.reason === 'blocked');
  if (blocked.length) notes.push({ kind: 'blocked', pages: blocked.map(pageName) });
  const cookie = ids(j => j.status === 'done' && j.result.cookie);
  if (cookie.length) notes.push({ kind: 'cookie', pages: cookie.map(pageName) });
  const words = name => (typeof name === 'string' ? name : Object.values(name ?? {}).join(' '));
  const cart = project.pages.filter(p => CART.test(`${words(p.name)} ${p.path}`) && mine.some(j => j.pageId === p.id && j.status === 'done'));
  if (cart.length) notes.push({ kind: 'cart', pages: cart.map(p => p.name) });
  if (progress.field.off) notes.push({ kind: 'cruxoff' });
  // Field data: none at all (a small site), or on one device only.
  const has = DEVICES.filter(d => filled(measurements[d].origin.field));
  if (!has.length) notes.push({ kind: 'nofield' });
  else if (has.length === 1) notes.push({ kind: 'onedevice', has: has[0], missing: DEVICES.find(d => d !== has[0]) });
  const failed = jobs.filter(j => j.status === 'fail').length;
  if (failed) notes.push({ kind: 'partial', n: failed });
  return notes;
}
