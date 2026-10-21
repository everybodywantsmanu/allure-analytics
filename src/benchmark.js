// Where you stand against competitors, and what it takes to move up.
//
// Position: Google's PageSpeed score, compared like for like — only on the
// pages measured both for you and for every measured competitor (e.g. home,
// product, cart). Each site's score is the mean over those pages; standings
// rank on it, ties broken by real-visitor LCP. Everything tolerates missing
// data: a failed measurement drops a site or a page, it never breaks the view.

import { METRICS, pageSpeedScore, labPoints, LH_WEIGHTS } from './metrics.js';

// Below this gap, two PageSpeed scores are a tie: lab runs vary by a few points.
export const TIE_PTS = 2;

const finite = Number.isFinite;
const mean = xs => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
const yourLab = (m, pageId) => m.pages?.[pageId]?.lab;
const theirLab = (m, compId, pageId) => m.competitors?.[compId]?.pages?.[pageId]?.lab;

// Who can be compared, on which pages.
//   set       the pages measured for you and for every compared competitor
//   table     the standings on that set (empty when none of your pages is measured)
//   excluded  competitors left out: measurement failed, or no page in common
// When no page is common to everyone, the competitor sharing the fewest pages
// with you is set aside until a common set exists.
export function position(project, m) {
  const mine = project.pages.filter(p => finite(yourLab(m, p.id)?.score));
  const theirs = c => mine.filter(p => finite(theirLab(m, c.id, p.id)?.score));
  const excluded = [];
  let comps = [];
  for (const c of project.competitors) {
    if (!project.pages.some(p => finite(theirLab(m, c.id, p.id)?.score))) excluded.push({ ...c, reason: 'failed' });
    else comps.push(c);
  }
  const common = () => mine.filter(p => comps.every(c => theirs(c).includes(p)));
  while (comps.length && mine.length && !common().length) {
    const drop = [...comps].sort((a, b) => theirs(a).length - theirs(b).length)[0];
    comps = comps.filter(c => c !== drop);
    excluded.push({ ...drop, reason: 'nopages' });
  }
  const set = common();
  if (!set.length) return { set, table: [], excluded };
  const table = standings([
    { id: 'you', you: true, name: project.name, field: m.origin?.field ?? {}, score: mean(set.map(p => yourLab(m, p.id).score)) },
    ...comps.map(c => ({ id: c.id, name: c.name, field: m.competitors[c.id].field ?? {}, score: mean(set.map(p => theirLab(m, c.id, p.id).score)) })),
  ]);
  return { set, table, excluded: project.competitors.flatMap(c => excluded.filter(x => x.id === c.id)) };
}

// Missing values sort last instead of poisoning the comparison.
const byValue = (a, b) => (a ?? Infinity) - (b ?? Infinity) || 0;

export function standings(list) {
  const ranks = Object.fromEntries(list.map(c => [c.id, {}]));
  for (const metric of METRICS) {
    [...list].filter(c => finite(c.field?.[metric]))
      .sort((a, b) => a.field[metric] - b.field[metric])
      .forEach((c, i) => { ranks[c.id][metric] = i + 1; });
  }
  return list
    .map(c => ({ ...c, ranks: ranks[c.id] }))
    .sort((a, b) => b.score - a.score || byValue(a.field?.lcp, b.field?.lcp))
    .map((c, i) => ({ ...c, rank: i + 1 }));
}

// Who to measure yourself against: the site just above you, or — when you
// lead — the one right behind. Alone, you measure yourself against the target.
export function rival(table) {
  const you = table.find(c => c.you);
  if (!you || table.length < 2) return { you, other: null, mode: 'solo' };
  const mode = you.rank > 1 ? 'chase' : 'defend';
  const other = table.find(c => c.rank === (mode === 'chase' ? you.rank - 1 : 2));
  return { you, other, mode, tie: Math.abs(other.score - you.score) < TIE_PTS };
}

// Per real-visitor metric: positive delta = you are behind; null when unknown.
export function gaps(you, other) {
  return METRICS.map(metric => {
    const a = you.field?.[metric], b = other?.field?.[metric];
    return { metric, delta: finite(a) && finite(b) ? a - b : null };
  });
}

// Your PageSpeed score on the compared pages if these fixes shipped.
// Lighthouse's savings overlap, so they are not added up: each one removes
// its share of the original value, applied in turn, and LCP can never end
// before the first paint (LCP ≥ FCP). "inp" savings are Total Blocking Time.
export function scoreWithFixes(m, pages, fixes) {
  const original = Object.fromEntries(pages.map(p => [p.id, yourLab(m, p.id)]));
  const labs = Object.fromEntries(pages.map(p => [p.id, { ...original[p.id] }]));
  const cut = (lab, key, saving, from) => { if (saving && from > 0) lab[key] *= Math.max(0, 1 - saving / from); };
  for (const fix of fixes) {
    for (const { page, savings } of fix.pages) {
      const lab = labs[page.id];
      if (!lab) continue;
      cut(lab, 'lcp', savings.lcp, original[page.id].lcp);
      cut(lab, 'tbt', savings.inp, original[page.id].tbt);
      cut(lab, 'cls', savings.cls, original[page.id].cls);
      lab.lcp = Math.max(lab.lcp, lab.fcp);
    }
  }
  return mean(pages.map(p => pageSpeedScore(labs[p.id], m.device)));
}

