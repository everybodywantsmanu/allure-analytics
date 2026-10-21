// The analysis, in two places:
//   Settings › the setup: your site (whole site or chosen pages), your
//     competitors, the Google key (four steps, checked as soon as it is
//     pasted). A draft saved as you type.
//   #/analyze › the run: how far along, how long left, a dot per measurement.
//     Started from the setup or in one click ("Run it again"); once done, it
//     goes straight to the result, the home screen.
// A failed page reads "Measurement unavailable" and never holds up the rest.
// Navigating away doesn't stop a run: coming back shows where it is.

import { t, pick, fmt } from '../i18n.js';
import * as P from '../project.js';
import { runAnalysis, planRun, DEVICES } from '../analyze.js';
import { esc } from '../html.js';
import { companyName } from '../url.js';
import { notesList } from './notes.js';
import { youName } from './shell.js';
import { checkKey, KEY_FORMAT } from '../api.js';

const state = { setup: null, key: '', errors: {}, live: false, showKey: false, run: null, focus: null };
let host = { onData() {}, onEnd() {}, rerender() {}, onArrive() {} };
let saveTimer = 0;
let frame = 0;

export function initAnalyze(callbacks) { host = { ...host, ...callbacks }; }
export const isRunning = () => state.run?.status === 'running';

function ensureDraft() {
  if (!state.setup) { state.setup = P.loadSetup(); state.key = P.loadKey(); }
}
// Another tab saved a new setup: take it, unless this tab is mid-edit or running.
export function reloadDraft() {
  if (!isRunning() && !document.activeElement?.closest?.('[data-form]')) state.setup = null;
}
// Your data was deleted: start again from an empty form.
export function resetAnalyze() {
  if (isRunning()) return;
  Object.assign(state, { setup: null, key: '', errors: {}, live: false, showKey: false, run: null });
}
// One click is enough once the saved project is complete.
export function canRerun() {
  ensureDraft();
  return !!P.validate(state.setup, state.key).project;
}

// ── The setup form (shown in Settings) ───────────────────────

const errOf = f => (state.live ? state.errors[f] : null);
const errSlot = f => `<em class="ferr" id="err-${esc(f)}" data-err="${esc(f)}">${errOf(f) ? esc(t(errOf(f))) : ''}</em>`;
const invalid = f => (errOf(f) ? ' aria-invalid="true"' : '');
function input(f, value, attrs = '') {
  return `<input class="input" data-f="${esc(f)}" value="${esc(value)}" aria-describedby="err-${esc(f)}"${invalid(f)} ${attrs}>`;
}
function scopeSwitch(current, k = '') {
  return `<div class="segmented scope" role="group" aria-label="${esc(t('scope.label'))}">${['site', 'pages'].map(v =>
    `<button type="button" data-act="scope" data-k="${esc(k)}" data-v="${v}" aria-pressed="${current === v}">${esc(t(`scope.${v}`))}</button>`).join('')}</div>`;
}

const WEIGHTS = [3, 2, 1];
function weights(p) {
  return `<div class="segmented weights" role="group" aria-label="${esc(t('setup.page.weight'))}">${WEIGHTS.map(w =>
    `<button type="button" data-act="weight" data-k="${esc(p.key)}" data-w="${w}" aria-pressed="${p.weight === w}">${esc(t(`weight.${w}`))}</button>`).join('')}</div>`;
}

const pageLabel = p => p.name.trim() || P.defaultName(p.path.trim() || '/');
// An unnamed page will be named after its address: the placeholder says so.
const namePh = p => (p.path.trim() ? pick(P.defaultName(p.path.trim())) : '') || t('setup.page.namePh');
// An unnamed site will be named after its domain: same idea.
const siteNamePh = (site, fallback) => companyName(site) || fallback;

function pageRow(p, i) {
  const f = `page.${p.key}`;
  return `<div class="page-row" data-row="${esc(p.key)}">
    <label class="field"><span class="sr-only">${esc(t('setup.page.name'))}</span>${input(`${f}.name`, p.name, `data-k="${esc(p.key)}" data-nameph placeholder="${esc(namePh(p))}" autocomplete="off"`)}</label>
    <label class="field"><span class="sr-only">${esc(t('setup.page.path'))}</span>${input(`${f}.path`, p.path, `data-k="${esc(p.key)}" placeholder="/panier" autocomplete="off" spellcheck="false" inputmode="url"`)}${errSlot(`${f}.path`)}</label>
    ${weights(p)}
    <button type="button" class="icon-btn remove" data-act="remove-page" data-k="${esc(p.key)}" aria-label="${esc(t('setup.removePage', { n: i + 1 }))}"${state.setup.pages.length < 2 ? ' disabled' : ''}>${CROSS}</button>
  </div>`;
}

