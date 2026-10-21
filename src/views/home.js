// The home screen, minimal and self-explanatory: one score (Google's PageSpeed
// score), one threshold (60 on mobile, 80 on desktop), every number said once.
//   summary, curve and standings (side by side on a wide screen; each score
//   with its change since the previous analysis) → quick wins → your pages
// Colour appears only on your own values below the threshold; competitors
// stay grey. Missing data never breaks the screen: no
// measurement, no competitor, a failed run or a short history each have their
// own plain state. Allure shows where you stand; it doesn't track your work.

import { t, pick, fmt, auditTitle } from '../i18n.js';
import { METRICS, THRESHOLDS, PSI_TARGET, statusOf } from '../metrics.js';
import { buildFixes } from '../prioritize.js';
import { position, rival, scoreWithFixes, withScore, alignedLab, rankHistory, sinceLast, TIE_PTS } from '../benchmark.js';
import { raceChart } from '../charts.js';
import { segmented, youName, track, howChip } from './shell.js';
import { storage } from '../storage.js';
import { notesList } from './notes.js';
import { esc } from '../html.js';

const DAY = 864e5;
const MONTH = 30.44 * DAY;
const finite = Number.isFinite;
const ord = n => t('rank.ordinal', { n });
const round = v => Math.round(v);
// Judged on the number shown: 59.6 reads "60", so it is not below a threshold of 60.
const below = (score, target) => round(score) < target;
const unit = n => t('unit.pts', { n });
// Estimated gains: never more precise than the estimate.
const shown = v => { const n = Math.max(0, v); return n < 1 ? Math.round(n * 10) / 10 : Math.round(n); };
const pts = v => `≈ +${fmt.number(shown(v), 1)} ${unit(shown(v))}`;
const withUnit = n => `${n} ${unit(n)}`;
const names = list => (list.length === 1 ? list[0].name : t('list.and', { a: list.slice(0, -1).map(c => c.name).join(', '), b: list[list.length - 1].name }));
// The curve stays readable: beyond this, only the sites closest to you are drawn.
const MAX_LINES = 4;

function head(id, title, aside = '') {
  return `<header class="section-head"><h2 id="${id}">${esc(title)}</h2>${aside}</header>`;
}

// Your score below the threshold reads in orange; what it misses is said in
// words (hover, screen reader).
function value(score, target, alert) {
  const say = alert ? t('alert.below', { p: withUnit(target - round(score)), v: target }) : '';
  return `<span class="bval${alert ? ' is-alert' : ''}"${alert ? ` title="${esc(say)}"` : ''}>${round(score)}${alert ? `<span class="sr-only"> ${esc(say)}</span>` : ''}</span>`;
}

// A row with nothing to measure: the site or page stays visible, unranked.
function naRow(name, reason, rank = true) {
  return `<div class="brow brow--na">${rank ? '<span class="brank">–</span>' : ''}<span class="bname">${esc(name)}</span><span class="bna">${esc(reason)}</span></div>`;
}

// The device switch sits with the data it filters.
const deviceSwitch = device => segmented('device', [['mobile', t('device.mobile')], ['desktop', t('device.desktop')]], device, t('aria.device'), 'segmented--device');

function empty(title, device) {
  return `<main id="main" class="wrap stub reveal">
    <div class="card">
      <div class="hero-head hero-head--empty">${deviceSwitch(device)}</div>
      <h1>${esc(title)}</h1>
      <p>${esc(t('empty.hint'))}</p>
      <a class="btn" href="#/analyze">${esc(t('cta.short'))} ${esc(t('cta.rest'))}</a>
    </div>
  </main>`;
}

// layout: hero = the card's inner width; split = the curve's width when the
// standings sit beside it (wide = there is room for that).
export function renderHome({ data, device, layout = { hero: 980, split: 600, wide: true } }) {
  const { project, measurements, history } = data;
  const target = PSI_TARGET[device];
  const m = measurements?.[device];
  if (!m) return empty(t('empty.device', { device: t(`device.of.${device}`) }), device);
  const { set, table, excluded } = position(project, m);
  if (!table.length) return empty(t('empty.you', { device: t(`device.of.${device}`) }), device);

  const r = rival(table);
  const lab = alignedLab(history?.[device], table.filter(c => !c.you).map(c => c.id), set);
  const rh = rankHistory(lab);
  const plan = planFixes(buildFixes(project, m), m, set, table, r, target);
  const since = sinceLast(table, set, data.previous?.[device]);
  const ctx = { project, m, set, table, excluded, r, lab, rh, plan, since, target, device, layout, notes: data.notes ?? [] };
  ctx.moment = momentOf(ctx);

  return `<main id="main" class="wrap">
    ${hero(ctx)}
    ${quickWins(ctx)}
    ${pagesBars(ctx)}
  </main>`;
}

