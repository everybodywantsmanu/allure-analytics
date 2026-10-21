// Your real project: the setup you type, the checks it must pass, and the
// saved analyses turned back into the data shape the views read (the same as
// src/demo.js). Everything goes through src/storage.js:
//   setup    the form as typed (site, pages, competitors)
//   apikey   the Google key, kept apart so it never travels with the data
//   results  the last analysis: project as measured, measurements, field history, notes
//   lab      the PageSpeed scores of every analysis, kept across analyses
//   mode     'demo' or 'real': which data the home screen shows
//   lock     the tab running an analysis, so two tabs never run at once

import { storage } from './storage.js';
import { suggestWeight } from './metrics.js';
import { parseSite, parsePath, parseCompetitorPage, pathKey, siteKey, sameSite, hashId, nameFromPath, shortUrl, companyName } from './url.js';
import { position } from './benchmark.js';
import { planRun, DEVICES, RUNS_WITHOUT_FIELD } from './analyze.js';

export const MAX_PAGES = 8;
export const MAX_COMPETITORS = 8;
const LAB_RUNS_KEPT = 104;
const LAB_SPAN_DAYS = 183;
const DAY = 864e5;

let seq = 0;
export const newKey = () => `k${Date.now().toString(36)}${(seq++).toString(36)}`;

// ── Setup: what the form edits ───────────────────────────────
// scope: 'site' compares the whole site (its home page in the lab, all its
// visitors in the field); 'pages' compares the key pages you choose.
// nameAuto: the name follows the domain until you type your own.

const homeRow = () => ({ key: newKey(), name: '', path: '/', weight: 2, auto: true });
export function emptySetup() {
  return { v: 1, site: '', name: '', nameAuto: true, scope: 'site', pages: [homeRow()], competitors: [] };
}
export const emptyCompetitor = () => ({ key: newKey(), name: '', nameAuto: true, site: '', scope: 'site', pages: {} });

// Older drafts had no scope: they keep comparing the pages they list.
export function loadSetup() {
  const s = storage.get('setup');
  if (!s || s.v !== 1 || !Array.isArray(s.pages) || !Array.isArray(s.competitors)) return emptySetup();
  const pages = s.pages.slice(0, MAX_PAGES).map(p => ({ key: p.key || newKey(), name: String(p.name ?? ''), path: String(p.path ?? ''), weight: [1, 2, 3].includes(p.weight) ? p.weight : 1, auto: !!p.auto }));
  const listed = pages.some(p => p.path.trim() && !isHome(p.path)) || pages.length > 1;
  return {
    v: 1, site: String(s.site ?? ''), name: String(s.name ?? ''),
    nameAuto: s.nameAuto ?? !String(s.name ?? '').trim(),
    scope: s.scope === 'site' || s.scope === 'pages' ? s.scope : listed ? 'pages' : 'site',
    pages: pages.length ? pages : [homeRow()],
    competitors: s.competitors.slice(0, MAX_COMPETITORS).map(c => ({
      key: c.key || newKey(), name: String(c.name ?? ''), site: String(c.site ?? ''), pages: { ...(c.pages ?? {}) },
      nameAuto: c.nameAuto ?? !String(c.name ?? '').trim(),
      scope: c.scope === 'site' || c.scope === 'pages' ? c.scope : Object.values(c.pages ?? {}).some(v => String(v).trim()) ? 'pages' : 'site',
    })),
  };
}
export const saveSetup = setup => storage.set('setup', setup);
export const loadKey = () => String(storage.get('apikey') ?? '');
export const saveKey = key => storage.set('apikey', key);

// The importance a page gets until you pick one yourself.
export const autoWeight = p => suggestWeight(p.name, p.path || '');

// A home page is compared with the competitor's home page unless told otherwise.
const isHome = path => pathKey(path) === '/';
// An unnamed page is named after its address (per language for the home page).
export const defaultName = path => (isHome(path) ? { fr: 'Accueil', en: 'Home' } : nameFromPath(path) || path);
export const equivalentOf = (comp, page) => {
  const typed = String(comp.pages?.[page.key] ?? '').trim();
  return typed || (isHome(page.path) ? '/' : '');
};
// The pages actually measured for you: your home page alone for the whole site.
export function pagesOf(setup) {
  if (setup.scope !== 'site') return setup.pages;
  return [setup.pages.find(p => isHome(p.path)) ?? { key: 'home', name: '', path: '/', weight: 2, auto: true }];
}
// The name shown for a site: yours, or the one its domain suggests.
export const siteName = (name, site) => name.trim() || companyName(site) || (parseSite(site) ? shortUrl(parseSite(site).origin) : '');