function pagesBlock(s) {
  if (s.scope === 'site') return `<p class="hint scope-hint">${esc(t('scope.site.hint'))}</p>${errSlot('pages')}`;
  return `<div class="sub-head"><h3>${esc(t('setup.pages'))}</h3><span class="muted">${esc(t('setup.pages.hint'))}</span></div>
    <div class="page-rows">
      <div class="page-head" aria-hidden="true"><span>${esc(t('setup.page.name'))}</span><span>${esc(t('setup.page.path'))}</span><span>${esc(t('setup.page.weight'))}</span></div>
      ${s.pages.map(pageRow).join('')}
    </div>
    ${errSlot('pages')}
    ${s.pages.length < P.MAX_PAGES ? `<button type="button" class="add-btn" data-act="add-page">${PLUS}${esc(t('setup.addPage'))}</button>` : ''}`;
}

function compBlock(c, i) {
  const f = `comp.${c.key}`;
  const s = state.setup;
  // Page by page only makes sense when you compare pages yourself.
  let detail = `<p class="hint scope-hint">${esc(t('scope.comp.site'))}</p>`;
  if (s.scope === 'pages') {
    const rows = s.pages.map(p => {
      const home = P.equivalentOf({ pages: {} }, p) === '/';
      return `<label class="equiv-row"><span data-plabel="${esc(p.key)}">${esc(pick(pageLabel(p)))}</span>${input(`${f}.page.${p.key}`, c.pages?.[p.key] ?? '', `data-k="${esc(c.key)}" data-p="${esc(p.key)}" data-ph="${esc(p.key)}" placeholder="${esc(home ? t('setup.equiv.home') : t('setup.equiv.none'))}" autocomplete="off" spellcheck="false" inputmode="url"`)}${errSlot(`${f}.page.${p.key}`)}</label>`;
    }).join('');
    detail = `${scopeSwitch(c.scope, c.key)}
      ${c.scope === 'pages' ? `<div class="equiv-rows">${rows}</div>` : `<p class="hint scope-hint">${esc(t('scope.comp.site'))}</p>`}`;
  }
  return `<div class="comp" data-comp="${esc(c.key)}">
    <div class="comp-head">
      <label class="field"><span class="sr-only">${esc(t('setup.comp.site'))}</span>${input(`${f}.site`, c.site, `data-k="${esc(c.key)}" placeholder="concurrent.fr" autocomplete="off" spellcheck="false" inputmode="url"`)}${errSlot(`${f}.site`)}</label>
      <label class="field"><span class="sr-only">${esc(t('setup.comp.name'))}</span>${input(`${f}.name`, c.name, `data-k="${esc(c.key)}" data-sitename="${esc(c.key)}" placeholder="${esc(siteNamePh(c.site, t('setup.comp.namePh')))}" autocomplete="off"`)}</label>
      <button type="button" class="icon-btn remove" data-act="remove-comp" data-k="${esc(c.key)}" aria-label="${esc(t('setup.removeComp', { n: i + 1 }))}">${CROSS}</button>
    </div>
    ${detail}
    ${errSlot(`${f}.pages`)}
  </div>`;
}

// What the launch will cost, from the draft as typed.
function estimateText() {
  const { project } = P.validate(state.setup, state.key || 'x');
  if (!project) return '';
  const e = P.estimate(project);
  return t('setup.estimate', { n: e.runs, low: e.low, high: e.high });
}