// Quick wins: what a fix does for your position, per unit of effort.
// Impact = places gained if shipped alone + share of the gap it closes (to the
// rival, or to the target when you're alone); ties fall back to the
// page-weighted priority. Fixes worth less than half a point are left out.
const EFFORT_COST = { easy: 1, medium: 1.6, heavy: 3 };
const MIN_PTS = 0.5;
function planFixes(fixes, m, set, table, r, target) {
  const { you, other, mode } = r;
  const gapPts = mode === 'chase' ? other.score - you.score : mode === 'solo' ? target - you.score : 0;
  return fixes.map(fix => {
    const score = scoreWithFixes(m, set, [fix]);
    const after = withScore(table, score).find(c => c.you);
    const points = score - you.score;
    const cover = gapPts > 0 ? Math.min(1, points / gapPts) : points / 10;
    const cost = EFFORT_COST[fix.effort] ?? 2;
    const up = you.rank - after.rank;
    return { ...fix, points, up, value: (up + cover) / cost, base: fix.priority / cost };
  })
    .filter(fix => fix.points >= MIN_PTS)
    .sort((a, b) => b.value - a.value || b.base - a.base);
}

// ── Summary and curve ────────────────────────────────────────

// Your history starts at your first measured week.
function span(lab) {
  const first = lab.you.findIndex(finite);
  if (first < 0) return { first, months: 0, points: 0 };
  return {
    first,
    months: (lab.times[lab.times.length - 1] - lab.times[first]) / MONTH,
    points: lab.you.filter(finite).length,
  };
}

// Places gained or lost, counted only against the sites measured at both ends.
function movement({ r, table, lab, rh }, first, n) {
  const { you, mode } = r;
  if (mode === 'solo') {
    const d = you.score - rh[first].scores.you;
    if (Math.abs(d) < TIE_PTS) return `<span class="pill">${esc(t('move.flat', { months: n }))}</span>`;
    return d > 0 ? `<span class="pill">▲ ${esc(t('move.ptsUp', { p: round(d), months: n }))}</span>`
      : `<span class="pill pill--alert">▼ ${esc(t('move.ptsDown', { p: round(-d), months: n }))}</span>`;
  }
  const w = rh[first];
  const peers = Object.keys(lab.competitors).filter(id => finite(w.scores[id]));
  const aboveThen = peers.filter(id => w.scores[id] > w.scores.you).length;
  const aboveNow = peers.filter(id => table.find(c => c.id === id).rank < you.rank).length;
  const moved = aboveThen - aboveNow;
  return moved > 0 ? `<span class="pill">▲ ${esc(t('move.up', { n: moved, months: n }))}</span>`
    : moved < 0 ? `<span class="pill pill--alert">▼ ${esc(t('move.down', { n: -moved, months: n }))}</span>`
    : `<span class="pill">${esc(t('move.flat', { months: n }))}</span>`;
}

// Your position first, said positively ("Vous êtes 3e."), then what comes
// next: the place just ahead (within reach under NEAR_PTS), the threshold,
// or your lead. The number of competitors is left to the standings.
// The position is wrapped: it rolls from the previous one, and the end of an
// analysis lands on it (see mountHome).
const NEAR_PTS = 5;
const placeOf = n => (n === 1 ? t('rank.lead') : ord(n));
const hrank = (text, from) => `<span class="hrank"${from && from !== text ? ` data-from="${esc(from)}"` : ''}>${esc(text)}</span>`;
function headline({ r, target, moment }) {
  const { you, other, mode } = r;
  const pts = p => t('hero.points', { p });
  if (mode === 'solo') {
    const v = round(you.score);
    if (below(you.score, target)) return t('hero.solo.below', { v: hrank(v), p: pts(target - v) });
    return t(v - target >= 10 ? 'hero.solo.far' : 'hero.solo.met', { v: hrank(v) });
  }
  const rank = hrank(placeOf(you.rank), moment && placeOf(moment.from));
  if (mode === 'defend') {
    // Leading a market that is below the threshold: the threshold is the next step.
    if (below(you.score, target)) return t('hero.leadBelow', { rank, p: pts(target - round(you.score)) });
    return r.tie ? t('hero.leadTie', { rank, name: esc(other.name) }) : t('hero.lead', { rank, name: esc(other.name), p: pts(round(you.score - other.score)) });
  }
  if (r.tie) return t('hero.tie', { rank, name: esc(other.name) });
  const d = round(other.score - you.score);
  return t(d <= NEAR_PTS ? 'hero.near' : 'hero.chase', { rank, place: t('rank.place', { n: other.rank }), p: pts(d) });
}