// Setup → the project an analysis measures, or the errors to fix first.
// errors: { field: messageKey }, fields named site · key · pages ·
// page.<key>.path · comp.<key>.site · comp.<key>.pages · comp.<key>.page.<pageKey>
export function validate(setup, key) {
  const errors = {};
  const site = parseSite(setup.site);
  if (!site) errors.site = setup.site.trim() ? 'err.site' : 'err.siteEmpty';
  if (!String(key ?? '').trim()) errors.key = 'err.key';

  const pages = [];
  const seenPaths = new Map();
  const rows = pagesOf(setup).filter(p => p.path.trim() || p.name.trim());
  if (!rows.length) errors.pages = 'err.noPages';
  for (const p of rows) {
    // With no valid site yet, only the path's own syntax is checked.
    const parsed = parsePath(p.path, site?.origin ?? 'https://site.invalid');
    if (!site && parsed?.offsite) continue;
    if (!parsed) { errors[`page.${p.key}.path`] = 'err.path'; continue; }
    if (parsed.offsite) { errors[`page.${p.key}.path`] = 'err.offsite'; continue; }
    const k = pathKey(parsed.path);
    if (seenPaths.has(k)) { errors[`page.${p.key}.path`] = 'err.dupPath'; continue; }
    seenPaths.set(k, p.key);
    pages.push({ key: p.key, name: p.name.trim() || defaultName(parsed.path), path: parsed.path, weight: p.weight });
  }
  const home = pages.find(p => isHome(p.path));
  // Said only when your own pages are all valid: otherwise they are the cause.
  const pagesOk = site && pages.length === rows.length;

  const competitors = [];
  const seenSites = new Map();
  for (const c of setup.competitors) {
    if (!c.site.trim() && !c.name.trim()) continue;
    const parsed = parseSite(c.site);
    const f = `comp.${c.key}`;
    if (!parsed) { errors[`${f}.site`] = c.site.trim() ? 'err.site' : 'err.siteEmpty'; continue; }
    if (site && sameSite(parsed.origin, site.origin)) { errors[`${f}.site`] = 'err.own'; continue; }
    if (seenSites.has(siteKey(parsed.origin))) { errors[`${f}.site`] = 'err.dupComp'; continue; }
    seenSites.set(siteKey(parsed.origin), c.key);
    const equivalents = {};
    // Their whole site is compared on their home page, against yours.
    if (setup.scope === 'site' || c.scope === 'site') {
      if (home) equivalents[home.key] = new URL('/', parsed.origin).href;
      else if (pagesOk) errors[`${f}.pages`] = 'err.noHome';
    } else {
      for (const p of pages) {
        const typed = equivalentOf(c, p);
        if (!typed) continue;
        const url = parseCompetitorPage(typed, parsed.origin);
        if (!url) { errors[`${f}.page.${p.key}`] = 'err.url'; continue; }
        if (site && sameSite(url.url, site.origin)) { errors[`${f}.page.${p.key}`] = 'err.ownPage'; continue; }
        equivalents[p.key] = url.url;
      }
      if (pagesOk && !Object.keys(equivalents).length && !Object.keys(errors).some(e => e.startsWith(`${f}.page.`))) errors[`${f}.pages`] = 'err.noEquivalent';
    }
    competitors.push({ key: c.key, name: siteName(c.name, c.site), origin: parsed.origin, equivalents });
  }

  if (Object.keys(errors).length) return { errors };
  // Ids follow the address: same address, same history; a new one starts afresh.
  const sk = siteKey(site.origin);
  const idOf = Object.fromEntries(pages.map(p => [p.key, hashId(`${sk}${pathKey(p.path)}`)]));
  const project = {
    id: hashId(sk),
    demo: false,
    name: siteName(setup.name, setup.site),
    origin: site.origin,
    scope: setup.scope,
    pages: pages.map(p => ({ id: idOf[p.key], name: p.name, path: p.path, weight: p.weight })),
    competitors: competitors.map(c => ({
      id: hashId(siteKey(c.origin)), name: c.name, origin: c.origin,
      pages: Object.fromEntries(Object.entries(c.equivalents).map(([k, url]) => [idOf[k], url])),
    })),
  };
  return { errors, project };
}

