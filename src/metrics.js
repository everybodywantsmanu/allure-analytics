// Core Web Vitals vocabulary: Google's official p75 thresholds and the audits
// Allure knows how to turn into fixes.

export const METRICS = ['lcp', 'inp', 'cls'];

export const THRESHOLDS = {
  lcp: { good: 2500, poor: 4000 }, // ms
  inp: { good: 200, poor: 500 },   // ms
  cls: { good: 0.1, poor: 0.25 },  // unitless
};

export const STATUS_RANK = { good: 0, ni: 1, poor: 2 };

// Market benchmark: share of sites meeting each "good" threshold.
// Web Almanac 2025, Performance chapter (HTTP Archive / CrUX, July 2025).
export const BENCHMARK = {
  mobile:  { all: 48, lcp: 62, inp: 77, cls: 81 },
  desktop: { all: 56, lcp: 74, inp: 97, cls: 72 },
};

// What the interface shows: two levels only. "good" stays neutral; everything
// past Google's threshold is "ni" (to improve), poor included.
export const level = status => (status == null ? null : status === 'good' ? 'good' : 'ni');

export function statusOf(metric, value) {
  if (value == null) return null;
  const th = THRESHOLDS[metric];
  return value <= th.good ? 'good' : value <= th.poor ? 'ni' : 'poor';
}

// Real-visitor metric score out of 100 (detail views): 90 at Google's "good"
// threshold, 50 at its "poor" threshold, linear in between; 100 at zero, 0 at
// twice "poor". The overall score is the PageSpeed score below.
export const SCORE_GOOD = 90;
export function metricScore(metric, value) {
  const { good, poor } = THRESHOLDS[metric];
  const s = value <= good ? 100 - 10 * (value / good)
    : value <= poor ? 90 - 40 * ((value - good) / (poor - good))
    : 50 - 50 * ((value - poor) / poor);
  return Math.max(0, Math.min(100, s));
}

// A page passes only if every metric is good; its "worst" metric is the one
// with the most severe status, ties broken by how far it sits past its limit.
export function pageHealth(field) {
  let best = null;
  for (const metric of METRICS) {
    const value = field?.[metric];
    if (value == null) continue;
    const status = statusOf(metric, value);
    const ratio = value / THRESHOLDS[metric].poor;
    if (!best || STATUS_RANK[status] > STATUS_RANK[best.status]
        || (STATUS_RANK[status] === STATUS_RANK[best.status] && ratio > best.ratio)) {
      best = { status, metric, ratio };
    }
  }
  return best ? { status: best.status, worst: best.metric } : { status: null, worst: null };
}

// Lighthouse audits → the metric they mainly move and a rough effort level.
export const AUDITS = {
  'image-delivery-insight':   { metric: 'lcp', effort: 'easy' },
  'lcp-discovery-insight':    { metric: 'lcp', effort: 'easy' },
  'font-display-insight':     { metric: 'lcp', effort: 'easy' },
  'cls-culprits-insight':     { metric: 'cls', effort: 'easy' },
  'third-party-facades':      { metric: 'lcp', effort: 'easy' },
  'render-blocking-insight':  { metric: 'lcp', effort: 'medium' },
  'third-parties-insight':    { metric: 'inp', effort: 'medium' },
  'cache-insight':            { metric: 'lcp', effort: 'medium' },
  'unused-javascript':        { metric: 'inp', effort: 'heavy' },
  'document-latency-insight': { metric: 'lcp', effort: 'heavy' },
};

// Other Lighthouse ids → the catalogue entry they belong to. Lighthouse 12+
// reports its insights and, for a while, the older audits they replace: both
// point to one fix, and the larger saving per metric is kept.
export const AUDIT_ALIASES = {
  'uses-optimized-images': 'image-delivery-insight',
  'modern-image-formats': 'image-delivery-insight',
  'uses-responsive-images': 'image-delivery-insight',
  'efficient-animated-content': 'image-delivery-insight',
  'offscreen-images': 'image-delivery-insight',
  'prioritize-lcp-image': 'lcp-discovery-insight',
  'lcp-lazy-loaded': 'lcp-discovery-insight',
  'font-display': 'font-display-insight',
  'layout-shifts': 'cls-culprits-insight',
  'unsized-images': 'cls-culprits-insight',
  'render-blocking-resources': 'render-blocking-insight',
  'network-dependency-tree-insight': 'render-blocking-insight',
  'unused-css-rules': 'render-blocking-insight',
  'unminified-css': 'render-blocking-insight',
  'third-party-summary': 'third-parties-insight',
  'uses-long-cache-ttl': 'cache-insight',
  'legacy-javascript': 'unused-javascript',
  'legacy-javascript-insight': 'unused-javascript',
  'duplicated-javascript': 'unused-javascript',
  'duplicated-javascript-insight': 'unused-javascript',
  'unminified-javascript': 'unused-javascript',
  'bootup-time': 'unused-javascript',
  'server-response-time': 'document-latency-insight',
  'redirects': 'document-latency-insight',
  'uses-text-compression': 'document-latency-insight',
  'modern-http-insight': 'document-latency-insight',
  'uses-http2': 'document-latency-insight',
};