// The competitors worth a line: the leader, the sites just ahead and just
// behind, then the closest in score — never more than MAX_LINES.
function closest(table, you, hasHistory) {
  const others = table.filter(c => !c.you && hasHistory(c));
  const keep = new Set();
  const take = c => { if (c && others.includes(c) && keep.size < MAX_LINES) keep.add(c); };
  take(others[0]);
  take(table.find(c => c.rank === you.rank - 1));
  take(table.find(c => c.rank === you.rank + 1));
  [...others].sort((a, b) => Math.abs(a.score - you.score) - Math.abs(b.score - you.score)).forEach(take);
  return { shown: others.filter(c => keep.has(c)), hidden: others.length - keep.size };
}

// The moment it pays off: a place won since last time (never on a tie).
function winPill({ since }) {
  if (since?.passed.length) return `<span class="pill pill--win">▲ ${esc(t('win.passed', { names: names(since.passed) }))}</span>`;
  if (since?.lost.length) return `<span class="pill pill--alert">▼ ${esc(t('win.lost', { names: names(since.lost), n: since.lost.length }))}</span>`;
  return '';
}

// Before there is a curve (a first analysis), no empty frame: the standings
// take the whole width, and one quiet line marks where the curve will start —
// a dot, then a dashed line that fades towards the next analysis.
function startLine(date) {
  return `<p class="start-line"><svg class="start-mark" viewBox="0 0 72 10" aria-hidden="true"><defs><linearGradient id="start-fade" gradientUnits="userSpaceOnUse" x1="15" x2="72"><stop offset="0" stop-color="currentColor"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs><circle cx="5" cy="5" r="4.5"/><path d="M15 5H72" stroke="url(#start-fade)"/></svg><span>${esc(t('hero.start', { date: fmt.dateShort(date) }))}</span></p>`;
}

// What to keep in mind about this analysis, folded at the foot of the card.
function heroNotes({ notes }) {
  if (!notes.length) return '';
  return `<details class="hero-notes"><summary>${esc(t('notes.summary', { n: notes.length }))}</summary>${notesList(notes)}</details>`;
}

function hero(ctx) {
  const { table, r, lab, target, device, m, layout } = ctx;
  const { first, months, points } = span(lab);
  const n = Math.max(1, round(months));
  const move = first >= 0 && months >= 1 ? movement(ctx, first, n) : '';
  // One pill at most: the place just won (or lost), else the longer trend.
  const chips = winPill(ctx) || move;
  const boardHtml = board(ctx);
  const width = boardHtml && layout.wide ? layout.split : layout.hero;

  let chart = '';
  if (points >= 2) {
    const from = v => v.slice(first);
    const shownTimes = from(lab.times);
    // Analyses on a single day are told apart by their time.
    const oneDay = shownTimes[0].toDateString() === shownTimes[shownTimes.length - 1].toDateString();
    const drawn = closest(table, r.you, c => !!lab.competitors[c.id]);
    // The competitor to beat (just ahead, or just behind when you lead) stands
    // out; the others step back.
    const focus = r.other && drawn.shown.includes(r.other) ? r.other.id : null;
    const series = [
      { id: 'you', you: true, name: r.you.name, values: from(lab.you), alert: below(r.you.score, target) },
      ...drawn.shown.map(c => ({ id: c.id, name: c.name, values: from(lab.competitors[c.id]), focus: c.id === focus, faint: !!focus && c.id !== focus })),
    ];
    chart = raceChart({
      series,
      times: shownTimes,
      target,
      targetLabel: t('chart.target', { v: target }),
      width,
      label: t('hero.chartAria', { months: n }),
      fmtValue: v => String(round(v)),
      fmtMonth: d => fmt.month(d),
      fmtDay: d => (oneDay ? fmt.time(d) : fmt.dateShort(d)),
      // A point is a week in the demo, an analysis on your data.
      fmtWindow: d => (lab.kind === 'runs' ? t('trend.run', { date: fmt.dateShort(d), time: fmt.time(d) }) : t('trend.window', { date: fmt.date(d) })),
      // Scores are read in the standings next to the curve: lines end on names.
      endValues: !boardHtml,
    }) + (drawn.hidden ? `<p class="chart-note">${esc(t('chart.more', { n: drawn.hidden }))}</p>` : '');
  }

  return `<section class="hero reveal" aria-labelledby="hero-title">
    <div class="card hero-card" data-name="${esc(ctx.project.name)}"${ctx.moment ? ` data-moment="${esc(ctx.moment.key)}" data-gain="${ctx.moment.from > r.you.rank}"` : ''}>
      <div class="hero-head">
        ${howChip(fmt.ago(new Date(m.ts)))}
        ${deviceSwitch(device)}
      </div>
      <h1 class="headline" id="hero-title">${headline({ r, target, moment: ctx.moment })}</h1>
      ${chips ? `<div class="chips">${chips}</div>` : ''}
      <div class="hero-split${boardHtml ? ' has-board' : ''}${chart ? ' has-chart' : ''}">
        ${chart ? `<div class="hero-chart">${chart}</div>` : ''}
        ${boardHtml}
      </div>
      ${chart ? '' : startLine(first >= 0 ? lab.times[first] : new Date(m.ts))}
      ${heroNotes(ctx)}
    </div>
  </section>`;
}