function formInner() {
  const s = state.setup;
  const busy = P.lockedElsewhere() || isRunning();
  return `<section class="card setup-card reveal" style="--i:1" aria-labelledby="s-site">
      <h2 id="s-site">${esc(t('setup.site'))}</h2>
      <div class="site-row">
        <label class="field"><span>${esc(t('setup.site.label'))}</span>${input('site', s.site, 'placeholder="monsite.fr" autocomplete="url" spellcheck="false" inputmode="url"')}${errSlot('site')}</label>
        <label class="field"><span>${esc(t('setup.name.label'))}</span>${input('name', s.name, `data-sitename="" placeholder="${esc(siteNamePh(s.site, t('setup.name.ph')))}" autocomplete="organization"`)}</label>
      </div>
      <div class="scope-row"><span class="scope-label">${esc(t('scope.label'))}</span>${scopeSwitch(s.scope)}</div>
      ${pagesBlock(s)}
    </section>

    <section class="card setup-card reveal" style="--i:2" aria-labelledby="s-comp">
      <h2 id="s-comp">${esc(t('setup.competitors'))}</h2>
      <p class="hint">${esc(t('setup.competitors.hint'))}</p>
      <div class="comps">${s.competitors.map(compBlock).join('')}</div>
      ${s.competitors.length < P.MAX_COMPETITORS ? `<button type="button" class="add-btn" data-act="add-comp">${PLUS}${esc(t('setup.addCompetitor'))}</button>` : ''}
    </section>

    ${keyCard()}

    <div class="setup-foot reveal" style="--i:4">
      <p class="muted" data-estimate aria-live="polite">${esc(estimateText())}</p>
      ${busy ? `<p class="hint" role="status">${esc(t(isRunning() ? 'cta.running' : 'setup.busy'))}</p>` : ''}
      <button type="submit" class="btn btn--lg"${busy ? ' disabled' : ''}>${esc(t('setup.run'))}</button>
    </div>`;
}

// ── The Google key: four steps, checked as soon as it is pasted ──
// One key, two APIs: PageSpeed Insights (required) and Chrome UX Report
// (recommended). Each step opens the right page of the Google Cloud console
// and ticks itself once the check sees it done; when both APIs answer, the
// guide folds into one line. The check (api.js, checkKey) measures nothing.
// The card is drawn once; ticks, lights and messages change in place, so the
// field keeps your cursor.

const CONSOLE = {
  project: 'https://console.cloud.google.com/projectcreate',
  psi: 'https://console.cloud.google.com/apis/library/pagespeedonline.googleapis.com',
  crux: 'https://console.cloud.google.com/apis/library/chromeuxreport.googleapis.com',
  key: 'https://console.cloud.google.com/apis/credentials',
};
const STEPS = [['project', 'open'], ['psi', 'enable', 'required'], ['crux', 'enable', 'recommended'], ['key', 'create']];
// The last check, for the key it was run on (kept for the visit).
const keyCheck = { key: '', state: 'idle', psi: null, crux: null };
let checkTimer = 0, checkCtrl = null, stepsOpen = false;

// empty · format · checking · done
function keyStatus() {
  const k = state.key.trim();
  if (!k) return 'empty';
  if (!KEY_FORMAT.test(k)) return 'format';
  return keyCheck.key === k && keyCheck.state === 'done' ? 'done' : 'checking';
}
function keyView() {
  const st = keyStatus();
  const { psi, crux } = st === 'done' ? keyCheck : {};
  const accepted = st === 'done' && psi !== 'refused' && crux !== 'refused';
  return {
    st, psi, crux,
    done: { project: accepted, psi: psi === 'ok', crux: crux === 'ok', key: accepted },
    // The step that needs you: an API to switch on.
    todo: psi === 'off' ? 'psi' : crux === 'off' && psi === 'ok' ? 'crux' : null,
    folded: psi === 'ok' && crux === 'ok' && !stepsOpen,
  };
}
// A key the check proved unusable holds the launch, with its reason.
function keyBlock() {
  const { st, psi, crux } = keyView();
  if (st !== 'done') return null;
  if (psi === 'refused' || crux === 'refused') return 'err.keyRefused';
  if (psi === 'off') return 'err.keyPsiOff';
  if (psi === 'quota') return 'err.keyQuota';
  return null;
}

