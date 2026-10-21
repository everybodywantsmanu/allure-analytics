// What to keep in mind about an analysis (a corrected address, a redirect, a
// cookie banner, an empty cart…), worded once for every screen that shows it.

import { t, pick } from '../i18n.js';
import { esc } from '../html.js';
import { shortUrl } from '../url.js';

export function noteText(n) {
  const list = pages => pages.map(pick).join(' · ');
  // A corrected origin is told in full (www and all); a redirect, in short.
  const to = !n.to ? '' : n.kind === 'origin' ? new URL(n.to).host : shortUrl(n.to);
  const vars = { ...n, pages: n.pages ? list(n.pages) : '', page: pick(n.page), to, has: n.has ? t(`device.of.${n.has}`) : '', missing: n.missing ? t(`device.of.${n.missing}`) : '' };
  return t(`note.${n.kind}`, vars);
}

export const notesList = notes => (notes?.length ? `<ul class="notes">${notes.map(n => `<li>${esc(noteText(n))}</li>`).join('')}</ul>` : '');