// How many PageSpeed runs, and roughly how long: pages without field data
// are measured three times, so the estimate is a range.
export function estimate(project) {
  const { jobs } = planRun(project);
  const minutes = runs => Math.max(1, Math.round((runs * 22) / 5 / 60));
  return { runs: jobs.length, low: minutes(jobs.length), high: minutes(jobs.length * RUNS_WITHOUT_FIELD) };
}

// ── PageSpeed history: one point per analysis ────────────────
// Every analysis is a point at its own date, so two analyses draw a curve,
// whenever they ran. Nothing is invented between two of them; a page missing
// from one analysis leaves a gap there. Lab dates are never matched to CrUX
// periods: those keep their own dates.

// v1 kept one entry per week (the latest analysis of the week): each becomes
// one analysis.
function loadLab() {
  const lab = storage.get('lab');
  if (lab?.v === 2) return lab;
  const out = { v: 2 };
  for (const device of DEVICES) {
    const entries = lab?.v === 1 ? Object.values(lab[device] ?? {}).filter(e => e?.ts) : [];
    out[device] = entries.sort((a, b) => new Date(a.ts) - new Date(b.ts));
  }
  return out;
}

export function mergeLab(store, ts, run) {
  const next = { v: 2 };
  for (const device of DEVICES) {
    const entry = { ts, you: { ...(run[device]?.you ?? {}) }, competitors: { ...(run[device]?.competitors ?? {}) } };
    const kept = Array.isArray(store?.[device]) ? store[device].filter(e => e.ts !== ts) : [];
    next[device] = [...kept, entry].slice(-LAB_RUNS_KEPT);
  }
  return next;
}

// The stored analyses → history[device].lab for this project: the last six
// months up to this analysis, and a competitor's page only while it is the
// page configured today. kind 'runs' tells the chart its points are analyses.
export function labHistory(store, device, project, lastTs) {
  const end = +new Date(lastTs);
  const entries = (Array.isArray(store?.[device]) ? store[device] : []).filter(e => { const t = +new Date(e.ts); return t <= end && end - t <= LAB_SPAN_DAYS * DAY; });
  const times = entries.map(e => new Date(e.ts));
  const score = v => (Number.isFinite(v) ? v : null);
  return {
    kind: 'runs',
    times,
    you: Object.fromEntries(project.pages.map(p => [p.id, entries.map(e => score(e.you?.[p.id]))])),
    competitors: Object.fromEntries(project.competitors.map(c => [c.id, Object.fromEntries(project.pages.filter(p => c.pages?.[p.id]).map(p => {
      const h = hashId(c.pages[p.id]);
      return [p.id, entries.map(e => { const x = e.competitors?.[c.id]?.[p.id]; return x && x.h === h ? score(x.s) : null; })];
    }))])),
  };
}

// ── Saved analyses → the views' data ─────────────────────────

const reviveRows = rows => (Array.isArray(rows) ? rows.map(r => ({ ...r, end: new Date(r.end) })).filter(r => !Number.isNaN(+r.end)) : []);
const valid = r => r && r.v === 1 && typeof r.ts === 'string' && Array.isArray(r.project?.pages) && Array.isArray(r.project?.competitors) && r.measurements;

export function buildData(results, labStore) {
  const { project, measurements, field, ts } = results;
  const history = {};
  for (const device of DEVICES) {
    if (!measurements[device]) continue;
    const f = field?.[device] ?? {};
    history[device] = {
      origin: reviveRows(f.origin),
      pages: Object.fromEntries(project.pages.map(p => [p.id, reviveRows(f.pages?.[p.id])])),
      competitors: Object.fromEntries(project.competitors.map(c => [c.id, reviveRows(f.competitors?.[c.id])])),
      lab: labHistory(labStore, device, project, ts),
    };
  }
  return { project: { ...project, demo: false }, measurements, history, now: new Date(ts), notes: results.notes ?? [], previous: results.previous ?? null };
}

