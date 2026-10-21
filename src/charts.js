// Self-explanatory SVG: your PageSpeed curve against your competitors', with
// the target and every line labelled where it ends. No legend, no bands — the
// only colour is your own end point, in orange when it sits below target.

import { esc } from './html.js';

const registry = new Map();
let uid = 0;
const r1 = n => Math.round(n * 10) / 10;
const finite = Number.isFinite;
// Average glyph width (px) of the end labels: 11 px regular, 13 px semibold for "you".
const GLYPH = { other: 5.8, you: 7.4 };
const fitName = (name, room) => (name.length <= room ? name : `${name.slice(0, Math.max(1, room - 1)).trimEnd()}…`);
const lastIndex = values => { for (let i = values.length - 1; i >= 0; i--) if (finite(values[i])) return i; return -1; };

export const ICONS = {
  gear: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg>',
};

// ── Evolution: your curve against theirs ───────────────────────
// A missing week (null) leaves a gap in its line; a curve needs two dates.

// endValues: false when the scores already sit next to the chart (standings):
// lines then end on names only, so every number is said once.
// fmtRaw: a series may carry raw values (s.raw, e.g. 2400 ms) beside the
// plotted ones (a score on 100): the tooltip then tells the raw value.
// Points sit at their dates: analyses don't come at regular intervals.
export function raceChart({ series, times, target, targetLabel, width = 900, label, fmtValue, fmtMonth, fmtDay, fmtWindow, endValues = true, fmtRaw }) {
  const id = `chart-${++uid}`;
  const narrow = width < 520;
  const W = width, H = narrow ? 240 : 290;
  const M = { t: 24, r: endValues ? (narrow ? 100 : 150) : (narrow ? 90 : 120), b: 28, l: 30 };
  const iw = W - M.l - M.r, ih = H - M.t - M.b;
  const last = times.length - 1;
  if (last < 1) return '';
  series = series.filter(s => lastIndex(s.values) >= 0);
  const all = series.flatMap(s => s.values).filter(finite);
  const min = Math.max(0, Math.floor((Math.min(target, ...all) - 8) / 10) * 10);
  const max = 100;
  const xOf = t => M.l + ((+t - +times[0]) / (+times[last] - +times[0] || 1)) * iw;
  const x = i => xOf(times[i]);
  const y = v => M.t + ih - ((Math.max(min, Math.min(max, v)) - min) / (max - min)) * ih;

  // A light grid every 20 points; the target line is the only emphasised rule.
  const grid = [];
  for (let v = Math.ceil(min / 20) * 20; v <= max; v += 20) {
    grid.push(`<line class="grid" x1="${M.l}" x2="${M.l + iw}" y1="${r1(y(v))}" y2="${r1(y(v))}"/>
      <text x="${M.l - 8}" y="${r1(y(v)) + 4}" text-anchor="end">${v}</text>`);
  }
  const targetLine = `<line class="target" x1="${M.l}" x2="${M.l + iw}" y1="${r1(y(target))}" y2="${r1(y(target))}"/>`;

  const months = [];
  const d = new Date(times[0]); d.setDate(1); d.setMonth(d.getMonth() + 1);
  for (; +d <= +times[last]; d.setMonth(d.getMonth() + 1)) months.push(new Date(d));
  const every = Math.ceil(months.length / (narrow ? 3 : 6));
  // Under six weeks, months say little: the first and last dates instead.
  const short = +times[last] - +times[0] < 42 * 864e5 && fmtDay;
  const xTicks = short
    ? `<text x="${r1(x(0))}" y="${H - 6}" text-anchor="start">${esc(fmtDay(times[0]))}</text><text x="${r1(x(last))}" y="${H - 6}" text-anchor="end">${esc(fmtDay(times[last]))}</text>`
    : months.filter((_, i) => i % every === 0)
      .map(m => `<text x="${r1(xOf(m))}" y="${H - 6}" text-anchor="middle">${esc(fmtMonth(m))}</text>`).join('');

  // End labels — every line and the target — sorted by height, pushed apart
  // when they would touch, with a short leader when a label had to move.
  const GAP = 17;
  const ends = [
    ...series.map(s => {
      const v = s.values[lastIndex(s.values)], kind = s.you ? 'you' : 'other';
      // The label may use the right margin and a little of the card's padding.
      const value = endValues ? fmtValue(v) : '';
      const room = Math.floor((M.r - 14 + 12) / GLYPH[kind]) - (value ? value.length + 2 : 0);
      const name = fitName(s.name, room);
      return { kind, focus: s.focus, text: value ? `${name}  ${value}` : name, full: name === s.name ? '' : s.name, y0: y(v) };
    }),
    { kind: 'target', text: targetLabel, y0: y(target) },
  ].sort((a, b) => a.y0 - b.y0);
  ends.forEach((e, i) => { e.y = Math.max(e.y0, i ? ends[i - 1].y + GAP : -Infinity); });
  for (let i = ends.length - 1; i >= 0; i--) {
    const limit = i === ends.length - 1 ? M.t + ih + 6 : ends[i + 1].y - GAP;
    if (ends[i].y > limit) ends[i].y = limit;
  }
  const lx = x(last);
  const endLabels = ends.map(e => `${Math.abs(e.y - e.y0) > 2 ? `<path class="leader" d="M${r1(lx + 6)} ${r1(e.y0)} L${r1(lx + 11)} ${r1(e.y - 4)}"/>` : ''}
    <text class="end-${e.kind}${e.focus ? ' end-focus' : ''}" x="${r1(lx + 14)}" y="${r1(e.y)}">${e.full ? `<title>${esc(e.full)}</title>` : ''}${esc(e.text)}</text>`).join('');

  // Competitors first so "you" sits on top.
  const ordered = [...series].sort((a, b) => Number(!!a.you) - Number(!!b.you));
  const path = values => values.map((v, i) => (finite(v) ? `${finite(values[i - 1]) ? 'L' : 'M'}${r1(x(i))} ${r1(y(v))}` : '')).join('');
  // A week measured between two gaps has no segment to draw: it gets a dot.
  const lone = s => s.values.map((v, i) => (finite(v) && !finite(s.values[i - 1]) && !finite(s.values[i + 1]) && i !== lastIndex(s.values)
    ? `<circle class="lone${s.you ? ' lone--you' : ''}" cx="${r1(x(i))}" cy="${r1(y(v))}" r="${s.you ? 3 : 2.5}"/>` : '')).join('');
  // The line to beat stands out (focus), the others step back (faint).
  const tone = s => (s.focus ? ' race--focus' : s.faint ? ' race--faint' : '');
  const lines = ordered.map(s => { const k = lastIndex(s.values); return `<path class="race ${s.you ? 'race--you' : 'race--other'}${tone(s)} draw" pathLength="1" d="${path(s.values)}"/>${lone(s)}
    <circle class="end-dot${s.you ? '' : ' end-dot--other'}${tone(s)}${s.alert ? ' is-alert' : ''}" cx="${r1(x(k))}" cy="${r1(y(s.values[k]))}" r="${s.you ? 5 : 3.5}"/>`; }).join('');

  registry.set(id, { kind: 'race', xs: times.map((_, i) => x(i)), ys: y, mid: (min + max) / 2, times, series, fmtValue, fmtWindow, fmtRaw });

  return `<svg id="${id}" class="chart" data-chart="race" viewBox="0 0 ${W} ${H}" role="img" tabindex="0" aria-label="${esc(label)}">
    ${grid.join('')}${xTicks}${targetLine}${lines}${endLabels}
    <g class="hover">
      <line class="xhair" x1="0" x2="0" y1="${M.t}" y2="${M.t + ih}"/>
      <circle class="hdot" cx="0" cy="0" r="5"/>
    </g>
    <rect class="hit" x="${M.l}" y="${M.t - 8}" width="${iw}" height="${ih + 16}"/>
  </svg>`;
}