// ── Standings: one bar per site, detail on demand ────────────

// A real-visitor value of yours past Google's threshold says which threshold.
function tile(metric, v, mine) {
  const known = finite(v);
  const bad = mine && known && statusOf(metric, v) !== 'good';
  const limit = bad ? t('tile.threshold', { v: fmt.metric(metric, THRESHOLDS[metric].good) }) : '';
  return `<a class="tile${bad ? ' is-alert' : ''}" href="#/compare/${metric}"><small>${esc(t(`metric.short.${metric}`))}</small><span>${known ? fmt.metric(metric, v) : `<span aria-hidden="true">—</span><span class="sr-only"> ${esc(t('tile.nodata'))}</span>`}</span>${bad ? `<small class="tile-limit"><span class="sr-only">${esc(t('status.ni'))}, </span>${esc(limit)}</small>` : ''}</a>`;
}

// The change since the previous analysis, on the scores as they were shown:
// "+4", "−9", or "=" under 2 points (lab runs vary that much). Blank for a site
// that wasn't measured then.
function delta(c, since, m) {
  const before = since?.scores?.[c.id];
  if (!finite(before)) return '<span class="bdelta"></span>';
  const d = round(c.score) - round(before);
  const then = new Date(since.ts);
  const when = then.toDateString() === new Date(m.ts).toDateString()
    ? t('since.time', { time: fmt.time(then) }) : t('since.date', { date: fmt.dateShort(then) });
  const say = t('delta.say', { when, d: Math.abs(d) < TIE_PTS ? t('delta.flat') : `${d < 0 ? '−' : '+'}${withUnit(Math.abs(d))}` });
  const text = Math.abs(d) < TIE_PTS ? '=' : `${d < 0 ? '−' : '+'}${Math.abs(d)}`;
  return `<span class="bdelta" title="${esc(say)}"><span aria-hidden="true">${text}</span><span class="sr-only">${esc(say)}</span></span>`;
}

// The moment it pays off, played once per previous analysis and device: the
// position rolls from where it stood, the rows slide to their new places, and
// a place won glints across your bar (see mountHome). Only real moves count
// (places won or lost against sites in both standings, never on a tie).
const celebrated = () => storage.get('celebrated') ?? [];
function momentOf({ project, device, since, r }) {
  if (!since || !(since.passed.length || since.lost.length)) return null;
  const key = `moment:${project.id}:${device}:${since.ts}`;
  if (celebrated().includes(key)) return null;
  return { key, from: r.you.rank + since.passed.length - since.lost.length };
}

function board(ctx) {
  const { project, set, table, excluded, target, since, m, moment } = ctx;
  // Alone with no competitor to show, a one-row board says nothing.
  if (table.length < 2 && !excluded.length) return '';
  const play = !!moment;
  const before = play ? [...table].sort((a, b) => (since.ranks[a.id] ?? a.rank + 0.5) - (since.ranks[b.id] ?? b.rank + 0.5)) : [];
  const rows = table.map((c, i) => {
    const from = play ? before.indexOf(c) - i : 0;
    const alert = c.you && below(c.score, target);
    return `<details class="brow${c.you ? ' brow--you' : ''}"${from ? ` data-flip="${from}"` : ''}>
      <summary>
        <span class="brank">${c.rank}</span>
        <span class="bname">${c.you ? youName(c.name) : esc(c.name)}</span>
        ${track(c.score, c.you ? 'you' : 'other')}
        ${value(c.score, target, alert)}
        ${since ? delta(c, since, m) : ''}
      </summary>
      <div class="tiles">${METRICS.map(mm => tile(mm, c.field?.[mm], c.you)).join('')}</div>
    </details>`;
  }).join('');
  const missing = excluded.map(c => naRow(c.name, t(`board.${c.reason}`))).join('');
  // Say which pages the comparison runs on when it isn't all of yours.
  const compared = table.length > 1 && set.length < project.pages.length
    ? `<p class="section-sub">${esc(t('board.compared', { pages: set.map(p => pick(p.name)).join(' · ') }))}</p>` : '';
  return `<div class="hero-board" role="group" aria-labelledby="board-title">
    <div class="board-head"><h2 class="board-title" id="board-title">${esc(t('section.board'))}</h2><a class="board-more" href="#/compare/score">${esc(t('compare.more'))}</a></div>
    ${compared}
    <div class="bars bars--board${since ? ' bars--delta' : ''}" style="--target:${target}%">
      <div class="bars-head" aria-hidden="true"><span class="target-tag"><span>${esc(t('chart.target', { v: target }))}</span></span></div>
      ${rows}${missing}
    </div>
  </div>`;
}