// Default importance from a page's name or URL: the money pages are critical.
export function suggestWeight(name = '', path = '') {
  const s = `${name} ${path}`.toLowerCase();
  if (/(panier|cart|basket|checkout|paiement|payment|commande|order|produit|product|tarif|pricing|price)/.test(s)) return 3;
  if (path === '/' || /(accueil|home)/.test(s)) return 2;
  return 1;
}

// ── PageSpeed (Lighthouse) performance score ─────────────────
// Google's own lab score, reproduced from the Lighthouse source (Apache-2.0):
// each lab metric goes through a log-normal curve with device-specific control
// points [p10 → 90, median → 50], then a weighted mean (Lighthouse 10+ weights).

export const LH_CURVES = {
  mobile:  { fcp: [1800, 3000], si: [3387, 5800], lcp: [2500, 4000], tbt: [200, 600], cls: [0.1, 0.25] },
  desktop: { fcp: [934, 1600],  si: [1311, 2300], lcp: [1200, 2400], tbt: [150, 350], cls: [0.1, 0.25] },
};
export const LH_WEIGHTS = { fcp: 0.1, si: 0.1, lcp: 0.25, tbt: 0.3, cls: 0.25 };

// Common market targets for the PageSpeed score ("in the norm" above this).
export const PSI_TARGET = { mobile: 60, desktop: 80 };

// Abramowitz & Stegun 7.1.26, as in Lighthouse.
function erf(x) {
  const sign = Math.sign(x);
  x = Math.abs(x);
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const t = 1 / (1 + p * x);
  const y = t * (a1 + t * (a2 + t * (a3 + t * (a4 + t * a5))));
  return sign * (1 - y * Math.exp(-x * x));
}

function logNormalScore([p10, median], value) {
  if (value <= 0) return 1;
  const INVERSE_ERFC_ONE_FIFTH = 0.9061938024368232;
  const standardizedX = (Math.log(value / median) * INVERSE_ERFC_ONE_FIFTH) / -Math.log(p10 / median);
  const percentile = (1 - erf(standardizedX)) / 2;
  let score = value <= p10 ? Math.max(0.9, Math.min(1, percentile))
    : value <= median ? Math.max(0.5, Math.min(0.8999999999999999, percentile))
    : Math.max(0, Math.min(0.49999999999999994, percentile));
  if (score > 0.9) score += 0.05 * (score - 0.9); // Lighthouse's boost near the top
  return Math.floor(score * 100) / 100;
}

// One lab metric's Lighthouse score, 0–1 (0.9 and above is Lighthouse's green).
export const labMetricScore = (metric, value, device) => logNormalScore(LH_CURVES[device][metric], value);

// What each lab metric brings to the score, in points (they add up to it):
// "where the points come from", out of 10, 10, 25, 30 and 25.
export function labPoints(lab, device) {
  return Object.fromEntries(Object.entries(LH_WEIGHTS).map(([metric, weight]) => [metric, weight * labMetricScore(metric, lab[metric], device) * 100]));
}

// lab = { fcp, si, lcp, tbt, cls } in ms (cls unitless) → score 0–100, the way
// Lighthouse computes it, so it matches PageSpeed Insights to the point: integer
// weights summed in its category order, the mean kept to 2 decimals, then ×100.
// (Floating point decides a 77.5 here: the order and the roundings matter.)
const LH_ORDER = [['fcp', 10], ['lcp', 25], ['tbt', 30], ['cls', 25], ['si', 10]];
export function pageSpeedScore(lab, device) {
  let sum = 0, weight = 0;
  for (const [metric, w] of LH_ORDER) { sum += labMetricScore(metric, lab[metric], device) * w; weight += w; }
  return Math.round((Math.round((sum / weight) * 100) / 100) * 100);
}

export const psiStatus = (score, device) => (score >= PSI_TARGET[device] ? 'good' : 'ni');
