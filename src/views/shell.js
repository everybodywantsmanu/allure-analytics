// The frame around every view: a glass top bar with only what you use every
// day (the logo, your site | the demo, settings, the one action that matters
// now), a dark band over it whenever the screen shows the demo, and a
// one-line footer signed by its author.
// The device switch lives with the data it filters, on the home screen.

import { t } from '../i18n.js';
import { esc } from '../html.js';
import { ICONS } from '../charts.js';
import { logo, mark } from '../logo.js';
import { storage } from '../storage.js';
import { PSI_TARGET } from '../metrics.js';

const AUTHOR_URL = 'https://fr.linkedin.com/in/emmanuel-nsuele';

export function segmented(action, options, current, label, extra = '') {
  return `<div class="segmented ${extra}" role="group" aria-label="${esc(label)}">${options.map(([value, text]) =>
    `<button type="button" data-action="${action}" data-value="${value}" aria-pressed="${value === current}">${esc(text)}</button>`).join('')}</div>`;
}

// Your company by its name, with a quiet "you" beside it where it helps.
export const youName = name => `<span class="bname-text" title="${esc(name)}">${esc(name)}</span><small class="you-tag">${esc(t('board.you'))}</small>`;

// One bar on the 0–100 grid; the list draws the threshold line once.
export const track = (value, kind) => `<span class="btrack"><i class="bfill bfill--${kind}" style="width:${Math.max(0, Math.min(100, value))}%"></i></span>`;

// How the score is made, one tap away: the freshness line becomes a pill
// that opens a small card. Its "i" pulses gently until the card has been
// opened once (remembered in this browser); app.js closes it on a click
// elsewhere or Escape. more: false where the card's link would point here.
const HOW_ICONS = {
  google: '<rect x="2.5" y="2.5" width="11" height="4.5" rx="1.2"/><rect x="2.5" y="9" width="11" height="4.5" rx="1.2"/><path d="M5 4.75h.6M5 11.25h.6"/>',
  chrome: '<rect x="2.5" y="3.5" width="11" height="7" rx="1.2"/><path d="M1 12.5h14"/>',
  mean: '<path d="M3.5 13V8.5M8 13V4M12.5 13V6.5"/><path d="M1.5 8.5h13" stroke-dasharray="1.6 1.6"/>',
  excellence: '<path d="M8 2.2l1.7 3.5 3.8.5-2.75 2.7.65 3.8L8 10.9l-3.4 1.8.65-3.8L2.5 6.2l3.8-.5z"/>',
  tie: '<path d="M3.5 6.25h9M3.5 9.75h9"/>',
};
export function howChip(ago, { more = true } = {}) {
  const fresh = !storage.get('seenHow');
  const row = (k, title) => `<li><svg class="how-ico" viewBox="0 0 16 16" aria-hidden="true">${HOW_ICONS[k]}</svg><div><b>${esc(title)}</b><p>${esc(t(`how.${k}`))}</p></div></li>`;
  return `<details class="how">
    <summary class="how-chip"><span>${esc(t('how.chip', { ago }))}</span><span class="sr-only"> · ${esc(t('how.title'))}</span><span class="how-i${fresh ? ' is-new' : ''}" aria-hidden="true">i</span></summary>
    <div class="how-panel">
      <p class="how-title">${esc(t('how.title'))}</p>
      <ul>
        ${row('google', t('how.google.t'))}
        ${row('chrome', t('how.chrome.t'))}
        ${row('mean', t('how.mean.t'))}
        ${row('excellence', t('how.excellence.t', { m: PSI_TARGET.mobile, d: PSI_TARGET.desktop }))}
        ${row('tie', t('how.tie.t'))}
      </ul>
      ${more ? `<a class="how-more" href="#/compare/score">${esc(t('how.more'))} ›</a>` : ''}
    </div>
  </details>`;
}

// cta: 'analyze' (set up a first analysis), 'rerun' (one click, same
// project), or 'running' (back to the progress).
export function ctaButton(cta) {
  if (cta === 'running') return `<a class="btn btn--running" href="#/analyze"><i class="dot" aria-hidden="true"></i><span class="long">${esc(t('cta.running'))}</span><span class="short">${esc(t('cta.runningShort'))}</span></a>`;
  if (cta === 'rerun') return `<button type="button" class="btn" data-action="rerun">${esc(t('cta.rerun'))}<span class="long">&nbsp;${esc(t('cta.rerunRest'))}</span></button>`;
  return `<a class="btn" href="#/settings">${esc(t('cta.short'))}<span class="long">&nbsp;${esc(t('cta.rest'))}</span></a>`;
}

// The demo is always one click away, and back: your site (by your company's
// name once analysed) | Demo.
function viewSwitch(demo, realName) {
  return `<div class="segmented view-switch" role="group" aria-label="${esc(t('settings.view'))}">
    <button type="button" data-action="view" data-value="real" aria-pressed="${!demo}"><span>${esc(realName ?? t('view.real'))}</span></button>
    <button type="button" data-action="view" data-value="demo" aria-pressed="${demo}">${esc(t('view.demo'))}</button>
  </div>`;
}

// The demo is told apart at first glance: a dark band across the top, kept
// in view while scrolling, with the way out to the real product.
const demoBand = () => `<div class="demo-band"><span>${esc(t('demo.band'))}</span><button type="button" class="link" data-action="view" data-value="real">${esc(t('demo.exit'))} ›</button></div>`;

// demo: true on the screens that show the data (home, compare).
export function renderShell({ data, cta = 'analyze', body, realName = null, demo = false }) {
  const inDemo = !!data?.project?.demo;
  const band = demo && inDemo;
  return `<header class="bar${band ? ' bar--demo' : ''}">
    ${band ? demoBand() : ''}
    <div class="wrap">
      <div class="brand">
        <a class="wordmark" href="#/" aria-label="Allure Analytics">${logo({ cls: 'logo logo--full', title: null })}${mark({ cls: 'logo logo--mark', title: null })}</a>
        ${viewSwitch(inDemo, realName)}
      </div>
      <div class="bar-right">
        <a class="icon-btn" href="#/settings" aria-label="${esc(t('nav.settings'))}">${ICONS.gear}</a>
        ${ctaButton(cta)}
      </div>
    </div>
  </header>
  ${body}
  <footer class="foot">
    <div class="wrap">
      <span>Allure Analytics · ${esc(t('colophon.version'))}</span>
      <span class="spacer"></span>
      <span class="signature">${esc(t('colophon.by'))} <a href="${AUTHOR_URL}" target="_blank" rel="noopener noreferrer" aria-label="${esc(t('colophon.author'))}">Emmanuel Nsuele<span class="ext" aria-hidden="true">↗</span></a></span>
    </div>
  </footer>`;
}