// ── The moments ──────────────────────────────────────────────

// Set by an analysis that ends on its own screen, just before it lands here.
let arriving = false;
export const arriveNext = () => { arriving = true; };

export function mountHome(root) {
  mountQuickWins(root);
  const card = root.querySelector('[data-moment]');
  const rank = root.querySelector('.hrank');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const arrive = arriving && rank && !document.hidden && !still;
  arriving = false;
  if (card) storage.set('celebrated', [...celebrated(), card.dataset.moment].slice(-20));
  const gained = card?.dataset.gain === 'true';
  const from = card && !still ? rank?.dataset.from : null;
  // The rows wait at their old places (hidden by the landing, if any).
  const release = card ? holdRows(root) : () => {};
  if (arrive) {
    land(rank, from, gained, root.querySelector('[data-name]')?.dataset.name ?? '').then(() => release(gained));
  } else {
    if (from) roll(rank, from, gained, 450);
    requestAnimationFrame(() => requestAnimationFrame(() => release(gained)));
  }
}

// Rows are set where they stood; release() lets them slide to where they
// stand, and a place won glints across your bar once they have.
function holdRows(root) {
  const rows = [...root.querySelectorAll('[data-flip]')];
  const h = rows[0]?.getBoundingClientRect().height ?? 0;
  for (const row of rows) {
    row.style.transform = `translateY(${Number(row.dataset.flip) * h}px)`;
    row.classList.add('is-flipping');
  }
  return gained => {
    rows.forEach(row => { row.style.transform = ''; });
    if (gained) root.querySelector('.brow--you')?.classList.add('is-glinting');
  };
}

// The position rolls from the previous one, like a counter: a place won
// comes up from below, a place lost comes down from above.
function roll(el, from, gained, delay) {
  const to = el.textContent;
  const lines = gained ? [from, to] : [to, from];
  el.innerHTML = `<span class="sr-only">${esc(to)}</span><span class="odo${gained ? '' : ' odo--down'}" style="--delay:${delay}ms" aria-hidden="true"><span class="odo-strip">${lines.map(x => `<span>${esc(x)}</span>`).join('')}</span></span>`;
  const odo = el.querySelector('.odo');
  odo.addEventListener('transitionend', () => { el.textContent = to; }, { once: true });
  requestAnimationFrame(() => requestAnimationFrame(() => odo.classList.add('is-rolling')));
}

// The end of an analysis: your position very large in the middle of the
// screen (rolling from the previous one), then it settles into the sentence
// while the page appears. A click skips it.
function land(rankEl, from, gained, name) {
  return new Promise(done => {
    const ov = document.createElement('div');
    ov.className = 'arrival';
    ov.setAttribute('aria-hidden', 'true');
    ov.innerHTML = `<div class="arrival-inner"><small>${esc(name)}</small><p class="arrival-line"><span class="arrival-rank">${esc(rankEl.textContent)}</span></p></div>`;
    document.body.append(ov);
    rankEl.style.visibility = 'hidden';
    const big = ov.querySelector('.arrival-rank');
    if (from) roll(big, from, gained, 700);
    let left = false;
    const leave = () => {
      if (left) return;
      left = true;
      clearTimeout(timer);
      // Scale around the number's own corner, then move that corner onto the sentence's.
      const line = ov.querySelector('.arrival-line');
      const a = big.getBoundingClientRect(), l = line.getBoundingClientRect(), b = rankEl.getBoundingClientRect();
      const k = parseFloat(getComputedStyle(rankEl).fontSize) / parseFloat(getComputedStyle(big).fontSize);
      line.style.transformOrigin = `${a.left - l.left}px ${a.top - l.top}px`;
      line.style.transform = `translate(${b.left - a.left}px, ${b.top - a.top}px) scale(${k})`;
      ov.classList.add('is-leaving');
      setTimeout(() => { rankEl.style.visibility = ''; ov.remove(); done(); }, 760);
    };
    const timer = setTimeout(leave, from ? 2100 : 1300);
    ov.addEventListener('click', leave);
  });
}