export function withScore(table, score) {
  return standings(table.map(({ ranks, rank, ...c }) => (c.you ? { ...c, score } : c)));
}

// Site curves for today's standings, rebuilt each week from the page
// histories on the compared pages — the same like-for-like rule as today.
// Series are aligned on the measurement dates: a shorter one (a competitor
// added later) is padded at the start, and a week missing any compared page
// is null — never a zero.
export function alignedLab(hist, ids, pages) {
  const times = hist?.lab?.times ?? [];
  const pad = values => {
    const v = times.length ? (values ?? []).slice(-times.length) : [];
    return [...Array(times.length - v.length).fill(null), ...v.map(x => (finite(x) ? x : null))];
  };
  const site = byPage => {
    const cols = pages.map(p => pad(byPage?.[p.id]));
    return times.map((_, i) => (cols.every(c => finite(c[i])) ? mean(cols.map(c => c[i])) : null));
  };
  return {
    kind: hist?.lab?.kind ?? 'weeks',
    times,
    you: site(hist?.lab?.you),
    competitors: Object.fromEntries(ids.filter(id => hist?.lab?.competitors?.[id]).map(id => [id, site(hist.lab.competitors[id])])),
  };
}

// Ranks at each point (a week in the demo, an analysis on real data),
// computed on a rolling mean of 3 points so lab noise doesn't make you
// "gain" or "lose" a place from one point to the next. The first
// weeks of a series use its first three, so the starting point is smoothed too.
export function rankHistory(lab) {
  const smooth = values => {
    const f = values.findIndex(finite);
    return values.map((_, i) => (f < 0 || i < f ? null : mean(values.slice(Math.max(f, i - 2), Math.max(i, f + 2) + 1).filter(finite))));
  };
  const you = smooth(lab.you);
  const comps = Object.fromEntries(Object.entries(lab.competitors).map(([id, v]) => [id, smooth(v)]));
  return lab.times.map((t, i) => {
    if (!finite(you[i])) return { t, ranks: {}, scores: {} };
    const list = [
      { id: 'you', you: true, score: you[i] },
      ...Object.entries(comps).filter(([, v]) => finite(v[i])).map(([id, v]) => ({ id, score: v[i] })),
    ].sort((a, b) => b.score - a.score);
    return { t, ranks: Object.fromEntries(list.map((c, k) => [c.id, k + 1])), scores: Object.fromEntries(list.map(c => [c.id, c.score])) };
  });
}

// What moved since the previous analysis, on the same compared pages only:
// the places won or lost (against sites in both standings, never on a tie),
// and every site's score then, for the standings' change column.
export function sinceLast(table, set, prev) {
  if (!prev?.scores || !finite(prev.scores.you)) return null;
  if (prev.set && prev.set.join() !== set.map(p => p.id).join()) return null;
  const you = table.find(c => c.you);
  const known = table.filter(c => !c.you && finite(prev.scores[c.id]));
  const passed = known.filter(c => prev.ranks[c.id] < prev.ranks.you && c.rank > you.rank && you.score - c.score >= TIE_PTS);
  const lost = known.filter(c => prev.ranks[c.id] > prev.ranks.you && c.rank < you.rank && c.score - you.score >= TIE_PTS);
  return { ts: prev.ts, passed, lost, ranks: prev.ranks, scores: prev.scores };
}

// Where a site's points come from, on the compared pages: for each lab metric,
// the points it brings out of its weight (10, 10, 25, 30, 25), averaged over
// the pages, so they add up to the site's score. null when a page is missing.
export function scorePoints(m, pages, siteId) {
  const labs = pages.map(p => (siteId === 'you' ? yourLab(m, p.id) : theirLab(m, siteId, p.id)));
  if (!pages.length || !labs.every(l => finite(l?.score))) return null;
  const pts = labs.map(l => labPoints(l, m.device));
  return Object.fromEntries(Object.keys(LH_WEIGHTS).map(k => [k, mean(pts.map(p => p[k]))]));
}

// Real-visitor weekly history for one metric, every site on the same CrUX
// periods: a site missing a week, or starting later, gets a gap there.
export function fieldHistory(hist, metric, ids) {
  const rowsOf = id => (id === 'you' ? hist?.origin : hist?.competitors?.[id]) ?? [];
  const key = d => new Date(d).toDateString();
  const dates = new Map();
  for (const id of ids) for (const r of rowsOf(id)) dates.set(key(r.end), new Date(r.end));
  const times = [...dates.values()].sort((a, b) => a - b);
  const series = Object.fromEntries(ids.map(id => {
    const byDate = new Map(rowsOf(id).map(r => [key(r.end), r[metric]]));
    return [id, times.map(t => { const v = byDate.get(key(t)); return finite(v) ? v : null; })];
  }));
  return { times, series };
}