const light = (api, v) => `<span class="key-light${v === 'ok' ? ' is-on' : ''}"><i aria-hidden="true"></i>${esc(t(`key.api.${api}`))} · ${esc(t(v === 'ok' ? 'key.on' : 'key.off'))}</span>`;
function keyStatusHtml(v) {
  const retry = `<button type="button" class="link" data-act="recheck">${esc(t('key.retry'))}</button>`;
  if (v.st === 'empty') return '';
  if (v.st === 'format') return `<p>${esc(t('key.format'))}</p>`;
  if (v.st === 'checking') return `<p class="key-checking"><i aria-hidden="true"></i>${esc(t('key.checking'))}</p>`;
  const { psi, crux } = v;
  if (psi === 'refused' || crux === 'refused') return `<p>${esc(t('key.refused'))}</p>`;
  if (psi === 'quota') return `<p>${esc(t('key.quota'))}</p>`;
  if ([psi, crux].some(x => x === 'network' || x === 'unknown')) return `<p>${esc(t('key.unknown'))} ${retry}</p>`;
  if (v.folded) return `<p class="key-lights"><b>${esc(t('key.valid'))}</b>${light('psi', psi)}${light('crux', crux)}<button type="button" class="link" data-act="steps">${esc(t('key.review'))}</button></p>`;
  const fold = psi === 'ok' && crux === 'ok' ? `<button type="button" class="link" data-act="steps">${esc(t('key.fold'))}</button>` : '';
  return `<p class="key-lights">${light('psi', psi)}${light('crux', crux)}${fold}</p>`;
}

function keyCard() {
  const v = keyView();
  const steps = STEPS.map(([id, go, tag], i) => `<li class="key-step${v.done[id] ? ' is-done' : ''}${v.todo === id ? ' is-todo' : ''}" data-step="${id}">
        <span class="key-tick" aria-hidden="true"><b>${i + 1}</b></span>
        <div class="key-body">
          <div class="key-head"><span class="key-title">${esc(t(`key.step.${id}`))}</span>${tag ? `<span class="key-tag key-tag--${tag}">${esc(t(`key.tag.${tag}`))}</span>` : ''}<a class="key-go" href="${CONSOLE[id]}" target="_blank" rel="noopener noreferrer">${esc(t(`key.go.${go}`))} ↗</a></div>
          <p class="hint">${esc(t(`key.step.${id}.hint`))}</p>
          ${id === 'key' ? `<label class="field key-field"><span class="sr-only">${esc(t('setup.key.label'))}</span>
            <span class="key-wrap">${input('key', state.key, `type="${state.showKey ? 'text' : 'password'}" placeholder="AIza…" autocomplete="off" spellcheck="false"`)}
            <button type="button" class="text-btn" data-act="show-key" aria-pressed="${state.showKey}">${esc(t(state.showKey ? 'setup.key.hide' : 'setup.key.show'))}</button></span>
            ${errSlot('key')}</label>` : ''}
          <span class="sr-only" data-step-sr>${v.done[id] ? esc(t('key.stepDone')) : ''}</span>
        </div>
      </li>`).join('');
  return `<section class="card setup-card key-card reveal${v.folded ? ' is-folded' : ''}" style="--i:3" aria-labelledby="s-key" data-keycard>
      <h2 id="s-key">${esc(t('setup.key'))}</h2>
      <p class="hint key-lead">${esc(t('key.lead'))}</p>
      <ol class="key-steps">${steps}</ol>
      <div class="key-status" data-key-status aria-live="polite">${keyStatusHtml(v)}</div>
      <p class="hint">${esc(t('setup.key.local'))}</p>
    </section>`;
}

// Ticks, lights and messages, in place.
function refreshKey() {
  const card = form()?.querySelector('[data-keycard]');
  if (!card) return;
  const v = keyView();
  card.classList.toggle('is-folded', v.folded);
  for (const li of card.querySelectorAll('[data-step]')) {
    const id = li.dataset.step;
    li.classList.toggle('is-done', v.done[id]);
    li.classList.toggle('is-todo', v.todo === id);
    li.querySelector('[data-step-sr]').textContent = v.done[id] ? t('key.stepDone') : '';
  }
  card.querySelector('[data-key-status]').innerHTML = keyStatusHtml(v);
}

