// The Allure Analytics logotype, drawn rather than typeset so it reads the
// same on every system: "ALLURE" in wide geometric capitals of an even stroke
// (wider than tall: stretched), a round dot like a signature, and "ANALYTICS"
// spaced out across the word underneath. Everything is in currentColor: ink
// by day, light by night. A short mark, "A.", stands in where room is tight.

// Capitals on a 20-unit cap height, as [width, centre-line path]. Strokes are
// clipped to the cap band, so diagonals end flat on the baseline and at the apex.
const BIG = {
  A: [24, 'M1.4 21L12 0L22.6 21M5.6 13.4H18.4'],
  L: [19, 'M1.7 0V18.3H19'],
  U: [24, 'M1.7 0V9A10.3 9.3 0 0 0 22.3 9V0'],
  R: [24, 'M1.7 21V1.7H14A5.3 4.9 0 0 1 14 11.5H1.7M12.2 11.5L23 21'],
  E: [22, 'M22 1.7H1.7V18.3H22M1.7 10H19.5'],
};
// Small capitals drawn on a 6.4-unit cap height, shown 1.25× larger (8 units)
// so "ANALYTICS" stays legible when the logo sits small in the top bar.
const SMALL = {
  A: [7.6, 'M0.55 6.8L3.8 -0.2L7.05 6.8M1.75 4.5H5.85'],
  N: [6.4, 'M0.625 6.8V0L5.775 6.4V-0.4'],
  L: [5.4, 'M0.625 0V5.775H5.4'],
  Y: [7.2, 'M0.2 -0.3L3.6 3.4L7 -0.3M3.6 3.4V6.8'],
  T: [6.6, 'M0 0.625H6.6M3.3 0.625V6.8'],
  I: [1.25, 'M0.625 0V6.8'],
  C: [6.6, 'M6.1 1.35A3.2 2.55 0 1 0 6.1 5.05'],
  S: [6.2, 'M5.7 1.3C5.1 0.8 4.3 0.625 3.2 0.625C1.7 0.625 0.7 1.25 0.7 2.15C0.7 3.75 5.6 2.75 5.6 4.4C5.6 5.25 4.6 5.775 3.1 5.775C1.9 5.775 0.95 5.45 0.35 4.9'],
};
const TRACK = 8;            // between the capitals
const WORD = 'ALLURE', SUB = 'ANALYTICS';
const DOT = { r: 2.9, gap: 6 };
const SMALL_K = 1.25;

// Letters laid out from x = 0; `gap` between them.
function line(word, set, gap) {
  let x = 0;
  const paths = [...word].map(ch => {
    const [w, d] = set[ch];
    const p = `<path transform="translate(${+x.toFixed(2)} 0)" d="${d}"/>`;
    x += w + gap;
    return p;
  });
  return { paths: paths.join(''), width: x - gap };
}

const big = line(WORD, BIG, TRACK);
// "ANALYTICS" is spread to the exact width of "ALLURE"; the dot hangs outside.
const subWidth = [...SUB].reduce((sum, ch) => sum + SMALL[ch][0], 0);
const small = line(SUB, SMALL, (big.width / SMALL_K - subWidth) / (SUB.length - 1));
const DOT_X = big.width + DOT.gap + DOT.r;
const SUB_Y = 29.5, W = Math.ceil(DOT_X + DOT.r), H = Math.ceil(SUB_Y + 6.4 * SMALL_K);

let uid = 0;
const strokes = (width, clip, body) => `<g fill="none" stroke="currentColor" stroke-width="${width}" stroke-linejoin="miter" stroke-miterlimit="8" clip-path="url(#${clip})">${body}</g>`;

// Its accessible name, or hidden when what surrounds it already says it (title: null).
const named = title => (title ? `role="img" aria-label="${title}"` : 'aria-hidden="true" focusable="false"');

// The full logotype.
export function logo({ title = 'Allure Analytics', cls = 'logo' } = {}) {
  const id = `lg${++uid}`;
  return `<svg class="${cls}" viewBox="0 0 ${W} ${H}" ${named(title)}><defs><clipPath id="${id}a"><rect width="${W}" height="20"/></clipPath><clipPath id="${id}b"><rect width="${W}" height="6.4"/></clipPath></defs>${strokes(3.4, `${id}a`, big.paths)}<circle cx="${DOT_X}" cy="${20 - DOT.r}" r="${DOT.r}" fill="currentColor"/><g transform="translate(0 ${SUB_Y}) scale(${SMALL_K})">${strokes(1.1, `${id}b`, small.paths)}</g></svg>`;
}

// The short mark: the A and its dot.
const MARK_W = BIG.A[0] + 5 + DOT.r * 2;
export function mark({ title = 'Allure Analytics', cls = 'logo-mark' } = {}) {
  const id = `mk${++uid}`;
  return `<svg class="${cls}" viewBox="0 0 ${MARK_W} 20" ${named(title)}><defs><clipPath id="${id}"><rect width="${MARK_W}" height="20"/></clipPath></defs>${strokes(3.4, id, `<path d="${BIG.A[1]}"/>`)}<circle cx="${MARK_W - DOT.r}" cy="${20 - DOT.r}" r="${DOT.r}" fill="currentColor"/></svg>`;
}
