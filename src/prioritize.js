// Turns per-page Lighthouse findings into a ranked list of fixes.
//
// priority(fix) = Σ over affected pages of
//                 Σ over metrics  min(saving / good threshold, CAP) × relevance(page status)
//                 × page weight
//
// Normalising by Google's "good" threshold lets milliseconds of LCP and units
// of CLS add up; relevance makes a saving count fully where the page fails and
// barely where it already passes.

import { AUDITS, METRICS, THRESHOLDS, statusOf } from './metrics.js';

const RELEVANCE = { poor: 1, ni: 0.6, good: 0.15 };
const CAP = 1.5;

export function pageGain(savings = {}, field = {}) {
  let gain = 0;
  for (const metric of METRICS) {
    const saving = savings[metric];
    if (!saving) continue;
    const status = statusOf(metric, field[metric]) ?? 'ni';
    gain += Math.min(saving / THRESHOLDS[metric].good, CAP) * RELEVANCE[status];
  }
  return gain;
}

export function buildFixes(project, measurement) {
  const fixes = new Map();
  for (const page of project.pages) {
    const pm = measurement.pages?.[page.id];
    if (!pm) continue;
    for (const audit of pm.audits ?? []) {
      const meta = AUDITS[audit.id];
      if (!meta) continue;
      const fix = fixes.get(audit.id) ?? { id: audit.id, metric: meta.metric, effort: meta.effort, pages: [], priority: 0 };
      const score = pageGain(audit.savings, pm.field) * page.weight;
      fix.pages.push({ page, savings: audit.savings, detail: audit.detail ?? {}, score });
      fix.priority += score;
      fixes.set(audit.id, fix);
    }
  }
  return [...fixes.values()]
    .map(fix => {
      fix.pages.sort((a, b) => b.score - a.score);
      fix.lead = fix.pages.find(p => p.savings[fix.metric]) ?? fix.pages[0];
      return fix;
    })
    .filter(fix => fix.priority > 0)
    .sort((a, b) => b.priority - a.priority);
}