// After a short pause in typing; a newer key drops the older check.
function scheduleCheck({ now = false, again = false } = {}) {
  const k = state.key.trim();
  clearTimeout(checkTimer);
  if (KEY_FORMAT.test(k) && (again || keyCheck.key !== k)) {
    checkCtrl?.abort();
    Object.assign(keyCheck, { key: k, state: 'checking', psi: null, crux: null });
    checkTimer = setTimeout(() => runCheck(k), now ? 0 : 600);
  }
  refreshKey();
}
async function runCheck(k) {
  const ctrl = checkCtrl = new AbortController();
  const r = await checkKey(k, { signal: ctrl.signal });
  if (ctrl !== checkCtrl || keyCheck.key !== k) return;
  Object.assign(keyCheck, { state: 'done', ...r });
  refreshKey();
  updateInPlace();
}
// Back from the console: a key that wasn't complete is checked again.
let returnBound = false;
function bindReturn() {
  if (returnBound) return;
  returnBound = true;
  const back = () => {
    const v = keyView();
    if (!document.hidden && form() && v.st === 'done' && (v.psi !== 'ok' || v.crux !== 'ok')) scheduleCheck({ now: true, again: true });
  };
  window.addEventListener('focus', back);
  document.addEventListener('visibilitychange', back);
}

export function renderSetup() {
  ensureDraft();
  return `<form class="setup-form" data-form novalidate>${formInner()}</form>`;
}

const CROSS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17"/></svg>';
const PLUS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';

// ── The run (#/analyze) ──────────────────────────────────────
// Light on purpose: a percentage, the time left, one dot per measurement
// (hollow: waiting, pulsing: measuring, filled: done, grey: unavailable), and
// the unavailable ones said once at the bottom. Scores wait for the result.

const finished = j => j.status === 'done' || j.status === 'fail';

function fraction(r) {
  const { jobs, field } = r.progress;
  if (r.status !== 'running') return 1;
  return (jobs.filter(finished).length + field.done / Math.max(1, field.total)) / (jobs.length + 1);
}

// From the pace so far once a few measurements are in; the estimate before.
function timeLeft(r, f) {
  const elapsed = Date.now() - r.startedAt;
  const ms = f > 0.05 ? (elapsed * (1 - f)) / f : r.estimate * 60000;
  return t('run.left', { n: Math.round(ms / 60000) });
}

function siteRows(project, jobs) {
  const sites = [{ id: 'you', name: project.name, you: true }, ...project.competitors.map(c => ({ id: c.id, name: c.name }))];
  const pageName = id => pick(project.pages.find(p => p.id === id)?.name ?? '');
  return sites.map(s => {
    const mine = jobs.filter(j => j.site === s.id);
    const done = mine.filter(finished).length;
    const dots = mine.map(j => `<i class="d d--${j.status}" title="${esc(`${pageName(j.pageId)} · ${t(`device.${j.device}`)}${j.status === 'done' ? ` · ${j.score}` : ''}`)}"></i>`).join('');
    return `<li class="run-site"><span class="run-name">${s.you ? youName(s.name) : esc(s.name)}</span><span class="run-dots" aria-hidden="true">${dots}</span><span class="run-frac" aria-hidden="true">${done}/${mine.length}</span><span class="sr-only">${esc(`${s.name} : ${t('run.siteSr', { done, total: mine.length })}`)}</span></li>`;
  }).join('');
}

// "Comptoir Sud · Accueil : protection anti-robot", once per page and reason.
function failures(project, jobs) {
  const groups = new Map();
  for (const j of jobs.filter(x => x.status === 'fail')) {
    const k = `${j.site}|${j.pageId}|${j.reason}`;
    groups.set(k, [...(groups.get(k) ?? []), j]);
  }
  if (!groups.size) return '';
  const siteName = id => (id === 'you' ? project.name : project.competitors.find(c => c.id === id)?.name ?? '');
  const items = [...groups.values()].map(list => {
    const j = list[0];
    const page = pick(project.pages.find(p => p.id === j.pageId)?.name ?? '');
    const device = list.length < DEVICES.length ? ` (${t(`device.${j.device}`).toLowerCase()})` : '';
    return `<li>${esc(`${siteName(j.site)} · ${page}${device} : ${t(`reason.${j.reason}`) || t('board.failed')}`)}</li>`;
  }).join('');
  return `<div class="run-fails"><p>${esc(t('run.fails'))}</p><ul>${items}</ul></div>`;
}

function live() {
  const r = state.run;
  const { project, progress } = r;
  const running = r.status === 'running';
  const f = fraction(r);
  const pct = Math.round(f * 100);
  const who = t('run.who', { name: project.name, n: project.competitors.length });
  return `${running ? `<p class="run-pct" aria-hidden="true">${pct}\u00a0%</p>` : ''}
    <p class="run-sub">${esc(running ? `${who} · ${timeLeft(r, f)}` : who)}</p>
    <div class="run-bar${running ? ' is-running' : ''}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="${esc(t('run.title'))}"><i style="width:${Math.max(2, pct)}%"></i></div>
    <ul class="run-sites">${siteRows(project, progress.jobs)}</ul>
    ${failures(project, progress.jobs)}`;
}