// ── Quick wins: a what-if on three actions ───────────────────
// Two figures first, today and within reach; then the bar: today in solid
// ink, each ticked action's gain hatched after it and labelled "+6"
// underneath; then the actions themselves, as rows you tick on and off.
// Every combination (eight at most) is computed here and handed to the page,
// which moves between them without redrawing (see mountQuickWins). Nothing
// is saved: the selection lives for the visit, one per device.

const unticked = { mobile: new Set(), desktop: new Set() };

// Gains as shown: steps between the rounded scores, so 72 → 86 reads
// +6 +6 +2; under a point, the estimate itself (≈ +0.6).
function gainsOf(steps) {
  return steps.slice(1).map((s, i) => { const d = round(s) - round(steps[i]); return d >= 1 ? d : shown(s - steps[i]); });
}

// The bar's window, in tens around the full plan and its marks: it stays put
// when actions are unticked.
function scaleOf(steps, marks, width) {
  const vals = [...steps, ...marks.map(x => x[0])];
  const lo = Math.max(0, Math.floor((Math.min(...vals) - 6) / 10) * 10);
  const hi = Math.min(100, Math.ceil((Math.max(...vals) + 6) / 10) * 10);
  return { width, pos: v => ((v - lo) / (hi - lo)) * 100, px: v => ((v - lo) / (hi - lo)) * width };
}

// One combination of ticked actions (bit i = action i): the summary, the
// bar's geometry, and each action's gain — for an unticked one, what it
// would add to the ticked ones.
function scenario({ m, set, table, r, target }, top, mask, sc) {
  const on = i => ((mask >> i) & 1) === 1;
  const chosen = top.filter((_, i) => on(i));
  const steps = [r.you.score, ...chosen.map((_, k) => scoreWithFixes(m, set, chosen.slice(0, k + 1)))];
  const gains = gainsOf(steps);
  const final = steps[steps.length - 1];
  const finalRank = withScore(table, final).find(c => c.you).rank;
  let k = 0, at = r.you.score, right = -Infinity;
  const segs = [], labels = [];
  top.forEach((_, i) => {
    if (!on(i)) { segs.push({ left: sc.pos(at), width: 0 }); labels.push(null); return; }
    const a = steps[k], b = steps[k + 1], text = `+${fmt.number(gains[k], 1)}`, last = k === chosen.length - 1;
    segs.push({ left: sc.pos(a), width: sc.pos(b) - sc.pos(a) });
    // Labelled under its segment when the segment can hold it; the last one may
    // start at its segment and run past it. One that would touch the previous
    // label is left to its row.
    const w = text.length * 8, mid = sc.px((a + b) / 2);
    if (sc.px(b) - sc.px(a) >= w + 8 && mid - w / 2 > right + 6) { right = mid + w / 2; labels.push({ text, left: sc.pos((a + b) / 2) }); }
    else if (last && sc.px(a) + 2 > right + 6 && sc.px(a) + w < sc.width) labels.push({ text, left: sc.pos(a), start: true });
    else labels.push(null);
    at = b; k++;
  });
  const each = top.map((f, i) => {
    if (on(i)) return gains[chosen.indexOf(f)];
    const withIt = scoreWithFixes(m, set, top.filter((_, j) => on(j) || j === i));
    const d = round(withIt) - round(final);
    return d >= 1 ? d : shown(withIt - final);
  });
  const n = chosen.length, from = round(r.you.score);
  // Under the arrival figure, where it puts you; "up" when that is a place
  // won (or, alone, the threshold passed).
  const tie = r.mode === 'chase' && finalRank >= r.you.rank && Math.abs(r.other.score - final) < TIE_PTS;
  const up = !!n && (r.mode === 'solo' ? below(r.you.score, target) && !below(final, target) : finalRank < r.you.rank);
  const d = round(final) - from, gain = d >= 1 ? d : shown(final - r.you.score);
  return {
    n, final: round(final), segs, labels, up,
    sub: n ? standing(r, finalRank, final, target, tie) : '',
    delta: n ? `+${fmt.number(gain, 1)}\u00a0${unit(gain)}` : '',
    on: top.map((_, i) => on(i)),
    gains: each.map(pts),
    with: n ? t('gauge.with', { n }) : t('gauge.none'),
    aria: n ? t('gauge.aria', { n, from, to: round(final) }) : t('gauge.ariaNone', { from }),
  };
}

// Where a score puts you, said under its figure: "3e place", "en tête",
// "à égalité avec Lumen & Co", or, without competitors, against the threshold.
function standing(r, rank, score, target, tie) {
  if (r.mode === 'solo') return below(score, target) ? t('qw.below', { p: withUnit(target - round(score)) }) : t('qw.above');
  if (tie) return t('gauge.tie', { name: r.other.name });
  return rank === 1 ? t('rank.lead') : t('rank.place', { n: rank });
}

