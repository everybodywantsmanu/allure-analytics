// Entry point: state, routing and the few controls.
// Routes: #/ · #/compare/:tab · #/page/:id · #/fix/:id · #/analyze · #/settings
// Shareable: #/demo, or #/demo/<route> (e.g. #/demo/compare/lcp), opens the demo there.

import { storage } from './storage.js';
import { t, setLang, getLang, pick, auditTitle } from './i18n.js';
import { loadDemo } from './demo.js';
import { loadReal, loadResults, getMode, setMode, clearAll, releaseLock } from './project.js';
import { renderShell, ctaButton } from './views/shell.js';
import { renderHome, mountHome, arriveNext } from './views/home.js';
import { renderSettings } from './views/settings.js';
import { renderStub } from './views/stub.js';
import { renderWelcome } from './views/welcome.js';
import { renderSetup, mountSetup, renderRun, mountRun, startRun, canRerun, initAnalyze, isRunning, reloadDraft, resetAnalyze } from './views/analyze.js';
import { hydrateCharts, resetCharts } from './charts.js';
import { renderCompare, togglePick } from './views/compare.js';

const root = document.getElementById('app');
const darkQuery = matchMedia('(prefers-color-scheme: dark)');

// SVG text scales with its viewBox, so the chart is drawn at its real width.
// Mirrors the CSS: .wrap max 1120px, gutter clamp(16, 4vw, 40), hero padding clamp(24, 3.4vw, 40).
// From 860 px inside the card, the standings sit beside the curve in a 360 px
// column (styles.css, .hero-split): the curve gets the rest, minus the gap.
// A page laid out in a hidden tab has no width yet: the chart gets a stand-in
// width and is redrawn as soon as the real one is known.
const SPLIT_FROM = 860, BOARD = 360, SPLIT_GAP = 40;
function layout() {
  const vw = document.documentElement.clientWidth;
  const gutter = Math.min(40, Math.max(16, vw * 0.04));
  const content = Math.min(vw, 1120) - gutter * 2;
  const heroPad = Math.min(40, Math.max(24, vw * 0.034));
  const hero = Math.round(content - heroPad * 2);
  if (hero < 120) return { hero: 960, split: 580, wide: true, measured: false };
  return { hero, split: hero - BOARD - SPLIT_GAP, wide: hero >= SPLIT_FROM, measured: true };
}

// The demo when you chose it; otherwise your last analysis, or nothing yet
// (the welcome screen).
function loadData() {
  return getMode() === 'demo' ? loadDemo(new Date()) : loadReal();
}

const state = {
  device: storage.get('device') === 'desktop' ? 'desktop' : 'mobile',
  data: loadData(),
};

// Theme preference: 'auto' follows the system; 'light' / 'dark' are explicit.
const themePref = () => document.documentElement.dataset.theme || 'auto';
function setTheme(pref) {
  if (pref === 'auto') {
    delete document.documentElement.dataset.theme;
    storage.remove('theme');
  } else {
    document.documentElement.dataset.theme = pref;
    storage.set('theme', pref);
  }
}

function parseRoute() {
  const [view = '', id] = location.hash.replace(/^#\/?/, '').split('/');
  return { view, id: id ? decodeURIComponent(id) : null };
}

function viewFor({ view, id }) {
  if (view === 'analyze') return { title: t('analyze.title'), body: renderRun(), mount: mountRun };
  if (view === 'settings') {
    const hasResults = !!loadResults();
    const hasData = !!(hasResults || storage.get('setup') || storage.get('apikey'));
    return {
      title: t(hasResults ? 'settings.title' : 'analyze.title'),
      body: renderSettings({ lang: getLang(), themePref: themePref(), hasResults, hasData, setup: renderSetup() }),
      mount: mountSetup,
    };
  }
  // The screens that show data: before a first analysis, the real product
  // has none yet, so they all show the welcome.
  if (!state.data) return { title: null, body: renderWelcome({ running: isRunning() }) };
  const { project } = state.data;
  const stub = (title, text) => ({ title, body: renderStub({ title, text }) });
  if (view === 'page') {
    const page = project.pages.find(p => p.id === id);
    if (page) return stub(pick(page.name), t('stub.page'));
  }
  if (view === 'fix' && id) return stub(auditTitle(id), t('stub.fix'));
  if (view === 'compare') {
    state.layout = layout();
    return { title: t('compare.title'), body: renderCompare({ data: state.data, device: state.device, tab: id, layout: state.layout }), shows: true };
  }
  state.layout = layout();
  return { title: null, body: renderHome({ data: state.data, device: state.device, layout: state.layout }), mount: mountHome, shows: true };
}

// The top bar's one action: back to a running analysis, run your project
// again in one click, or set up a first analysis.
const cta = () => (isRunning() ? 'running' : loadResults() && canRerun() ? 'rerun' : 'analyze');

// A link into the demo, for a post or a README: switch to it, then show the
// screen asked for (the home by default), without keeping the link in history.
function openDemoLink() {
  const link = location.hash.match(/^#\/?demo(?:\/(.*))?$/);
  if (!link) return;
  setMode('demo');
  state.data = loadData();
  history.replaceState(null, '', `${location.pathname}${location.search}#/${link[1] ?? ''}`);
}

// anim: 'all' on navigation, 'charts' when the device changes (lines redraw),
// 'none' for language and theme so the page doesn't replay its entrance.
function render({ keepScroll = false, anim = 'all' } = {}) {
  openDemoLink();
  const y = window.scrollY;
  resetCharts();
  document.documentElement.lang = getLang();
  root.dataset.anim = anim;
  state.layout = null; // set again only if this screen draws the chart
  const view = viewFor(parseRoute());
  root.innerHTML = renderShell({ data: state.data, cta: cta(), body: view.body, realName: loadResults()?.project?.name ?? null, demo: !!view.shows });
  document.title = view.title ? `${view.title} — Allure Analytics` : t('meta.title');
  hydrateCharts(root);
  view.mount?.(root);
  window.scrollTo({ top: keepScroll ? y : 0, behavior: 'instant' });
}

// The "how it's calculated" card closes on a click elsewhere or on Escape;
// once opened, its "i" stops pulsing for good.
const openHow = () => [...document.querySelectorAll('details.how[open]')];
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  for (const d of openHow()) { d.open = false; d.querySelector('summary').focus(); }
});
document.addEventListener('toggle', e => {
  if (!e.target.matches?.('details.how') || !e.target.open) return;
  storage.set('seenHow', true);
  document.querySelectorAll('.how-i.is-new').forEach(i => i.classList.remove('is-new'));
}, true);