// ── Interaction ────────────────────────────────────────────────

const tip = () => document.getElementById('tooltip');

function showTip(rows, clientX, clientY) {
  const el = tip();
  el.replaceChildren();
  for (const [cls, text] of rows) {
    if (!text) continue;
    const span = document.createElement('span');
    span.className = cls;
    span.textContent = text;
    el.append(span);
  }
  el.hidden = false;
  const pad = 14, r = el.getBoundingClientRect();
  let left = clientX + pad, top = clientY - r.height - pad;
  if (left + r.width > innerWidth - 8) left = clientX - r.width - pad;
  if (top < 8) top = clientY + pad;
  el.style.left = `${Math.max(8, left)}px`;
  el.style.top = `${Math.min(innerHeight - r.height - 8, top)}px`;
}
function hideTip() { const el = tip(); if (el) el.hidden = true; }

function svgPoint(svg, x, y, toScreen) {
  const pt = svg.createSVGPoint();
  pt.x = x; pt.y = y;
  const m = svg.getScreenCTM();
  return pt.matrixTransform(toScreen ? m : m.inverse());
}

function bindRace(svg, model) {
  const line = svg.querySelector('.xhair');
  const dot = svg.querySelector('.hdot');
  const you = model.series.find(s => s.you);
  let idx = model.xs.length - 1;
  const show = (i, cx, cy) => {
    idx = Math.max(0, Math.min(model.xs.length - 1, i));
    const v = you.values[idx], known = finite(v);
    const px = model.xs[idx], py = known ? model.ys(v) : model.ys(model.mid);
    line.setAttribute('x1', px); line.setAttribute('x2', px);
    dot.setAttribute('cx', px); dot.setAttribute('cy', py);
    dot.style.visibility = known ? '' : 'hidden';
    svg.classList.add('is-active');
    const tell = (s, i) => (s.raw && model.fmtRaw ? model.fmtRaw(s.raw[i]) : model.fmtValue(s.values[i]));
    const others = model.series.filter(s => !s.you && finite(s.values[idx])).sort((a, b) => b.values[idx] - a.values[idx])
      .map(s => `${s.name} ${tell(s, idx)}`).join(' · ');
    const at = cx == null ? svgPoint(svg, px, py, true) : { x: cx, y: cy };
    showTip([
      ['tt-value', `${you.name} · ${known ? tell(you, idx) : '—'}`],
      ['tt-label', model.fmtWindow(model.times[idx])],
      ['tt-extra', others],
    ], at.x, at.y);
  };
  const nearest = sx => model.xs.reduce((best, px, i) => (Math.abs(px - sx) < Math.abs(model.xs[best] - sx) ? i : best), 0);
  const leave = () => { svg.classList.remove('is-active'); hideTip(); };
  svg.addEventListener('pointermove', e => show(nearest(svgPoint(svg, e.clientX, 0).x), e.clientX, e.clientY));
  svg.addEventListener('pointerleave', leave);
  svg.addEventListener('focus', () => show(idx));
  svg.addEventListener('blur', leave);
  svg.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); show(idx + (e.key === 'ArrowRight' ? 1 : -1)); }
    else if (e.key === 'Escape') leave();
  });
}

// Scrolling moves the chart away from a still pointer: drop the hover state.
let scrollBound = false;
function leaveAll() {
  document.querySelectorAll('.chart.is-active').forEach(svg => svg.classList.remove('is-active'));
  hideTip();
}

export function hydrateCharts(root) {
  if (!scrollBound) { addEventListener('scroll', leaveAll, { passive: true }); scrollBound = true; }
  root.querySelectorAll('svg[data-chart]').forEach(svg => {
    const m = registry.get(svg.id);
    if (m?.kind === 'race') bindRace(svg, m);
  });
}

export function resetCharts() { registry.clear(); hideTip(); }