const pct = v => `${Math.round(v * 100) / 100}%`;
const labelHtml = (l, i) => `<span class="glabel${l?.start ? ' glabel--start' : ''}" data-label="${i}" style="left:${l ? pct(l.left) : '0%'}"${l ? '' : ' hidden'}>${l ? esc(l.text) : ''}</span>`;

function gauge({ r, top, target, sc, s }) {
  const marks = [[target, t('chart.target', { v: target })]];
  if (r.mode === 'chase') marks.push([r.other.score, `${r.other.name} ${round(r.other.score)}`]);
  // Rival and target at the same place read as one label.
  const merged = marks.length === 2 && Math.abs(marks[0][0] - marks[1][0]) < 1.5
    ? [[marks[0][0], `${r.other.name} · ${marks[0][1]}`]] : marks;
  // Before → after: two large figures, each with where it puts you, joined
  // by an arrow that carries the gain.
  return `<div class="qwb${s.n ? '' : ' is-empty'}" aria-live="polite">
      <div class="qwb-fig"><small>${esc(t('gauge.today'))}</small><b>${round(r.you.score)}</b><span class="qwb-sub">${esc(standing(r, r.you.rank, r.you.score, target, false))}</span></div>
      <div class="qwb-arrow" aria-hidden="true"><span class="qwb-delta" data-g="delta">${esc(s.delta)}</span></div>
      <div class="qwb-fig qwb-fig--to${s.up ? ' is-up' : ''}"><small data-g="with">${esc(s.with)}</small><b data-g="final" data-v="${s.final}">≈ ${s.final}</b><span class="qwb-sub" data-g="sub">${esc(s.sub)}</span></div>
    </div>
    <div class="gauge" role="img" data-g="aria" aria-label="${esc(s.aria)}">
      <div class="gtrack">
        <span class="gnow" style="width:${pct(sc.pos(r.you.score))}"></span>
        ${top.map((f, i) => `<span class="gseg" data-seg="${i}" title="${esc(auditTitle(f.id))}" style="left:${pct(s.segs[i].left)};width:${pct(s.segs[i].width)}"></span>`).join('')}
        ${merged.map(([v, label], i) => {
          // A label at the very edge is anchored inward, so it stays in the card.
          const at = sc.pos(v) / 100;
          const edge = at > 0.85 ? ' gmark--end' : at < 0.15 ? ' gmark--start' : '';
          return `<span class="gmark${i ? ' gmark--low' : ''}${edge}" style="left:${pct(sc.pos(v))}"><em>${esc(label)}</em></span>`;
        }).join('')}
      </div>
      <div class="glabels" aria-hidden="true">${s.labels.map(labelHtml).join('')}</div>
    </div>`;
}

// One action: a round tick, its title and effort, its gain; "›" opens its sheet.
function qwRow(fix, i, s) {
  const title = auditTitle(fix.id);
  return `<li class="qw-row">
      <button type="button" class="qw-toggle" data-qw="${i}" aria-pressed="${s.on[i]}">
        <span class="qw-check" aria-hidden="true"></span>
        <span class="qw-text"><span class="qw-title">${esc(title)}</span><span class="qw-effort">${esc(t(`effort.${fix.effort}`))}</span></span>
        <span class="qw-gain" data-gain="${i}">${esc(s.gains[i])}</span>
      </button>
      <a class="qw-more" href="#/fix/${encodeURIComponent(fix.id)}" aria-label="${esc(t('qw.more', { title }))}">›</a>
    </li>`;
}

function quickWins(ctx) {
  const { m, set, table, r, plan, target, layout, device } = ctx;
  const top = plan.slice(0, 3);
  if (!top.length) return '';
  const steps = [r.you.score, ...top.map((_, i) => scoreWithFixes(m, set, top.slice(0, i + 1)))];
  // The title promises only what the full plan reaches: a place, the target, or less.
  const final = steps[steps.length - 1];
  const finalRank = withScore(table, final).find(c => c.you).rank;
  const title = r.mode === 'defend' && !below(r.you.score, target) ? t('qw.title.defend')
    : finalRank < r.you.rank ? t('qw.title.chase', { ord: ord(finalRank) })
    : !below(r.you.score, target) ? t('qw.title.soloMet')
    : !below(final, target) ? t('qw.title.solo', { v: target })
    : t('qw.title.closer');
  const marks = [[target], ...(r.mode === 'chase' ? [[r.other.score]] : [])];
  const sc = scaleOf(steps, marks, layout.hero);
  const scenarios = Array.from({ length: 1 << top.length }, (_, mask) => scenario(ctx, top, mask, sc));
  const mask = top.reduce((acc, f, i) => (unticked[device].has(f.id) ? acc : acc | (1 << i)), 0);
  const s = scenarios[mask];
  return `<section class="section" aria-labelledby="qw-title">
    ${head('qw-title', title)}
    <div class="card gauge-card reveal" style="--i:3" data-qw-card data-device="${device}" data-mask="${mask}" data-ids="${esc(JSON.stringify(top.map(f => f.id)))}" data-scenarios="${esc(JSON.stringify(scenarios))}">
      ${gauge({ r, top, target, sc, s })}
      <p class="qw-hint">${esc(t('qw.hint'))}</p>
      <ul class="qw-list">${top.map((f, i) => qwRow(f, i, s)).join('')}</ul>
    </div>
  </section>`;
}

