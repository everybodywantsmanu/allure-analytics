// Compare: your company against your competitors, indicator by indicator,
// with what Google provides that the home screen leaves out.
//   Score PageSpeed  where the points come from, then the score page by page
//   Loading · Responsiveness · Stability
//                    real visitors first (6-month curve, standings, share of
//                    good visits), then the lab page by page
// Orange only marks your own values past Google's threshold (field) or out of
// Lighthouse's green (lab); competitors stay grey, lost points stay neutral.

import { t, pick, fmt } from '../i18n.js';
import { METRICS, THRESHOLDS, PSI_TARGET, LH_WEIGHTS, statusOf, metricScore, labMetricScore } from '../metrics.js';
import { position, scorePoints, fieldHistory } from '../benchmark.js';
import { raceChart } from '../charts.js';
import { segmented, youName, track, howChip } from './shell.js';
import { esc } from '../html.js';
import { pageUrl } from '../url.js';

export const TABS = ['score', ...METRICS];
const MAX_LINES = 4;
const GOOD_SHARE = 0.75;
// The lab measure that stands for each real-visitor metric (INP has none: TBT).
const LAB_KEY = { lcp: 'lcp', inp: 'tbt', cls: 'cls' };
const finite = Number.isFinite;
const round = Math.round;

// The competitors drawn on the curves: your pick, kept from one tab to the next.
// Until you pick, the default (the closest) is what a first click starts from.
let picked = null;
let shown = [];
export function togglePick(id) {
  const set = new Set(picked ?? shown);
  if (set.has(id)) set.delete(id); else if (set.size < MAX_LINES) set.add(id);
  picked = [...set];
}

const fmtLab = (key, v) => (key === 'tbt' ? fmt.ms(v) : fmt.metric(key, v));
const googleReport = (url, device) => `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(url)}&form_factor=${device}`;
const deviceSwitch = device => segmented('device', [['mobile', t('device.mobile')], ['desktop', t('device.desktop')]], device, t('aria.device'), 'segmented--device');

function tabs(current) {
  return `<nav class="segmented compare-tabs" aria-label="${esc(t('compare.tabs'))}">${TABS.map(id =>
    `<a href="#/compare/${id}"${id === current ? ' aria-current="page"' : ''}>${esc(t(`compare.tab.${id}`))}</a>`).join('')}</nav>`;
}

function section(id, title, sub, body) {
  return `<section class="card compare-card reveal" aria-labelledby="${id}">
    <header class="compare-card-head"><h2 id="${id}">${esc(title)}</h2>${sub ? `<p class="section-sub">${esc(sub)}</p>` : ''}</header>
    ${body}
  </section>`;
}

// Every site, you first: its real-visitor values, history, and lab pages.
function sitesOf(project, m) {
  return [
    { id: 'you', you: true, name: project.name, field: m.origin?.field ?? {} },
    ...project.competitors.map(c => ({ id: c.id, name: c.name, field: m.competitors?.[c.id]?.field ?? {}, pages: c.pages })),
  ];
}
const nameCell = s => (s.you ? youName(s.name) : `<span class="bname-text" title="${esc(s.name)}">${esc(s.name)}</span>`);
// A value of yours past the threshold: orange, with the threshold in words.
const alertValue = (text, say) => `<span class="bval${say ? ' is-alert' : ''}"${say ? ` title="${esc(say)}"` : ''}>${esc(text)}${say ? `<span class="sr-only"> ${esc(say)}</span>` : ''}</span>`;
const srNi = alert => (alert ? `<span class="sr-only"> ${esc(t('status.ni'))}</span>` : '');

// ── Real visitors ────────────────────────────────────────────