document.addEventListener('click', e => {
  for (const d of openHow()) if (!d.contains(e.target)) d.open = false;
  const control = e.target.closest('[data-action]');
  if (!control) return;
  const { action, value } = control.dataset;
  if (action === 'device' && value !== state.device) {
    state.device = value;
    storage.set('device', value);
    render({ keepScroll: true, anim: 'charts' });
  } else if (action === 'lang' && value !== getLang()) {
    setLang(value);
    render({ keepScroll: true, anim: 'none' });
  } else if (action === 'theme' && value !== themePref()) {
    setTheme(value);
    render({ keepScroll: true, anim: 'none' });
  } else if (action === 'view' && value !== (state.data?.project.demo ? 'demo' : 'real')) {
    // Into the demo or back to the real product: a different screen, from the top.
    setMode(value);
    state.data = loadData();
    if (location.hash.startsWith('#/settings') || location.hash.startsWith('#/analyze')) location.hash = '#/';
    else render();
  } else if (action === 'pick') {
    togglePick(value);
    render({ keepScroll: true, anim: 'charts' });
  } else if (action === 'rerun') {
    startRun();
  } else if (action === 'reset' && !isRunning() && confirm(t('settings.reset.confirm'))) {
    clearAll();
    resetAnalyze();
    state.data = loadData();
    render({ keepScroll: true, anim: 'none' });
  }
});

// A finished analysis replaces the demo everywhere, top bar included. When it
// ends while you type in the setup, only the top bar's button is updated.
const typing = () => !!document.activeElement?.closest?.('[data-form]');
function refreshBar() {
  const bar = root.querySelector('.bar-right .btn');
  if (bar) bar.outerHTML = ctaButton(cta());
}
initAnalyze({
  onData(data) { state.data = data; },
  onEnd() { if (typing()) refreshBar(); else render({ keepScroll: true, anim: 'none' }); },
  rerender() { render({ keepScroll: true, anim: 'none' }); },
  // An analysis that ends on its own screen lands on the home screen with a transition.
  onArrive: arriveNext,
});

// Several tabs: what another tab saved shows here too, unless this tab is
// running an analysis or you are typing in its form.
storage.subscribe(key => {
  if (isRunning()) return;
  if (key === null || ['results', 'lab', 'mode'].includes(key)) state.data = loadData();
  if (key === 'theme') { const pref = storage.get('theme'); if (pref) document.documentElement.dataset.theme = pref; else delete document.documentElement.dataset.theme; }
  if (key === 'lang') { const next = storage.get('lang'); if ((next === 'fr' || next === 'en') && next !== getLang()) setLang(next); }
  if (['setup', 'apikey'].includes(key) || key === null) reloadDraft();
  // The lock's heartbeat only matters to the Analyze screen.
  const view = parseRoute().view;
  const shown = key === null || ['results', 'lab', 'mode', 'theme', 'lang'].includes(key)
    || (['analyze', 'settings'].includes(view) && ['setup', 'apikey', 'lock'].includes(key));
  if (shown && !typing()) render({ keepScroll: true, anim: 'none' });
});

// Closing the tab mid-run would lose the analysis: ask first.
addEventListener('beforeunload', e => { if (isRunning()) { e.preventDefault(); e.returnValue = ''; } });
addEventListener('pagehide', releaseLock);

window.addEventListener('hashchange', () => render());
darkQuery.addEventListener('change', () => {
  if (themePref() === 'auto') render({ keepScroll: true, anim: 'none' });
});
// Redraw the chart when the available width changes noticeably, or once a
// page drawn while hidden gets its real width. Only the home screen depends
// on it: other screens (the Analyze form) are never redrawn under your fingers.
function relayout() {
  const prev = state.layout, next = layout();
  if (!prev || !next.measured) return;
  if (!prev.measured || Math.abs(next.hero - prev.hero) / prev.hero > 0.06) render({ keepScroll: true, anim: 'none' });
}
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(relayout, 150);
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) relayout(); });

render();
