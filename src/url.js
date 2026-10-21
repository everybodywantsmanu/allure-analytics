// Addresses as people type them, turned into what Google's APIs expect.
//   "Monsite.fr/"  → https://monsite.fr        (scheme added, host lowercased)
//   "www.x.fr" and "x.fr" are the same site    (siteKey drops "www.")
//   "/panier/" and "/panier" are the same page (pathKey drops the trailing slash)
// The exact origin still matters to CrUX, which keys www and non-www apart:
// the address PageSpeed lands on after redirects is the one kept.

const HOST = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9-]{2,63}$/i;

function toUrl(input) {
  const raw = String(input ?? '').trim();
  if (!raw) return null;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw.replace(/^\/+/, '')}`);
    if (!/^https?:$/.test(url.protocol) || url.username || url.password) return null;
    if (!HOST.test(url.hostname) || /^\d+(\.\d+){3}$/.test(url.hostname)) return null;
    return url;
  } catch {
    return null;
  }
}

export const siteKey = origin => {
  try { return new URL(origin).hostname.replace(/^www\./, ''); } catch { return ''; }
};
export const sameSite = (a, b) => !!siteKey(a) && siteKey(a) === siteKey(b);

// A site: its origin only (a path typed after the domain is ignored).
export function parseSite(input) {
  const url = toUrl(input);
  return url ? { origin: url.origin } : null;
}

// A page of a site: a path ("/panier"), or a full address on that site.
// Query strings are kept (they can select a different page); fragments are not.
export function parsePath(input, origin) {
  const raw = String(input ?? '').trim();
  if (!raw) return null;
  if (raw.startsWith('/') && !raw.startsWith('//')) {
    try {
      const url = new URL(raw, origin);
      return { path: url.pathname.replace(/\/{2,}/g, '/') + url.search };
    } catch { return null; }
  }
  const url = toUrl(raw);
  if (!url) return null;
  if (origin && !sameSite(url.origin, origin)) return { offsite: true, url: url.href };
  return { path: url.pathname.replace(/\/{2,}/g, '/') + url.search };
}

// A competitor's equivalent page: a path on its origin, or a full address
// anywhere but on your own site.
export function parseCompetitorPage(input, origin) {
  const raw = String(input ?? '').trim();
  if (!raw) return null;
  if (raw.startsWith('/') && !raw.startsWith('//')) {
    try { const url = new URL(raw, origin); url.hash = ''; return { url: url.href }; } catch { return null; }
  }
  const url = toUrl(raw);
  if (!url) return null;
  url.hash = '';
  return { url: url.href };
}

export const pathKey = path => {
  const [p, q = ''] = String(path).split('?');
  return (p.length > 1 ? p.replace(/\/+$/, '') : p) + (q ? `?${q}` : '');
};
export const pageUrl = (origin, path) => new URL(path, origin).href;

// Two addresses that differ only by scheme, "www.", a trailing slash or case.
export function samePage(a, b) {
  try {
    const x = new URL(a), y = new URL(b);
    return siteKey(x.origin) === siteKey(y.origin)
      && pathKey(x.pathname + x.search).toLowerCase() === pathKey(y.pathname + y.search).toLowerCase();
  } catch { return false; }
}

// A short display form: "monsite.fr/panier".
export function shortUrl(href) {
  try {
    const u = new URL(href);
    return `${u.hostname.replace(/^www\./, '')}${u.pathname === '/' ? '' : u.pathname}${u.search}`;
  } catch { return String(href ?? ''); }
}

// Stable short ids (FNV-1a): a page is its address, so the same address keeps
// its history and a changed one starts afresh.
export function hashId(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}

// A company name from its domain: "www.maison-lune.fr" → "Maison Lune",
// "shop.lumen.co.uk" → "Lumen". The label before the public suffix is kept.
const SECOND_LEVEL = /^(co|com|net|org|gov|gouv|ac|edu|ltd|plc|asso)$/;
export function companyName(input) {
  const site = parseSite(input);
  if (!site) return '';
  const labels = new URL(site.origin).hostname.replace(/^www\./, '').split('.');
  if (labels.length < 2) return '';
  const tld = labels.length > 2 && SECOND_LEVEL.test(labels[labels.length - 2]) && labels[labels.length - 1].length === 2 ? 2 : 1;
  const name = labels[labels.length - 1 - tld] ?? labels[0];
  return name.split(/[-_]+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// A readable default name from a path: "/collection/automne-hiver" → "Automne hiver".
export function nameFromPath(path) {
  const seg = String(path).split('?')[0].split('/').filter(Boolean).pop();
  if (!seg) return '';
  let s = seg;
  try { s = decodeURIComponent(seg); } catch { /* keep raw */ }
  s = s.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[-_+]+/g, ' ').trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}