function fieldSection(ctx) {
  const { metric, sites, history, layout, device, notes } = ctx;
  const known = sites.filter(s => finite(s.field[metric]));
  const missing = sites.filter(s => !finite(s.field[metric]));
  const competitors = sites.filter(s => !s.you);
  // The curve: you and up to four competitors, by default the closest to you.
  const you = sites[0];
  const close = [...competitors].filter(s => finite(s.field[metric]))
    .sort((a, b) => Math.abs(a.field[metric] - you.field[metric]) - Math.abs(b.field[metric] - you.field[metric]))
    .slice(0, MAX_LINES).map(s => s.id);
  const chosen = (picked ?? []).filter(id => competitors.some(c => c.id === id));
  // No pick yet, or only competitors since removed: the closest. All unpicked: you alone.
  const drawn = !picked || (picked.length && !chosen.length) ? close : chosen;
  shown = drawn;
  const hist = fieldHistory(history, metric, ['you', ...drawn]);
  const values = id => hist.series[id];
  let chart;
  if (hist.times.length >= 2 && hist.series.you?.some(finite)) {
    const toScore = v => (finite(v) ? metricScore(metric, v) : null);
    chart = raceChart({
      series: [{ id: 'you', ...you, values: values('you').map(toScore), raw: values('you'), alert: finite(you.field[metric]) && statusOf(metric, you.field[metric]) !== 'good' },
        ...drawn.map(id => { const s = sites.find(x => x.id === id); return { id, name: s.name, values: values(id).map(toScore), raw: values(id) }; })],
      times: hist.times,
      target: 90,
      targetLabel: t('compare.threshold', { v: fmt.metric(metric, THRESHOLDS[metric].good) }),
      width: layout.wide ? layout.split : layout.hero,
      label: t('compare.chartAria', { metric: t(`metric.${metric}`) }),
      fmtValue: v => String(round(v)),
      fmtRaw: v => (finite(v) ? fmt.metric(metric, v) : '—'),
      fmtMonth: d => fmt.month(d),
      fmtDay: d => fmt.dateShort(d),
      fmtWindow: d => t('trend.crux', { date: fmt.date(d) }),
      endValues: false,
    });
  } else {
    const off = notes.some(n => n.kind === 'cruxoff');
    chart = `<p class="chart-empty">${esc(t(off ? 'compare.noHistoryOff' : 'compare.noHistory'))}</p>`;
  }

  // Pills choose the curves; four at most, the rest wait greyed.
  const pickable = competitors.filter(c => finite(c.field[metric]));
  const chips = pickable.length ? `<div class="compare-chips" role="group" aria-label="${esc(t('compare.pick'))}">${pickable.map(c => {
    const on = drawn.includes(c.id);
    const full = !on && drawn.length >= MAX_LINES;
    return `<button type="button" class="chip" data-action="pick" data-value="${esc(c.id)}" aria-pressed="${on}"${full ? ` disabled title="${esc(t('compare.pickMax'))}"` : ''}>${esc(c.name)}</button>`;
  }).join('')}</div>` : '';

  // Standings on the real value; lower is better. No shared rank, no claim.
  const ranked = [...known].sort((a, b) => a.field[metric] - b.field[metric]);
  const rows = ranked.map((s, i) => {
    const bad = s.you && statusOf(metric, s.field[metric]) !== 'good';
    return `<div class="brow brow--static${s.you ? ' brow--you' : ''}">
      <span class="brank">${i + 1}</span><span class="bname">${nameCell(s)}</span>
      ${track(metricScore(metric, s.field[metric]), s.you ? 'you' : 'other')}
      ${alertValue(fmt.metric(metric, s.field[metric]), bad && t('alert.over', { v: fmt.metric(metric, THRESHOLDS[metric].good) }))}
    </div>`;
  }).join('') + missing.map(s => `<div class="brow brow--na"><span class="brank">–</span><span class="bname">${nameCell(s)}</span><span class="bna">${esc(t('compare.noField'))}</span></div>`).join('');

  const board = `<div class="hero-board">
    <h3 class="board-title">${esc(t('section.board'))}</h3>
    <div class="bars bars--board bars--values" style="--target:90%">
      <div class="bars-head" aria-hidden="true"><span class="target-tag"><span>${esc(t('compare.thresholdShort'))}</span></span></div>
      ${rows}
    </div>
  </div>`;

  // Share of good visits: one bar per site, Google's 75 % mark drawn once.
  const byShare = [...sites].sort((a, b) => (b.field.good?.[metric] ?? -1) - (a.field.good?.[metric] ?? -1));
  const goodRows = byShare.map(s => {
    const g = s.field.good?.[metric];
    if (!finite(g)) return `<div class="brow brow--na brow--share"><span class="bname">${nameCell(s)}</span><span class="bna">—</span></div>`;
    const bad = s.you && g < GOOD_SHARE;
    return `<div class="brow brow--static brow--share${s.you ? ' brow--you' : ''}">
      <span class="bname">${nameCell(s)}</span>
      ${track(g * 100, s.you ? 'you' : 'other')}
      ${alertValue(`${round(g * 100)} %`, bad && t('alert.share'))}
    </div>`;
  }).join('');

  return section('field-title', t('compare.field'), t('compare.field.sub'), `
      ${chips}
      <div class="hero-split has-board has-chart">
        <div class="hero-chart">${chart}</div>
        ${board}
      </div>
      <div class="compare-block">
        <h3 class="board-title">${esc(t(`compare.good.${metric}`, { v: fmt.metric(metric, THRESHOLDS[metric].good) }))}</h3>
        <div class="bars bars--share" style="--target:${GOOD_SHARE * 100}%">
          <div class="bars-head" aria-hidden="true"><span class="target-tag"><span>${esc(t('compare.goodMark'))}</span></span></div>
          ${goodRows}
        </div>
      </div>`);
}

