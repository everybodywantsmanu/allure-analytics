// Placeholder for the sheets that land in the next iteration.

import { t } from '../i18n.js';
import { esc } from '../html.js';

export function renderStub({ title, text }) {
  return `<main id="main" class="wrap stub reveal">
    <div class="card">
      <h1>${esc(title)}</h1>
      <p>${esc(text)}</p>
      <a class="btn" href="#/">${esc(t('stub.back'))}</a>
    </div>
  </main>`;
}
