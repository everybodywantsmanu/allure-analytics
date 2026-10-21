// The real product before a first analysis: what Allure Analytics does, in a
// sentence, and the two ways in — analyse your site, or look at the demo.

import { t } from '../i18n.js';
import { esc } from '../html.js';
import { logo } from '../logo.js';

export function renderWelcome({ running = false } = {}) {
  const primary = running
    ? `<a class="btn btn--lg" href="#/analyze">${esc(t('cta.running'))}</a>`
    : `<a class="btn btn--lg" href="#/settings">${esc(t('cta.short'))} ${esc(t('cta.rest'))}</a>`;
  return `<main id="main" class="wrap welcome">
    <section class="card welcome-card reveal" aria-labelledby="welcome-title">
      ${logo({ cls: 'logo welcome-logo', title: null })}
      <h1 class="headline" id="welcome-title">${esc(t('welcome.title'))}<span class="soft">${esc(t('welcome.soft'))}</span></h1>
      <p class="welcome-text">${esc(t('welcome.text'))}</p>
      <div class="welcome-actions">
        ${primary}
        <button type="button" class="btn btn--lg btn--ghost" data-action="view" data-value="demo">${esc(t('welcome.demo'))}</button>
      </div>
      <p class="hint">${esc(t('welcome.hint'))}</p>
    </section>
  </main>`;
}