// Ticking an action moves the bar, the labels, the gains and the figures to
// that combination; the arrival figure counts to its new value.
function mountQuickWins(root) {
  const card = root.querySelector('[data-qw-card]');
  if (!card) return;
  const scenarios = JSON.parse(card.dataset.scenarios);
  const ids = JSON.parse(card.dataset.ids);
  const off = unticked[card.dataset.device];
  let mask = Number(card.dataset.mask);
  const $ = sel => card.querySelector(sel);
  card.addEventListener('click', e => {
    const btn = e.target.closest('[data-qw]');
    if (!btn) return;
    const i = Number(btn.dataset.qw);
    mask ^= 1 << i;
    if ((mask >> i) & 1) off.delete(ids[i]); else off.add(ids[i]);
    const s = scenarios[mask];
    s.segs.forEach((g, k) => { const el = $(`[data-seg="${k}"]`); el.style.left = pct(g.left); el.style.width = pct(g.width); });
    s.labels.forEach((l, k) => {
      const el = $(`[data-label="${k}"]`);
      el.hidden = !l;
      if (!l) return;
      el.textContent = l.text;
      el.style.left = pct(l.left);
      el.classList.toggle('glabel--start', !!l.start);
    });
    card.querySelectorAll('[data-qw]').forEach((b, k) => b.setAttribute('aria-pressed', String(s.on[k])));
    card.querySelectorAll('[data-gain]').forEach((g, k) => { g.textContent = s.gains[k]; });
    $('[data-g="with"]').textContent = s.with;
    $('[data-g="sub"]').textContent = s.sub;
    $('[data-g="delta"]').textContent = s.delta;
    $('.qwb').classList.toggle('is-empty', !s.n);
    $('.qwb-fig--to').classList.toggle('is-up', s.up);
    $('[data-g="aria"]').setAttribute('aria-label', s.aria);
    countTo($('[data-g="final"]'), s.final);
  });
}

// A figure counts to its new value instead of jumping.
function countTo(el, to) {
  const from = Number(el.dataset.v);
  el.dataset.v = to;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (still || from === to) { el.textContent = `≈ ${to}`; return; }
  const t0 = performance.now(), dur = 450;
  const step = now => {
    const k = Math.min(1, (now - t0) / dur), e = 1 - (1 - k) ** 3;
    el.textContent = `≈ ${Math.round(from + (to - from) * e)}`;
    if (k < 1 && Number(el.dataset.v) === to) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ── Your pages: one bar each, worst first, unmeasured last ───

// Only when you compare chosen pages: for the whole site (or a single page),
// one bar would repeat the score already in the standings.
function pagesBars({ project, m, target }) {
  if (project.scope === 'site' || project.pages.length < 2) return '';
  const measured = [], missing = [];
  for (const page of project.pages) {
    const score = m.pages?.[page.id]?.lab?.score;
    (finite(score) ? measured : missing).push({ page, score });
  }
  const rows = measured
    .sort((a, b) => a.score - b.score)
    .map(({ page, score }) => {
      const alert = below(score, target);
      return `<a class="brow brow--link" href="#/page/${encodeURIComponent(page.id)}">
        <span class="bname">${esc(pick(page.name))}</span>
        ${track(score, 'you')}
        ${value(score, target, alert)}
      </a>`;
    }).join('');
  return `<section class="section reveal" style="--i:8" aria-labelledby="pages-title">
    ${head('pages-title', t('section.pages'))}
    <div class="card bars bars--pages" style="--target:${target}%">
      <div class="bars-head" aria-hidden="true"><span class="target-tag"><span>${esc(t('chart.target', { v: target }))}</span></span></div>
      ${rows}${missing.map(({ page }) => naRow(pick(page.name), t('board.failed'), false)).join('')}
    </div>
  </section>`;
}
