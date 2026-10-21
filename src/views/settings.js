// Settings: everything you set once. Your project first (site, pages,
// competitors, Google key: the setup form, with its launch button), then
// preferences (language, theme) and your data. Demo or your site: the top bar.
// Before a first analysis, this is the way in: it reads "Analyze my site".

import { t } from '../i18n.js';
import { esc } from '../html.js';
import { segmented } from './shell.js';

export function renderSettings({ lang, themePref, hasResults, hasData, setup }) {
  return `<main id="main" class="wrap setup reveal">
    <header class="setup-head">
      <h1>${esc(t(hasResults ? 'settings.title' : 'analyze.title'))}</h1>
      <p class="lede">${esc(t(hasResults ? 'settings.lede' : 'analyze.lede'))}</p>
    </header>
    ${setup}
    <section class="card setup-card prefs-card reveal" style="--i:5" aria-labelledby="s-prefs">
      <h2 id="s-prefs">${esc(t('settings.prefs'))}</h2>
      <dl class="prefs">
        <dt>${esc(t('settings.lang'))}</dt>
        <dd>${segmented('lang', [['fr', 'Français'], ['en', 'English']], lang, t('settings.lang'))}</dd>
        <dt>${esc(t('settings.theme'))}</dt>
        <dd>${segmented('theme', [['auto', t('theme.auto')], ['light', t('theme.light')], ['dark', t('theme.dark')]], themePref, t('settings.theme'))}</dd>
        ${hasData ? `<dt>${esc(t('settings.data'))}</dt>
        <dd><button type="button" class="link" data-action="reset">${esc(t('settings.reset'))}</button> <span class="muted">${esc(t('settings.reset.hint'))}</span></dd>` : ''}
      </dl>
      <p class="hint">${esc(t('settings.soon'))}</p>
    </section>
  </main>`;
}