const editLink = `<a class="btn btn--ghost" href="#/settings">${esc(t('run.edit'))}</a>`;
const rerunButton = big => `<button type="button" class="btn${big ? ' btn--lg' : ' btn--ghost'}" data-act="again">${esc(t('cta.rerun'))} ${esc(t('cta.rerunRest'))}</button>`;

function runView() {
  const r = state.run;
  const { status } = r;
  const running = status === 'running';
  let lead = '';
  if (status === 'done') lead = t('run.done.lead', { date: fmt.date(new Date(r.ts)) });
  else if (status === 'aborted') lead = t('run.aborted.lead');
  else if (status === 'empty') lead = t(r.kept ? 'run.empty.kept' : 'run.empty.lead');
  else if (!running) lead = t(`fatal.${r.progress.fatal?.kind ?? 'error'}`, { api: r.progress.fatal?.api });
  const actions = running
    ? `<button type="button" class="btn btn--ghost" data-act="stop">${esc(t('run.stop'))}</button><span class="run-leave">${esc(t('run.leave'))}</span>`
    : status === 'done'
      ? `<a class="btn btn--lg" href="#/">${esc(t('run.see'))}</a>${editLink}`
      : `${rerunButton(true)}${editLink}`;
  return `<div class="card run-card">
      <h1 class="${running ? 'run-kicker' : 'run-title'}" tabindex="-1" data-run-title>${esc(t(`run.${status}.title`))}</h1>
      ${lead ? `<p class="run-lead" role="status">${esc(lead)}</p>` : ''}
      ${status === 'done' ? notesList(r.notes) : ''}
      <div data-run-live>${live()}</div>
      <div class="run-actions">${actions}</div>
    </div>`;
}

// No run in this tab: the last analysis and what to keep in mind, or the way in.
function idleView() {
  const last = P.loadResults();
  const busy = P.lockedElsewhere();
  if (!last) {
    return `<div class="card run-card"><h1 class="run-title" tabindex="-1" data-run-title>${esc(t('run.none.title'))}</h1><p class="run-lead">${esc(t('analyze.lede'))}</p>
      <div class="run-actions"><a class="btn btn--lg" href="#/settings">${esc(t('run.setup'))}</a></div></div>`;
  }
  return `<div class="card run-card">
      <h1 class="run-title" tabindex="-1" data-run-title>${esc(t('run.last.title'))}</h1>
      <p class="run-lead">${esc(t('run.done.lead', { date: fmt.date(new Date(last.ts)) }))}</p>
      ${notesList(last.notes)}
      ${busy ? `<p class="hint" role="status">${esc(t('setup.busy'))}</p>` : ''}
      <div class="run-actions">${busy ? '' : rerunButton(true)}${editLink}</div>
    </div>`;
}

export function renderRun() {
  ensureDraft();
  return `<main id="main" class="wrap run-screen reveal" data-view="analyze">${state.run ? runView() : idleView()}</main>`;
}

// ── Behaviour ────────────────────────────────────────────────

const form = () => document.querySelector('[data-form]');
const runMain = () => document.querySelector('[data-view="analyze"]');

function refreshForm({ focus } = {}) {
  const el = form();
  if (!el) return;
  el.innerHTML = formInner();
  if (focus) el.querySelector(focus)?.focus();
}
function refreshRun({ focus } = {}) {
  const el = runMain();
  if (!el) return;
  el.innerHTML = state.run ? runView() : idleView();
  if (focus) el.querySelector(focus)?.focus();
}

// Progress: only the live block is redrawn, once per frame, so focus and the
// Stop button stay put.
function scheduleLive() {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    const el = runMain()?.querySelector('[data-run-live]');
    if (el && state.run) el.innerHTML = live();
  });
}

