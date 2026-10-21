// Mock Google APIs for the tests: realistic PageSpeed Insights v5 / CrUX shapes, deterministic per URL.
// scenario: { [urlSubstring]: 'blocked'|'notfound'|'nofcp'|'redirect:<url>'|'cookie'|'nofield'|'timeout'|'500' }
export function makeFetch({ scenario = {}, crux = {}, delay = 0, keyStatus = 'ok', cruxDisabled = false, calls = [] } = {}) {
  const h = s => { let x = 0; for (const c of s) x = (x * 31 + c.charCodeAt(0)) >>> 0; return x; };
  const json = (status, body) => ({ ok: status < 400, status, headers: { get: () => null }, json: async () => body });
  const err = (code, message, status, reason) => json(code, { error: { code, message, status, details: reason ? [{ reason }] : [] } });
  return async (url, init = {}) => {
    calls.push(url);
    if (init.signal?.aborted) throw Object.assign(new Error('aborted'), { name: 'AbortError' });
    if (delay) await new Promise((r, j) => { const t = setTimeout(r, delay); init.signal?.addEventListener('abort', () => { clearTimeout(t); j(Object.assign(new Error('aborted'), { name: 'AbortError' })); }); });
    const u = new URL(url);
    if (keyStatus === 'invalid') return err(400, 'API key not valid. Please pass a valid API key.', 'INVALID_ARGUMENT', 'API_KEY_INVALID');
    if (keyStatus === 'quota') return err(429, "Quota exceeded for quota metric 'Queries' and limit 'Queries per day'", 'RESOURCE_EXHAUSTED');
    if (u.hostname === 'www.googleapis.com') {
      const target = u.searchParams.get('url'), device = u.searchParams.get('strategy');
      const sc = Object.entries(scenario).find(([k]) => target.includes(k))?.[1] ?? '';
      if (sc === 'notfound') return err(500, 'Lighthouse returned error: ERRORED_DOCUMENT_REQUEST. Lighthouse was unable to reliably load the page you requested. (Status code: 404)', 'INTERNAL');
      if (sc === 'blocked403') return err(500, 'Lighthouse returned error: ERRORED_DOCUMENT_REQUEST. Lighthouse was unable to reliably load the page you requested. (Status code: 403)', 'INTERNAL');
      if (sc === 'nofcp') return err(500, 'Lighthouse returned error: NO_FCP. The page did not paint any content.', 'INTERNAL');
      if (sc === '500') return err(503, 'Backend unavailable', 'UNAVAILABLE');
      const seed = h(target + device);
      const r = n => ((seed >> n) % 1000) / 1000;
      const mob = device === 'mobile';
      const k = mob ? 1 : 0.35;
      const slow = sc === 'slow' ? 3.5 : 1;
      const lab = { fcp: (1500 + r(1) * 2500) * k * slow, si: (3000 + r(2) * 4000) * k * slow, lcp: (2500 + r(3) * 5000) * k * slow, tbt: (150 + r(4) * 1200) * k * slow, cls: r(5) * 0.3 };
      const final = sc.startsWith('redirect:') ? sc.slice(9) : target;
      const doc = { url: final, resourceType: 'Document', statusCode: sc === 'blocked' ? 403 : 200 };
      const reqs = [doc, { url: final + 'app.js', resourceType: 'Script', statusCode: 200 }];
      if (sc === 'cookie') reqs.push({ url: 'https://cdn.cookielaw.org/scripttemplates/otSDKStub.js', resourceType: 'Script', statusCode: 200 });
      const cr = Object.entries(crux).find(([k]) => target.includes(k))?.[1]; const fieldPresent = !sc.includes('nofield') && !target.includes('small') && !cruxDisabled && !(cr === 'mobileonly' && device === 'desktop') && cr !== 'none';
      const le = fieldPresent ? { id: target, metrics: { LARGEST_CONTENTFUL_PAINT_MS: { percentile: Math.round(lab.lcp * 0.6) }, INTERACTION_TO_NEXT_PAINT: { percentile: Math.round(120 + r(6) * 300) }, CUMULATIVE_LAYOUT_SHIFT_SCORE: { percentile: Math.round(lab.cls * 60) } } } : { initial_url: target };
      return json(200, {
        id: target,
        loadingExperience: le,
        originLoadingExperience: fieldPresent ? { ...le, id: new URL(target).origin } : {},
        lighthouseResult: {
          requestedUrl: target, finalUrl: final, mainDocumentUrl: final, finalDisplayedUrl: final, lighthouseVersion: '12.8.2',
          categories: { performance: { score: 0.5 } },
          audits: {
            'first-contentful-paint': { numericValue: lab.fcp }, 'speed-index': { numericValue: lab.si },
            'largest-contentful-paint': { numericValue: lab.lcp }, 'total-blocking-time': { numericValue: lab.tbt },
            'cumulative-layout-shift': { numericValue: lab.cls },
            'server-response-time': { numericValue: 600 + r(7) * 400, score: 0 },
            'image-delivery-insight': { score: 0, metricSavings: { LCP: Math.round(lab.lcp * 0.3), FCP: 0 }, details: { items: [{ url: 'a.jpg', totalBytes: 800000, wastedBytes: 500000 }, { url: 'b.jpg', totalBytes: 600000 }] } },
            'modern-image-formats': { score: 0.2, metricSavings: { LCP: Math.round(lab.lcp * 0.2) }, details: { items: [{ totalBytes: 1 }] } },
            'render-blocking-insight': { score: 0.5, metricSavings: { LCP: 400, FCP: 400 } },
            'render-blocking-resources': { score: 0.5, metricSavings: { LCP: 450, FCP: 450 } },
            'third-parties-insight': { score: 0, metricSavings: {}, details: { items: [{ entity: 'Google Tag Manager', mainThreadTime: 300 }, { entity: 'Hotjar', mainThreadTime: 500 }] } },
            'third-party-summary': { score: 0, metricSavings: { TBT: Math.round(lab.tbt * 0.4) }, details: { items: [{ entity: { type: 'link', text: 'Hotjar' }, blockingTime: 400 }] } },
            'unused-javascript': { score: 0, metricSavings: { LCP: 300, FCP: 0 }, details: { overallSavingsBytes: 312000 } },
            'bootup-time': { score: 0, metricSavings: { TBT: Math.round(lab.tbt * 0.3) } },
            'cls-culprits-insight': { score: lab.cls > 0.1 ? 0 : 1, metricSavings: { CLS: lab.cls > 0.1 ? +(lab.cls * 0.7).toFixed(3) : 0 } },
            'font-display-insight': { score: 1, metricSavings: { LCP: 0 } },
            'dom-size-insight': { score: 0, metricSavings: { INP: 120 } },
            'network-requests': { details: { items: reqs } },
          },
        },
      });
    }
    if (u.hostname === 'chromeuxreport.googleapis.com') {
      if (cruxDisabled) return err(403, 'Chrome UX Report API has not been used in project 123 before or it is disabled.', 'PERMISSION_DENIED', 'SERVICE_DISABLED');
      const body = JSON.parse(init.body);
      const id = body.origin ?? body.url;
      const ff = body.formFactor;
      const rule = Object.entries(crux).find(([k]) => id.includes(k))?.[1];
      // rule: 'none' (404) | 'mobileonly' | 'exact' (only this exact origin)
      if (rule === 'none' || (rule === 'mobileonly' && ff === 'DESKTOP') || id.includes('small')) return err(404, 'chrome ux report data not found', 'NOT_FOUND');
      if (body.url && !rule?.includes('urls')) return err(404, 'chrome ux report data not found', 'NOT_FOUND');
      if (rule?.startsWith('exact:') && !rule.includes(id)) return err(404, 'chrome ux report data not found', 'NOT_FOUND');
      const s = h(id + ff);
      const lcp = 1800 + (s % 2000), inp = 120 + (s % 250), cls = ((s % 25) / 100).toFixed(2);
      if (u.pathname.endsWith('queryRecord')) {
        return json(200, { record: { key: { formFactor: ff, [body.origin ? 'origin' : 'url']: id }, metrics: {
          largest_contentful_paint: { percentiles: { p75: lcp } }, interaction_to_next_paint: { percentiles: { p75: inp } }, cumulative_layout_shift: { percentiles: { p75: cls } } } } });
      }
      const n = body.collectionPeriodCount ?? 25;
      const periods = Array.from({ length: n }, (_, i) => { const d = new Date(2026, 9, 11 - 7 * (n - 1 - i)); const f = new Date(d - 27 * 864e5); return { firstDate: { year: f.getFullYear(), month: f.getMonth() + 1, day: f.getDate() }, lastDate: { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() } }; });
      const ts = (base, nul) => Array.from({ length: n }, (_, i) => (i === nul ? null : base + i * 3));
      return json(200, { record: { key: { formFactor: ff }, collectionPeriods: periods, metrics: {
        largest_contentful_paint: { percentilesTimeseries: { p75s: ts(lcp, 5) } },
        interaction_to_next_paint: { percentilesTimeseries: { p75s: ts(inp, 5) } },
        cumulative_layout_shift: { percentilesTimeseries: { p75s: ts(0, 5).map(v => (v == null ? null : (Number(cls) + v / 1000).toFixed(2))) } } } } });
    }
    throw new TypeError('fetch failed');
  };
}
