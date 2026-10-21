// The demo project: a fictional fashion shop on reserved `.example` domains.
// Everything is generated relative to "now" so the demo never looks stale,
// and seeded so it reads the same on every visit.
//
// The data has the same shape a real analysis will produce, so every view
// and the prioritisation run on it unchanged.

import { pageSpeedScore, THRESHOLDS } from './metrics.js';
import { position, alignedLab, rankHistory } from './benchmark.js';

const WEEKS = 26;
const DAY = 864e5;

function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A weekly series drifting from `from` to `to`, with step changes that ramp in
// over a few weeks (CrUX is a 28-day rolling window) and a little noise.
// The last point is pinned to `to` so history and "today" always agree.
function series({ from, to, steps = [], noise, seed, digits = 0 }) {
  const rand = mulberry32(seed);
  const stepTotal = steps.reduce((s, x) => s + x.delta, 0);
  const base0 = from, base1 = to - stepTotal;
  const out = [];
  for (let i = 0; i < WEEKS; i++) {
    let v = base0 + (base1 - base0) * (i / (WEEKS - 1));
    for (const s of steps) {
      if (i >= s.week) v += s.delta * Math.min(1, (i - s.week + 1) / (s.ramp ?? 4));
    }
    v += (rand() - 0.5) * 2 * noise;
    out.push(v);
  }
  out[WEEKS - 1] = to;
  const k = 10 ** digits;
  return out.map(v => Math.round(Math.max(0, v) * k) / k);
}

const SHIP_WEEK = 19;   // "Load the video on click" shipped ~6 weeks ago
const CHAT_WEEK = 15;   // a chat widget was added ~10 weeks ago
const PHOTO_WEEK = 12;  // heavier product photography ~14 weeks ago

// Field values: [lcp from→to, inp from→to, cls from→to] plus story steps.
const FIELD = {
  mobile: {
    origin:     { lcp: [3850, 3400, [{ week: PHOTO_WEEK, delta: 250 }, { week: SHIP_WEEK, delta: -650 }]], inp: [222, 260, [{ week: CHAT_WEEK, delta: 45 }]], cls: [0.11, 0.09] },
    home:       { lcp: [3600, 2900, [{ week: SHIP_WEEK, delta: -620 }]], inp: [190, 180], cls: [0.05, 0.04] },
    collection: { lcp: [3480, 3600], inp: [228, 240], cls: [0.17, 0.18] },
    product:    { lcp: [3820, 4600, [{ week: PHOTO_WEEK, delta: 700, ramp: 3 }]], inp: [198, 210], cls: [0.02, 0.02] },
    cart:       { lcp: [2200, 2100], inp: [300, 520, [{ week: CHAT_WEEK, delta: 200 }]], cls: [0.06, 0.06] },
    journal:    { lcp: [2300, 2200], inp: [128, 120], cls: [0.03, 0.03] },
  },
  desktop: {
    origin:     { lcp: [2650, 2200, [{ week: PHOTO_WEEK, delta: 180 }, { week: SHIP_WEEK, delta: -500 }]], inp: [124, 130, [{ week: CHAT_WEEK, delta: 8 }]], cls: [0.08, 0.07] },
    home:       { lcp: [2400, 1800, [{ week: SHIP_WEEK, delta: -520 }]], inp: [92, 90], cls: [0.03, 0.03] },
    collection: { lcp: [2350, 2400], inp: [116, 120], cls: [0.13, 0.14] },
    product:    { lcp: [2250, 2700, [{ week: PHOTO_WEEK, delta: 420, ramp: 3 }]], inp: [104, 110], cls: [0.02, 0.02] },
    cart:       { lcp: [1550, 1500], inp: [120, 180, [{ week: CHAT_WEEK, delta: 55 }]], cls: [0.04, 0.04] },
    journal:    { lcp: [1450, 1400], inp: [72, 70], cls: [0.02, 0.02] },
  },
};

const NOISE = { lcp: 55, inp: 7, cls: 0.004 };
const DIGITS = { lcp: 0, inp: 0, cls: 3 };

