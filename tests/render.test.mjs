// Edge cases end to end, on mocked Google APIs (no key, no network): run real
// analyses, save them through storage.js, rebuild, then render the home and
// Compare screens on both devices and in both languages, failing on any NaN,
// undefined, [object Object], Infinity or stray null in the markup.
// Run with: node --test tests/
globalThis.navigator ??= { language: 'fr-FR' };
const mem = new Map(); let QUOTA = Infinity;
globalThis.localStorage = {
  getItem: k => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => { const size = [...mem].reduce((s, [kk, vv]) => s + (kk === k ? 0 : vv.length), 0) + v.length; if (size > QUOTA) { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; } mem.set(k, String(v)); },
  removeItem: k => mem.delete(k),
};
const SRC = new URL('../src/', import.meta.url).href;
const { makeFetch } = await import('./google-mock.mjs');
const { runAnalysis } = await import(SRC + 'analyze.js');
const P = await import(SRC + 'project.js');
const { renderHome } = await import(SRC + 'views/home.js');
const { setLang } = await import(SRC + 'i18n.js');
const { position } = await import(SRC + 'benchmark.js');
const { loadDemo } = await import(SRC + 'demo.js');
const { renderCompare } = await import(SRC + 'views/compare.js');

const txt2 = x => x.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const peek = h => ({
  deltas: [...h.matchAll(/<span class="bname">([\s\S]*?)<\/span>\s*<span class="btrack">[\s\S]*?<span class="bval[^"]*"[^>]*>(\d+)[\s\S]*?(?:<span class="bdelta"[^>]*>(?:<span aria-hidden="true">([^<]*)<\/span>)?)?/g)].map(m => txt2(m[1]).replace(' vous', '') + ' ' + m[2] + (m[3] ? ' ' + m[3] : '')).join(' | '),
  gaps: (h.match(/class="bgap"/g) ?? []).length,
  sum: txt2(h.match(/<div class="gauge-sum">([\s\S]*?)<div class="gauge"/)?.[1] ?? ''),
  labels: [...h.matchAll(/class="glabel"[^>]*>([^<]+)</g)].map(m => m[1]).join(' '),
  cards: [...h.matchAll(/fix-impact">([^<]+)</g)].map(m => m[1]).join(' '),
  since: /class="since/.test(h), doing: /pill--doing|proof/.test(h), tri: /▲ <\/tspan>|class="mark"/.test(h),
});
const BAD = /NaN|undefined|\[object Object\]|Infinity|>null</;
let failures = 0;
function checkCompare(label, data) {
  for (const lang of ['fr', 'en']) {
    setLang(lang);
    for (const device of ['mobile', 'desktop']) for (const tab of ['score', 'lcp', 'inp', 'cls', 'nope']) {
      let html;
      try { html = renderCompare({ data, device, tab, layout: lang === 'fr' ? { hero: 960, split: 560, wide: true } : { hero: 340, split: 0, wide: false } }); }
      catch (e) { console.log('✗ compare', label, lang, device, tab, 'THROWS', e.stack); failures++; continue; }
      const bad = html.match(BAD) || html.replace(/<[^>]+>/g, ' ').match(/\bnull\b/);
      if (bad) { failures++; console.log('✗ compare', label, lang, device, tab, 'found', bad[0], '…', html.slice(Math.max(0, html.indexOf(bad[0]) - 140), html.indexOf(bad[0]) + 60)); }
    }
  }
}
function check(label, data) {
  checkCompare(label, data);
  for (const lang of ['fr', 'en']) {
    setLang(lang);
    for (const device of ['mobile', 'desktop']) {
      let html;
      try { html = renderHome({ data, device, layout: lang === 'fr' ? { hero: 960, split: 580, wide: true } : { hero: 340, split: 0, wide: false } }); } catch (e) { console.log('✗', label, lang, device, 'THROWS', e.stack); failures++; continue; }
      const text = html.replace(/<[^>]+>/g, ' ');
      const bad = html.match(BAD) || text.match(/\bnull\b/);
      if (bad) { failures++; console.log('✗', label, lang, device, 'found', bad[0], '…', html.slice(Math.max(0, html.indexOf(bad[0]) - 120), html.indexOf(bad[0]) + 60)); }
      else if (lang === 'fr') {
        const h1 = html.match(/<h1[^>]*>(.*?)<\/h1>/s)?.[1].replace(/<[^>]+>/g, '');
        const chart = html.includes('class="chart"') ? 'chart' : html.includes('chart-empty') ? 'no-curve' : '';
        const m = data.measurements?.[device];
        const pos = m ? position(data.project, m) : null;
        console.log('✓', label.padEnd(28), device.padEnd(7), (h1 ?? '').trim().slice(0, 70).padEnd(70), chart, pos ? `set=${pos.set.length} table=${pos.table.length} excl=${pos.excluded.map(e => e.reason).join(',')}` : '');
      }
    }
  }
}
const at = (w, h = 15) => new Date(2026, 9, 17 + 7 * w, h);
const base = {
  v: 1, site: 'monsite.fr', name: 'Mon site',
  pages: [
    { key: 'a', name: '', path: '/', weight: 2 },
    { key: 'b', name: 'Fiche produit', path: '/produit/manteau', weight: 3 },
    { key: 'c', name: 'Panier', path: '/panier', weight: 3 },
  ],
  competitors: [
    { key: 'x', name: 'Lumen & Co', site: 'lumen.example.com', pages: { b: '/p/manteau', c: '/cart' } },
    { key: 'y', name: 'Comptoir Sud', site: 'sud.example.org', pages: { b: '/prod' } },
  ],
};
async function analyse(setup, { now, fetchOpts = {}, label }) {
  const { project, errors } = P.validate(setup, 'k');
  if (!project) throw new Error('invalid ' + JSON.stringify(errors));
  const run = await runAnalysis({ project, key: 'k', fetch: makeFetch(fetchOpts), now, clientOptions: { backoff: 1 } });
  if (run.status !== 'done') return { run };
  const data = run.ok ? P.saveRun(run) : null;
  return { run, data };
}

check('demo', loadDemo(new Date()));
{ setLang('fr'); const d = loadDemo(new Date());
  const h = renderCompare({ data: d, device: 'mobile', tab: 'lcp', layout: { hero: 960, split: 560, wide: true } });
  const txt = x => x.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  console.log('   compare lcp board:', txt(h.match(/<div class="bars bars--board[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/)?.[1] ?? '').slice(0, 160));
  console.log('   compare good:', txt(h.match(/bars--share[^>]*>([\s\S]*?)<\/section>/)?.[1] ?? '').slice(0, 160));
  console.log('   compare chips:', [...h.matchAll(/class="chip"[^>]*aria-pressed="(true|false)"[^>]*>([^<]+)</g)].map(m => m[2] + (m[1] === 'true' ? '*' : '')).join(', '));
  const sc = renderCompare({ data: d, device: 'mobile', tab: 'score', layout: { hero: 960, split: 560, wide: true } });
  console.log('   compare points:', [...sc.matchAll(/<tr><th scope="row">([^<]+)<\/th>([\s\S]*?)<\/tr>/g)].slice(0, 6).map(m => m[1] + ': ' + txt(m[2])).join(' | '));
}
for (const device of ['mobile', 'desktop']) { setLang('fr'); const h = renderHome({ data: loadDemo(new Date()), device, layout: { hero: 960, split: 580, wide: true } }); console.log('   demo', device, JSON.stringify(peek(h)), '| win:', h.match(/pill--win">(.*?)</)?.[1], '| flip rows:', (h.match(/data-flip/g) ?? []).length); }
// 1. First analysis: one week of lab history → no curve yet.
let r = await analyse(base, { now: at(-3) });
check('first run', P.loadReal());
// 2. Same week again → still one point.
r = await analyse(base, { now: at(-3, 18) });
check('same week', P.loadReal());
// 3. Skip a week (gap), then run → two isolated points.
r = await analyse(base, { now: at(-1) });
check('gap of one week', P.loadReal());
// 4. Next week → a segment.
r = await analyse(base, { now: at(0) });
const d4 = P.loadReal();
console.log('   lab times', d4.history.mobile.lab.times.map(t => t.toISOString().slice(5, 10)).join(' '), '\n   you', JSON.stringify(d4.history.mobile.lab.you));
check('weekly', d4);
// 5. Add a page → like-for-like set changes; curve restarts.
const withPage = { ...base, pages: [...base.pages, { key: 'd', name: 'Blog', path: '/blog', weight: 1 }], competitors: base.competitors.map(c => ({ ...c, pages: { ...c.pages, d: '/journal' } })) };
r = await analyse(withPage, { now: at(1) });
check('page added', P.loadReal());
// 6. Competitor changes its equivalent page → its line restarts for that page.
const moved = { ...withPage, competitors: withPage.competitors.map(c => (c.key === 'x' ? { ...c, pages: { ...c.pages, b: '/produits/manteau-laine' } } : c)) };
r = await analyse(moved, { now: at(2) });
const d6 = P.loadReal();
console.log('   lumen product', JSON.stringify(d6.history.mobile.lab.competitors[d6.project.competitors[0].id]));
check('equivalent moved', d6);
// 6b. A competitor slows down the next week → you pass it.
r = await analyse(moved, { now: at(3), fetchOpts: { scenario: { 'sud.example.org': 'slow', 'lumen.example.com': 'slow' } } });
{ const d = P.loadReal(); const h = renderHome({ data: d, device: 'mobile', layout: { hero: 960, split: 580, wide: true } });
  console.log('   previous', JSON.stringify(d.previous?.mobile?.ranks), '| peek:', JSON.stringify(peek(h)), '| win:', h.match(/pill--win">(.*?)</)?.[1] ?? h.match(/pill--alert">▼(.*?)</)?.[1]);
  check('after a competitor slows', d); }
// 7. Small site: no CrUX anywhere.
mem.clear();
r = await analyse({ ...base, site: 'small-shop.fr', competitors: [] }, { now: at(0) });
console.log('   notes', r.run.notes.map(n => n.kind).join(','), 'sources', Object.values(r.run.measurements.mobile.pages).map(p => p.fieldSource).join(','), 'runs', r.run.progress.jobs.map(j => j.runs).join(''));
check('small site solo', P.loadReal());
// 8. Mobile-only field data.
mem.clear();
r = await analyse(base, { now: at(0), fetchOpts: { crux: { 'monsite.fr': 'mobileonly' } } });
console.log('   notes', r.run.notes.map(n => n.kind + (n.has ? ':' + n.has : '')).join(','));
check('mobile-only field', P.loadReal());
// 9. CrUX API disabled.
mem.clear();
r = await analyse(base, { now: at(0), fetchOpts: { cruxDisabled: true } });
console.log('   notes', r.run.notes.map(n => n.kind).join(','), 'field', JSON.stringify(r.run.measurements.mobile.origin.field));
check('crux disabled', P.loadReal());
// 10. Every competitor fails; one of your pages fails.
mem.clear();
r = await analyse(base, { now: at(0), fetchOpts: { scenario: { 'lumen.example.com': 'blocked403', 'sud.example.org': 'notfound', 'monsite.fr/panier': 'nofcp' } } });
console.log('   reasons', r.run.progress.jobs.filter(j => j.status === 'fail').map(j => j.reason).join(','));
check('competitors fail', P.loadReal());
// 11. All your pages fail → nothing saved.
const before = mem.get('allure:results');
r = await analyse(base, { now: at(0), fetchOpts: { scenario: { 'monsite.fr': 'blocked' } } });
console.log('   ok', r.run.ok, 'kept previous', mem.get('allure:results') === before);
// 12. Fatal: invalid key, daily quota.
for (const keyStatus of ['invalid', 'quota']) {
  const { project } = P.validate(base, 'k');
  const run = await runAnalysis({ project, key: 'k', fetch: makeFetch({ keyStatus }), clientOptions: { backoff: 1 } });
  console.log('   fatal', keyStatus, run.status, JSON.stringify(run.progress.fatal));
}
// 13. Abort mid-run.
{
  const { project } = P.validate(base, 'k');
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), 30);
  const run = await runAnalysis({ project, key: 'k', signal: ctrl.signal, fetch: makeFetch({ delay: 20 }), clientOptions: { backoff: 1 } });
  console.log('   abort', run.status, run.progress.jobs.map(j => j.status[0]).join(''));
}
// 14. Storage quota: tiny quota → still renders from memory with a note.
mem.clear(); QUOTA = 3000;
r = await analyse(base, { now: at(0) });
console.log('   quota notes', r.data.notes.map(n => n.kind).join(','), 'stored results', mem.has('allure:results'));
check('quota exceeded (memory)', r.data);
QUOTA = 60000;
mem.clear();
r = await analyse(base, { now: at(0) });
console.log('   mid quota notes', r.data.notes.map(n => n.kind).join(','), 'results size', mem.get('allure:results')?.length);
check('quota trimmed', P.loadReal());
QUOTA = Infinity;
// 15. Corrupted storage.
mem.set('allure:results', '{"v":1,"ts":'); console.log('   corrupted →', P.loadReal());
mem.set('allure:results', JSON.stringify({ v: 1, ts: 'x', project: { pages: [], competitors: [] }, measurements: {} }));
check('degenerate stored', P.loadReal());
// 16. Validation edge cases.
const errs = s => JSON.stringify(P.validate(s, '').errors);
console.log('   own domain', errs({ ...base, competitors: [{ key: 'q', name: '', site: 'https://www.MONSITE.fr/', pages: {} }] }));
console.log('   duplicate comp', errs({ ...base, competitors: [{ key: 'q', name: '', site: 'lumen.example.com', pages: {} }, { key: 'r', name: '', site: 'http://www.lumen.example.com/x', pages: {} }] }));
console.log('   duplicate page', errs({ ...base, pages: [{ key: 'a', name: '', path: '/panier/', weight: 3 }, { key: 'b', name: '', path: 'https://www.monsite.fr/panier', weight: 3 }] }));
console.log('   offsite page', errs({ ...base, pages: [{ key: 'a', name: '', path: 'https://autre.fr/x', weight: 1 }] }));
console.log('   no equivalent', errs({ ...base, pages: [{ key: 'b', name: '', path: '/p', weight: 1 }], competitors: [{ key: 'q', name: '', site: 'x.com', pages: {} }] }));
console.log('   bad site', errs({ ...base, site: 'pas un site' }), errs({ ...base, site: 'localhost:3000' }));
console.log(failures ? `\n${failures} FAILURES` : '\nALL CLEAN');
process.exitCode = failures ? 1 : 0;