// Typing never redraws the form: errors, labels and the estimate update in place.
function updateInPlace() {
  const el = form();
  if (!el) return;
  state.errors = P.validate(state.setup, state.key).errors;
  const blocked = keyBlock();
  if (blocked && !state.errors.key) state.errors.key = blocked;
  el.querySelectorAll('[data-err]').forEach(slot => {
    const msg = errOf(slot.dataset.err);
    slot.textContent = msg ? t(msg) : '';
    const field = el.querySelector(`[aria-describedby="err-${CSS.escape(slot.dataset.err)}"]`);
    if (msg) field?.setAttribute('aria-invalid', 'true'); else field?.removeAttribute('aria-invalid');
  });
  const s = state.setup;
  for (const p of s.pages) {
    el.querySelectorAll(`[data-plabel="${CSS.escape(p.key)}"]`).forEach(n => { n.textContent = pick(pageLabel(p)); });
    const home = P.equivalentOf({ pages: {} }, p) === '/';
    el.querySelectorAll(`[data-ph="${CSS.escape(p.key)}"]`).forEach(n => { n.placeholder = home ? t('setup.equiv.home') : t('setup.equiv.none'); });
    const row = el.querySelector(`[data-row="${CSS.escape(p.key)}"]`);
    const ph = row?.querySelector('[data-nameph]');
    if (ph) ph.placeholder = namePh(p);
    row?.querySelectorAll('[data-act="weight"]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.w) === p.weight)));
  }
  // Names that follow their domain: value (while automatic) and placeholder.
  const names = [{ key: '', name: s.name, site: s.site, auto: s.nameAuto, ph: t('setup.name.ph') },
    ...s.competitors.map(c => ({ key: c.key, name: c.name, site: c.site, auto: c.nameAuto, ph: t('setup.comp.namePh') }))];
  for (const n of names) {
    const field = el.querySelector(`[data-sitename="${CSS.escape(n.key)}"]`);
    if (!field) continue;
    if (n.auto && field !== document.activeElement && field.value !== n.name) field.value = n.name;
    field.placeholder = siteNamePh(n.site, n.ph);
  }
  const est = el.querySelector('[data-estimate]');
  if (est) est.textContent = estimateText();
}

function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { P.saveSetup(state.setup); P.saveKey(state.key.trim()); }, 300);
}

function onInput(e) {
  const el = e.target.closest('[data-f]');
  if (!el) return;
  const f = el.dataset.f, v = el.value;
  const s = state.setup;
  const page = s.pages.find(p => p.key === el.dataset.k);
  const comp = s.competitors.find(c => c.key === el.dataset.k);
  // A name you type is yours; cleared, it follows the domain again.
  if (f === 'site') { s.site = v; if (s.nameAuto) s.name = companyName(v); }
  else if (f === 'name') { s.name = v; s.nameAuto = !v.trim(); }
  else if (f === 'key') { state.key = v; scheduleCheck(); }
  else if (page && f.endsWith('.name')) page.name = v;
  else if (page && f.endsWith('.path')) page.path = v;
  else if (comp && f.endsWith('.site')) { comp.site = v; if (comp.nameAuto) comp.name = companyName(v); }
  else if (comp && f.endsWith('.name')) { comp.name = v; comp.nameAuto = !v.trim(); }
  else if (comp && el.dataset.p) comp.pages = { ...comp.pages, [el.dataset.p]: v };
  // The suggested importance follows the name and address until you choose.
  if (page?.auto) page.weight = P.autoWeight(page);
  persist();
  updateInPlace();
}

function onFormClick(e) {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const s = state.setup;
  const { act, k } = btn.dataset;
  if (act === 'add-page') {
    const key = P.newKey();
    s.pages.push({ key, name: '', path: '', weight: 1, auto: true });
    persist(); refreshForm({ focus: `[data-row="${key}"] input` });
  } else if (act === 'remove-page') {
    s.pages = s.pages.filter(p => p.key !== k);
    for (const c of s.competitors) { const { [k]: _, ...rest } = c.pages ?? {}; c.pages = rest; }
    persist(); refreshForm({ focus: '[data-act="add-page"]' });
  } else if (act === 'weight') {
    const page = s.pages.find(p => p.key === k);
    if (page) { page.weight = Number(btn.dataset.w); page.auto = false; persist(); updateInPlace(); }
  } else if (act === 'scope') {
    const target = k ? s.competitors.find(c => c.key === k) : s;
    if (target && target.scope !== btn.dataset.v) {
      target.scope = btn.dataset.v;
      persist(); refreshForm({ focus: `[data-act="scope"][data-k="${CSS.escape(k ?? '')}"][data-v="${btn.dataset.v}"]` });
    }
  } else if (act === 'add-comp') {
    const comp = P.emptyCompetitor();
    s.competitors.push(comp);
    persist(); refreshForm({ focus: `[data-comp="${comp.key}"] input` });
  } else if (act === 'remove-comp') {
    s.competitors = s.competitors.filter(c => c.key !== k);
    persist(); refreshForm({ focus: '[data-act="add-comp"]' });
  } else if (act === 'show-key') {
    state.showKey = !state.showKey;
    refreshForm({ focus: '[data-act="show-key"]' });
  } else if (act === 'recheck') {
    scheduleCheck({ now: true, again: true });
  } else if (act === 'steps') {
    stepsOpen = !stepsOpen;
    refreshKey();
    form()?.querySelector('[data-act="steps"]')?.focus();
  }
}