// Lighthouse findings per page, with savings as Lighthouse reports them in the
// lab (mobile; desktop is scaled down). "inp" savings are Total Blocking Time,
// Lighthouse's lab stand-in for responsiveness.
const AUDITS = {
  product: [
    { id: 'image-delivery-insight', savings: { lcp: 3600 }, detail: { n: 6, kb: 2100 } },
    { id: 'lcp-discovery-insight', savings: { lcp: 1200 } },
    { id: 'document-latency-insight', savings: { lcp: 900 }, detail: { ms: 780 } },
    { id: 'third-parties-insight', savings: { inp: 250 }, detail: { name: { fr: 'module de chat', en: 'chat widget' } } },
    { id: 'unused-javascript', savings: { inp: 150 }, detail: { kb: 310 } },
    { id: 'render-blocking-insight', savings: { lcp: 500 } },
  ],
  collection: [
    { id: 'cls-culprits-insight', savings: { cls: 0.12 }, detail: { el: { fr: 'la bannière de la collection', en: 'the collection banner' } } },
    { id: 'image-delivery-insight', savings: { lcp: 2200 }, detail: { n: 12, kb: 1300 } },
    { id: 'document-latency-insight', savings: { lcp: 600 }, detail: { ms: 640 } },
    { id: 'render-blocking-insight', savings: { lcp: 500 } },
  ],
  home: [
    { id: 'image-delivery-insight', savings: { lcp: 900 }, detail: { n: 3, kb: 450 } },
    { id: 'render-blocking-insight', savings: { lcp: 500 } },
  ],
  cart: [
    { id: 'third-parties-insight', savings: { inp: 650 }, detail: { name: { fr: 'module de chat', en: 'chat widget' } } },
    { id: 'unused-javascript', savings: { inp: 350 }, detail: { kb: 420 } },
    { id: 'render-blocking-insight', savings: { lcp: 400 } },
  ],
  journal: [
    { id: 'render-blocking-insight', savings: { lcp: 400 } },
  ],
};
// The demo user last analysed just before shipping "Load the video on click":
// coming back, the standings say what moved since.
const PREVIOUS_WEEK = 17;
const DESKTOP_SCALE = { lcp: 0.5, inp: 0.4, cls: 0.8 };
const scaled = (audits, device) => audits.map(a => ({
  ...a,
  savings: device === 'mobile' ? a.savings
    : Object.fromEntries(Object.entries(a.savings).map(([m, v]) => [m, Math.round(v * DESKTOP_SCALE[m] * 1000) / 1000])),
}));
// Lab metrics as PageSpeed Insights measures them (simulated device and network).
const LAB = {
  mobile: {
    pages: {
      home:       { fcp: 3000, si: 5800, lcp: 4900, tbt: 700,  cls: 0.04 },
      collection: { fcp: 3200, si: 6300, lcp: 5800, tbt: 820,  cls: 0.18 },
      product:    { fcp: 3400, si: 6800, lcp: 7600, tbt: 900,  cls: 0.02 },
      cart:       { fcp: 2600, si: 5000, lcp: 4100, tbt: 1400, cls: 0.06 },
      journal:    { fcp: 2400, si: 4700, lcp: 3900, tbt: 450,  cls: 0.03 },
    },
    // Competitors are measured on their equivalent pages only (no journal,
    // no seasonal collection): the comparison runs on what everyone has.
    competitors: {
      south: {
        home:    { fcp: 1900, si: 3700, lcp: 3200, tbt: 350,  cls: 0.06 },
        product: { fcp: 2000, si: 4000, lcp: 3600, tbt: 380,  cls: 0.05 },
        cart:    { fcp: 1800, si: 3500, lcp: 3000, tbt: 420,  cls: 0.04 },
      },
      lumen: {
        home:    { fcp: 2500, si: 4900, lcp: 4400, tbt: 580,  cls: 0.11 },
        product: { fcp: 2700, si: 5300, lcp: 5200, tbt: 640,  cls: 0.09 },
        cart:    { fcp: 2400, si: 4600, lcp: 4000, tbt: 760,  cls: 0.08 },
      },
      halde: {
        home:    { fcp: 3600, si: 7000, lcp: 7200, tbt: 1100, cls: 0.03 },
        product: { fcp: 3800, si: 7400, lcp: 8000, tbt: 1200, cls: 0.03 },
        cart:    { fcp: 3200, si: 6200, lcp: 5600, tbt: 1300, cls: 0.05 },
      },
    },
  },
  desktop: {
    pages: {
      home:       { fcp: 1000, si: 1900, lcp: 1900, tbt: 200, cls: 0.03 },
      collection: { fcp: 1200, si: 2300, lcp: 2600, tbt: 260, cls: 0.14 },
      product:    { fcp: 1300, si: 2500, lcp: 3100, tbt: 280, cls: 0.02 },
      cart:       { fcp: 950,  si: 1800, lcp: 1700, tbt: 420, cls: 0.04 },
      journal:    { fcp: 850,  si: 1500, lcp: 1400, tbt: 110, cls: 0.02 },
    },
    competitors: {
      south: {
        home:    { fcp: 650,  si: 1100, lcp: 1100, tbt: 70,  cls: 0.05 },
        product: { fcp: 700,  si: 1200, lcp: 1300, tbt: 80,  cls: 0.04 },
        cart:    { fcp: 600,  si: 1000, lcp: 1000, tbt: 90,  cls: 0.03 },
      },
      lumen: {
        home:    { fcp: 850,  si: 1500, lcp: 1500, tbt: 150, cls: 0.09 },
        product: { fcp: 900,  si: 1700, lcp: 1800, tbt: 170, cls: 0.08 },
        cart:    { fcp: 800,  si: 1400, lcp: 1400, tbt: 200, cls: 0.06 },
      },
      halde: {
        home:    { fcp: 1300, si: 2500, lcp: 2700, tbt: 330, cls: 0.03 },
        product: { fcp: 1400, si: 2700, lcp: 3000, tbt: 360, cls: 0.03 },
        cart:    { fcp: 1200, si: 2300, lcp: 2400, tbt: 400, cls: 0.04 },
      },
    },
  },
};