// ── The lab, page by page ────────────────────────────────────
// Sites as columns, pages as rows; a value opens Google's own report for that
// page (a new run at Google: its figures can differ by a few points).

function labTable({ project, m, sites, device, cell, rows, caption }) {
  const head = `<tr><th scope="col"><span class="sr-only">${esc(t('compare.page'))}</span></th>${sites.map(s => `<th scope="col">${nameCell(s)}</th>`).join('')}</tr>`;
  const body = rows.map(r => `<tr><th scope="row">${esc(r.label)}</th>${sites.map(s => `<td>${cell(r, s)}</td>`).join('')}</tr>`).join('');
  return `<div class="table-wrap"><table class="compare-table"><caption class="sr-only">${esc(caption)}</caption><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
}

// One lab value: a link to Google's report when the page's address is known.
function labValue({ project, m, device }, site, page, text, alert) {
  const measured = site.you ? m.pages?.[page.id]?.url : m.competitors?.[site.id]?.pages?.[page.id]?.url;
  const configured = site.you ? (project.demo ? null : pageUrl(project.origin, page.path)) : site.pages?.[page.id];
  const url = measured ?? configured;
  const body = `${esc(text)}${srNi(alert)}`;
  const cls = `lab-val${alert ? ' is-alert' : ''}`;
  return url ? `<a class="${cls}" href="${esc(googleReport(url, device))}" target="_blank" rel="noopener noreferrer" title="${esc(t('compare.report'))}">${body}</a>` : `<span class="${cls}">${body}</span>`;
}

function labOf(m, site, page) {
  return site.you ? m.pages?.[page.id]?.lab : m.competitors?.[site.id]?.pages?.[page.id]?.lab;
}
// Not measured for this site: failed when it was meant to be ("unavailable"),
// otherwise not compared on that page ("—").
function noLab(m, site, page) {
  const planned = site.you || !!site.pages?.[page.id];
  return `<span class="lab-na">${esc(planned ? t('compare.na') : '—')}</span>`;
}

function labSection(ctx) {
  const { project, m, sites, metric, device } = ctx;
  const key = LAB_KEY[metric];
  const pages = project.pages.filter(p => sites.some(s => finite(labOf(m, s, p)?.[key])));
  if (!pages.length) return '';
  const table = labTable({ ...ctx, caption: t('compare.lab'),
    rows: pages.map(p => ({ page: p, label: pick(p.name) })),
    cell: (r, s) => {
      const lab = labOf(m, s, r.page);
      if (!finite(lab?.[key])) return noLab(m, s, r.page);
      return labValue(ctx, s, r.page, fmtLab(key, lab[key]), s.you && labMetricScore(key, lab[key], device) < 0.9);
    } });
  return section('lab-title', t('compare.lab'), metric === 'inp' ? t('compare.lab.inp') : '', table);
}

// ── Score PageSpeed: where the points come from ──────────────

function scoreTab(ctx) {
  const { project, m, sites, device } = ctx;
  const { set, table, excluded } = position(project, m);
  const target = PSI_TARGET[device];
  // Sites in standings order, then those left out of the comparison.
  const order = [...table.map(c => sites.find(s => s.id === c.id)), ...excluded.map(c => sites.find(s => s.id === c.id))].filter(Boolean);
  const points = Object.fromEntries(order.map(s => [s.id, set.length ? scorePoints(m, set, s.id) : null]));
  const reason = s => excluded.find(c => c.id === s.id)?.reason;
  const rows = [...Object.keys(LH_WEIGHTS).map(k => ({ k, label: t(`compare.pts.${k}`, { w: round(LH_WEIGHTS[k] * 100) }) })), { k: 'total', label: t('compare.total') }];
  const scored = order.filter(s => points[s.id]);
  const left = order.filter(s => !points[s.id]).map(s => t('compare.leftOut', { name: s.name, why: t(reason(s) === 'nopages' ? 'compare.nopages' : 'board.failed').toLowerCase() }));
  const breakdown = labTable({ ...ctx, sites: scored, caption: t('compare.points'), rows,
    cell: (r, s) => {
      const pts = points[s.id];
      if (!pts) return `<span class="lab-na">${esc(t(reason(s) === 'nopages' ? 'compare.nopages' : 'board.failed'))}</span>`;
      // The total is the standings' score, so it reads the same as on the home screen.
      if (r.k === 'total') {
        const score = round(table.find(c => c.id === s.id)?.score ?? Object.values(pts).reduce((a, b) => a + b, 0));
        const bad = s.you && score < target;
        return `<span class="lab-val lab-val--total${bad ? ' is-alert' : ''}">${score}${srNi(bad)}</span>`;
      }
      const lost = round(LH_WEIGHTS[r.k] * 100 - pts[r.k]);
      const shade = Math.round((lost / (LH_WEIGHTS[r.k] * 100)) * 28);
      return `<span class="lab-val heat" style="--heat:${shade}%">${lost ? `−${lost}` : '0'}</span>`;
    } });
  const sub = set.length && set.length < project.pages.length ? t('compare.points.on', { pages: set.map(p => pick(p.name)).join(' · ') }) : t('compare.points.sub');
  const pages = project.pages.filter(p => sites.some(s => finite(labOf(m, s, p)?.score)));
  const perPage = pages.length ? section('pages-score-title', t('compare.pages'), '', labTable({ ...ctx, sites: order, caption: t('compare.pages'),
    rows: pages.map(p => ({ page: p, label: pick(p.name) })),
    cell: (r, s) => {
      const lab = labOf(m, s, r.page);
      if (!finite(lab?.score)) return noLab(m, s, r.page);
      return labValue(ctx, s, r.page, String(lab.score), s.you && lab.score < target);
    } })) : '';
  const leftOut = left.length ? `<p class="hint compare-left">${esc(left.join(' · '))}</p>` : '';
  return `${section('points-title', t('compare.points'), sub, scored.length ? breakdown + leftOut : leftOut)}${perPage}`;
}

// ── The screen ───────────────────────────────────────────────

export function renderCompare({ data, device, tab, layout = { hero: 980, split: 580, wide: true } }) {
  const { project, measurements, history } = data;
  const current = TABS.includes(tab) ? tab : 'score';
  const m = measurements?.[device];
  const head = `<header class="compare-head reveal">
      <a class="back-link" href="#/">${esc(t('compare.back'))}</a>
      <div class="compare-title"><h1>${esc(t('compare.title'))}</h1>${deviceSwitch(device)}</div>
      ${m ? `<div class="compare-how">${howChip(fmt.ago(new Date(m.ts)), { more: current !== 'score' })}</div>` : ''}
      ${tabs(current)}
    </header>`;
  if (!m) {
    return `<main id="main" class="wrap compare">${head}<p class="chart-empty compare-empty">${esc(t('empty.device', { device: t(`device.of.${device}`) }))}</p></main>`;
  }
  const sites = sitesOf(project, m);
  const ctx = { project, m, device, sites, metric: current, history: history?.[device], layout, notes: data.notes ?? [] };
  const solo = project.competitors.length ? '' : `<p class="hint compare-solo">${esc(t('compare.solo'))} <a class="link" href="#/settings">${esc(t('nav.settings'))}</a></p>`;
  const body = current === 'score' ? scoreTab(ctx) : `${fieldSection(ctx)}${labSection(ctx)}`;
  return `<main id="main" class="wrap compare">${head}${solo}${body}</main>`;
}