export function loadResults() {
  const r = storage.get('results');
  return valid(r) ? r : null;
}
export const hasResults = () => !!loadResults();

export function loadReal() {
  const results = loadResults();
  return results ? buildData(results, loadLab()) : null;
}

// The real product unless the demo was chosen: the demo is one click away, never the default.
export const getMode = () => (storage.get('mode') === 'demo' ? 'demo' : 'real');
export const setMode = mode => storage.set('mode', mode);

// A finished run → storage, shrinking what is kept when the browser is out of
// room: first the per-page field history, then all field history, then the
// oldest lab weeks. When nothing fits, the data still serves this tab.
// The standings an analysis ended on, kept by the next one so the home screen
// can say what moved since (only for the same site).
export function standingsOf(results) {
  const out = {};
  for (const device of DEVICES) {
    const m = results?.measurements?.[device];
    if (!m) continue;
    const { set, table } = position(results.project, m);
    if (table.length) out[device] = { ts: results.ts, set: set.map(p => p.id), ranks: Object.fromEntries(table.map(c => [c.id, c.rank])), scores: Object.fromEntries(table.map(c => [c.id, c.score])) };
  }
  return out;
}

export function saveRun(run) {
  const field = Object.fromEntries(DEVICES.map(d => [d, {
    origin: run.history[d].origin,
    pages: run.history[d].pages,
    competitors: run.history[d].competitors,
  }]));
  const before = loadResults();
  const previous = before && before.project.id === run.project.id ? standingsOf(before) : null;
  const results = { v: 1, ts: run.ts, project: run.project, measurements: run.measurements, field, notes: run.notes, previous };
  const notes = [...run.notes];
  const attempts = [
    results,
    { ...results, field: Object.fromEntries(DEVICES.map(d => [d, { ...field[d], pages: {} }])) },
    { ...results, field: {} },
  ];
  let saved = attempts.findIndex(r => storage.set('results', r));
  const lab = mergeLab(loadLab(), run.ts, run.lab);
  let labSaved = storage.set('lab', lab);
  if (!labSaved) {
    const trimmed = { v: 2, ...Object.fromEntries(DEVICES.map(d => [d, lab[d].slice(-13)])) };
    labSaved = storage.set('lab', trimmed);
  }
  if (saved < 0) notes.push({ kind: 'quota' });
  else if (saved > 0 || !labSaved) notes.push({ kind: 'trimmed' });
  const kept = saved >= 0 ? attempts[saved] : results;
  if (saved >= 0 && notes.length !== run.notes.length) storage.set('results', { ...kept, notes });
  storage.set('mode', 'real');
  return buildData({ ...kept, field: saved >= 0 ? kept.field : field, notes }, lab);
}

// The canonical addresses found during the run go back into the form.
export function adoptResolved(setup, project) {
  const next = { ...setup };
  if (sameSite(parseSite(setup.site)?.origin ?? '', project.origin)) next.site = project.origin;
  next.competitors = setup.competitors.map(c => {
    const found = project.competitors.find(pc => sameSite(pc.origin, parseSite(c.site)?.origin ?? ''));
    return found ? { ...c, site: found.origin } : c;
  });
  return next;
}

// The run lock is left alone: it may belong to another tab mid-analysis.
export function clearAll() {
  for (const k of ['setup', 'apikey', 'results', 'lab', 'mode']) storage.remove(k);
}

// ── One analysis at a time, across tabs ──────────────────────

const TAB = Math.random().toString(36).slice(2);
const LOCK_TTL = 45000;

export function lockedElsewhere() {
  const lock = storage.get('lock');
  return !!lock && lock.tab !== TAB && Date.now() - lock.beat < LOCK_TTL;
}
// Without storage there is no other tab to coordinate with.
export function takeLock() {
  if (lockedElsewhere()) return false;
  if (!storage.set('lock', { tab: TAB, beat: Date.now() })) return true;
  return storage.get('lock')?.tab === TAB;
}
export const beat = () => storage.set('lock', { tab: TAB, beat: Date.now() });
export function releaseLock() {
  if (storage.get('lock')?.tab === TAB) storage.remove('lock');
}