// Weekly PageSpeed score history as Allure would have measured it [from, steps]:
// the site's curve on the compared pages, ending on today's score. Each page
// follows that curve at its own level, so any set of pages can be compared.
const LAB_HISTORY = {
  mobile: {
    you:   { from: 46, steps: [{ week: CHAT_WEEK, delta: -3 }, { week: SHIP_WEEK, delta: 8 }] },
    south: { from: 80 }, lumen: { from: 65 }, halde: { from: 50, steps: [{ week: SHIP_WEEK + 2, delta: -7 }] },
  },
  desktop: {
    you:   { from: 68, steps: [{ week: CHAT_WEEK, delta: -2 }, { week: SHIP_WEEK, delta: 6 }] },
    south: { from: 96 }, lumen: { from: 90 }, halde: { from: 73, steps: [{ week: SHIP_WEEK + 2, delta: -9 }] },
  },
};

// Competitors, whole-site field data [from → to] over the same 26 weeks.
// Story: Comptoir Sud leads steadily, Lumen & Co slips, Halde degrades — and
// Maison Lune overtakes Halde once "Load the video on click" ships.
const COMPETITORS = {
  mobile: {
    south: { lcp: [2400, 2300], inp: [195, 190], cls: [0.07, 0.07] },
    lumen: { lcp: [2650, 2800], inp: [190, 220], cls: [0.125, 0.12] },
    halde: { lcp: [3650, 3900], inp: [295, 310], cls: [0.04, 0.04] },
  },
  desktop: {
    south: { lcp: [1650, 1600], inp: [102, 100], cls: [0.05, 0.05] },
    lumen: { lcp: [1900, 2000], inp: [108, 120], cls: [0.088, 0.09] },
    halde: { lcp: [2450, 2600], inp: [150, 160], cls: [0.03, 0.03] },
  },
};

const mean = xs => xs.reduce((s, x) => s + x, 0) / xs.length;

