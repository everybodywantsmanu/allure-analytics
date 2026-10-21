// The quick-wins simulator on the demo: every combination of ticked actions
// must add up exactly (ticked gains = the "+N pts" pill = arrival − today),
// and the moment (rank rolling, rows sliding) must play once only.
// Run with: node --test tests/
globalThis.navigator ??= { language: 'fr-FR' };
const mem = new Map();
globalThis.localStorage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) };

const { renderHome } = await import('../src/views/home.js');
const { loadDemo } = await import('../src/demo.js');
const { setLang } = await import('../src/i18n.js');

const unesc = x => x.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const num = s => Number(String(s).replace(/[^\d.,]/g, '').replace(',', '.'));
const layout = { hero: 960, split: 580, wide: true };
let failures = 0;
const fail = msg => { failures++; console.log('✗', msg); };

for (const lang of ['fr', 'en']) for (const device of ['mobile', 'desktop']) {
  setLang(lang);
  const h = renderHome({ data: loadDemo(new Date()), device, layout });
  const scenarios = JSON.parse(unesc(h.match(/data-scenarios="([^"]+)"/)[1]));
  const today = num(h.match(/<div class="qwb-fig"><small>[^<]*<\/small><b>(\d+)/)[1]);
  scenarios.forEach((s, mask) => {
    const ticked = s.gains.filter((_, i) => s.on[i]).map(num);
    const sum = ticked.reduce((a, b) => a + b, 0);
    const exact = ticked.every(g => g >= 1);
    if (!s.n) { if (s.final !== today || s.delta) fail(`${lang} ${device} mask ${mask}: nothing ticked should stay at ${today}`); return; }
    if (exact && sum !== s.final - today) fail(`${lang} ${device} mask ${mask}: gains ${sum} ≠ ${s.final} − ${today}`);
    if (exact && num(s.delta) !== s.final - today) fail(`${lang} ${device} mask ${mask}: pill ${s.delta} ≠ ${s.final - today}`);
  });
  console.log('✓', lang, device, `${scenarios.length} combinations`);
}

// The moment plays once: once seen, no roll, no slide.
setLang('fr');
const data = loadDemo(new Date());
const first = renderHome({ data, device: 'desktop', layout });
const key = first.match(/data-moment="([^"]+)"/)?.[1];
if (!key || !/data-from=/.test(first)) fail('the demo should play its moment (4th → 3rd)');
mem.set('allure:celebrated', JSON.stringify([key]));
const again = renderHome({ data, device: 'desktop', layout });
if (/data-moment|data-from|data-flip/.test(again)) fail('a moment already seen must not play again');
console.log(failures ? `\n${failures} FAILURES` : '\nALL CLEAN');
process.exitCode = failures ? 1 : 0;