function onRunClick(e) {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  if (btn.dataset.act === 'stop') state.run?.ctrl.abort();
  else if (btn.dataset.act === 'again') startRun();
}

// Go to a screen, or redraw it when already there; then focus what matters.
function go(hash, focus) {
  state.focus = focus;
  if (location.hash !== hash) location.hash = hash;
  else host.rerender();
}

export async function startRun() {
  if (isRunning()) { go('#/analyze', '[data-run-title]'); return; }
  ensureDraft();
  clearTimeout(saveTimer);
  state.live = true;
  const { project, errors } = P.validate(state.setup, state.key);
  const blocked = keyBlock();
  state.errors = blocked && !errors.key ? { ...errors, key: blocked } : errors;
  // Something to fix first: back to the setup, on the first error.
  if (!project || blocked) { go('#/settings', '[aria-invalid="true"]'); return; }
  P.saveSetup(state.setup);
  P.saveKey(state.key.trim());
  if (!P.takeLock()) { state.run = null; go('#/analyze', '[data-run-title]'); return; }

  const ctrl = new AbortController();
  const plan = planRun(project);
  state.run = { status: 'running', project, ctrl, notes: [], startedAt: Date.now(), estimate: P.estimate(project).low, progress: { jobs: plan.jobs, field: { total: plan.fieldSteps, done: 0, off: null } } };
  go('#/analyze', '[data-run-title]');
  const heartbeat = setInterval(P.beat, 15000);
  let res;
  try {
    res = await runAnalysis({ project, key: state.key.trim(), signal: ctrl.signal, onProgress: p => { state.run.progress = p; scheduleLive(); } });
  } catch {
    res = { status: 'failed', progress: { ...state.run.progress, fatal: { kind: 'error' } } };
  } finally {
    clearInterval(heartbeat);
    P.releaseLock();
  }
  if (res.status === 'done' && res.ok) {
    const data = P.saveRun(res);
    state.setup = P.adoptResolved(state.setup, res.project);
    P.saveSetup(state.setup);
    state.run = { ...state.run, status: 'done', progress: res.progress, notes: data.notes, ts: res.ts };
    host.onData(data);
    // The result is the home screen: straight there, unless you went elsewhere.
    if (location.hash === '#/analyze') { host.onArrive(); go('#/'); return; }
  } else if (res.status === 'done') {
    state.run = { ...state.run, status: 'empty', progress: res.progress, kept: P.hasResults() };
  } else {
    state.run = { ...state.run, status: res.status, progress: res.progress };
  }
  host.onEnd();
  refreshRun({ focus: '[data-run-title]' });
}

// After a navigation the page scrolls to the top: focus once that is done.
function focusLater(root) {
  const sel = state.focus;
  state.focus = null;
  if (sel) requestAnimationFrame(() => root.querySelector(sel)?.focus());
}

export function mountSetup(root) {
  const el = root.querySelector('[data-form]');
  if (!el) return;
  el.addEventListener('input', onInput);
  el.addEventListener('click', onFormClick);
  el.addEventListener('submit', e => { e.preventDefault(); startRun(); });
  focusLater(el);
  // A saved key is checked once per visit.
  bindReturn();
  scheduleCheck({ now: true });
}

export function mountRun(root) {
  const el = root.querySelector('[data-view="analyze"]');
  if (!el) return;
  el.addEventListener('click', onRunClick);
  focusLater(el);
}