// The share of good visits CrUX would report for a given p75, assuming
// log-normal visits: exactly 75 % when the p75 sits on Google's threshold.
const SPREAD = { lcp: 0.55, inp: 0.6, cls: 0.9 };
const phi = z => { const t = 1 / (1 + 0.2316419 * Math.abs(z)); const d = 0.3989423 * Math.exp(-z * z / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; };
const goodShare = (metric, p75) => Math.round(phi(0.674 + Math.log(THRESHOLDS[metric].good / Math.max(p75, 1e-3)) / SPREAD[metric]) * 1000) / 1000;
const withGood = field => ({ ...field, good: Object.fromEntries(['lcp', 'inp', 'cls'].map(m => [m, goodShare(m, field[m])])) });
const withScore = (lab, device) => ({ ...lab, score: pageSpeedScore(lab, device) });

export function loadDemo(now = new Date()) {
  const project = {
    id: 'demo',
    demo: true,
    name: 'Maison Lune',
    origin: 'https://maison-lune.example',
    pages: [
      { id: 'home', name: { fr: 'Accueil', en: 'Home' }, path: '/', weight: 2 },
      { id: 'collection', name: { fr: 'Collection automne', en: 'Autumn collection' }, path: '/collection/automne', weight: 2 },
      { id: 'product', name: { fr: 'Fiche produit', en: 'Product page' }, path: '/produit/manteau-laine', weight: 3 },
      { id: 'cart', name: { fr: 'Panier', en: 'Cart' }, path: '/panier', weight: 3 },
      { id: 'journal', name: { fr: 'Journal', en: 'Journal' }, path: '/journal', weight: 1 },
    ],
    competitors: [
      { id: 'south', name: 'Comptoir Sud', origin: 'https://comptoir-sud.example' },
      { id: 'lumen', name: 'Lumen & Co', origin: 'https://lumen.example' },
      { id: 'halde', name: 'Halde', origin: 'https://halde.example' },
    ],
  };

  // CrUX history periods end two days ago, one per week.
  const lastEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2).getTime();
  const ends = Array.from({ length: WEEKS }, (_, i) => new Date(lastEnd - (WEEKS - 1 - i) * 7 * DAY));

  const history = {};
  const measurements = {};
  let seed = 7;
  for (const device of ['mobile', 'desktop']) {
    const scopes = {};
    for (const [scope, spec] of Object.entries(FIELD[device])) {
      const cols = {};
      for (const metric of ['lcp', 'inp', 'cls']) {
        const [from, to, steps] = spec[metric];
        cols[metric] = series({ from, to, steps, noise: NOISE[metric], seed: seed++, digits: DIGITS[metric] });
      }
      scopes[scope] = ends.map((end, i) => ({ end, lcp: cols.lcp[i], inp: cols.inp[i], cls: cols.cls[i] }));
    }
    const { origin, ...pages } = scopes;
    const competitors = {};
    for (const [id, spec] of Object.entries(COMPETITORS[device])) {
      const cols = {};
      for (const metric of ['lcp', 'inp', 'cls']) {
        const [from, to] = spec[metric];
        cols[metric] = series({ from, to, noise: NOISE[metric] * 0.4, seed: seed++, digits: DIGITS[metric] });
      }
      competitors[id] = ends.map((end, i) => ({ end, lcp: cols.lcp[i], inp: cols.inp[i], cls: cols.cls[i] }));
    }
    history[device] = { origin, pages, competitors };

    const last = rows => { const r = rows[rows.length - 1]; return { lcp: r.lcp, inp: r.inp, cls: r.cls }; };
    measurements[device] = {
      device,
      ts: now.toISOString(),
      origin: { field: withGood(last(origin)) },
      pages: Object.fromEntries(project.pages.map(p => [p.id, {
        field: last(pages[p.id]),
        fieldSource: 'url',
        lab: withScore(LAB[device].pages[p.id], device),
        audits: scaled(AUDITS[p.id], device),
      }])),
      competitors: Object.fromEntries(Object.entries(competitors).map(([id, rows]) => [id, {
        field: withGood(last(rows)),
        pages: Object.fromEntries(Object.entries(LAB[device].competitors[id]).map(([page, lab]) => [page, { lab: withScore(lab, device) }])),
      }])),
    };

    // Per-page PageSpeed history: the site curve, shifted to each page's level.
    const m = measurements[device];
    const compared = Object.keys(LAB[device].competitors.south);
    const perPage = (spec, pages) => {
      const today = mean(compared.map(id => pages[id].lab.score));
      const site = series({ from: spec.from, to: today, steps: spec.steps, noise: 1.6, seed: seed++, digits: 1 });
      return Object.fromEntries(Object.entries(pages).map(([id, p]) => [id,
        site.map(v => Math.round(Math.min(100, Math.max(0, v + p.lab.score - today)) * 10) / 10)]));
    };
    history[device].lab = {
      times: ends,
      you: perPage(LAB_HISTORY[device].you, m.pages),
      competitors: Object.fromEntries(project.competitors.map(c => [c.id, perPage(LAB_HISTORY[device][c.id], m.competitors[c.id].pages)])),
    };
  }

  // The previous analysis, as the standings stood then (3-week rolling mean,
  // like the curve's ranks), on today's compared pages.
  const previous = {};
  for (const device of ['mobile', 'desktop']) {
    const { set, table } = position(project, measurements[device]);
    const rh = rankHistory(alignedLab(history[device], table.filter(c => !c.you).map(c => c.id), set));
    const w = rh[PREVIOUS_WEEK];
    previous[device] = { ts: ends[PREVIOUS_WEEK].toISOString(), set: set.map(p => p.id), ranks: w.ranks, scores: w.scores };
  }

  return { project, history, measurements, now, previous };
}
