<p><img src="assets/allure-analytics-logo.svg" alt="Allure Analytics" width="300"></p>

# Allure Analytics

*the pace of your pages · la vitesse de vos pages*

**[Try the live demo →](https://emmanuelnsuele-dot.github.io/allure-analytics/)** &nbsp; ![Tests](https://github.com/emmanuelnsuele-dot/allure-analytics/actions/workflows/tests.yml/badge.svg) ![License: MIT](https://img.shields.io/badge/license-MIT-1D1D1F)

Allure Analytics tells product managers and marketing leads **where their site stands on performance against competitors**, and what it takes to pass the one just ahead. The home screen is minimal and self-explanatory: one positive sentence on your position ("You’re 3rd. Next step: 2nd place, 15 points away."), your PageSpeed curve beside the standings (each score with its change since the last analysis), and a gauge showing where three quick wins could take you. After a first analysis, with no curve yet, the standings take the whole card and a quiet line marks the starting point. Colour marks only your own values below the excellence level. It's a visualisation tool: it doesn't track what you've done.

- **Google's numbers.** The overall score is Google's PageSpeed score, recomputed with Lighthouse's official scoring (log-normal curves per device, v10+ weights), against an excellence level: 60 on mobile, 80 on desktop, already a very high level on Google's machine (Google keeps its green for 90 and above). The arithmetic follows Lighthouse to the rounding, so the numbers match PageSpeed Insights. The goal is still the site just ahead. A "Measured by Google ⓘ" pill on the home card and in Compare opens how the score is made, including why Lighthouse in your own Chrome scores higher (a faster processor: JavaScript blocks the page less). Loading, responsiveness and stability come from real visitors (CrUX, p75) against Google's thresholds.
- **Like-for-like position.** Standings rank on the PageSpeed score, averaged over the pages measured for you *and* every competitor (e.g. home, product, cart). Under 2 points apart is a tie. Every chart rises when things improve, in every view.
- **Two levels, market benchmarks.** "Good" stays neutral, "needs improvement" is the one attention colour. Each threshold shows how many sites reach it on that device (Web Almanac 2025).
- **Quick wins.** Lighthouse's estimated savings are combined without double counting, applied to each compared page and rescored like PageSpeed, ranked per unit of effort. A before/after says it first: today's score and place on the left ("72 · 3rd place"), the score within reach on the right ("≈ 86 · 2nd place"), and an arrow between them carrying the gain ("+14 pts"); the bar below draws each possible gain hatched after today's score, labelled "+6"; the actions below carry the same numbers and add up exactly. Tick or untick an action and everything follows live: the bar, the figure counting to its new value, the gain and the place. A what-if, never saved.
- **Below excellence, said plainly.** Your score turns orange (hover: "8 pts from excellence (80)"); a real-visitor tile past Google's threshold says which one ("threshold 2.5 s"). No status glyph to decode.
- **Honest with missing data.** No competitor, a failed measurement, an unmeasured device or a one-point history each get a plain state instead of a broken screen. Leading a market that misses the target still says so; past four competitors, the curve draws only the closest.
- **Compare in depth.** A dedicated view, indicator by indicator: real visitors first (6-month CrUX curves for every site, standings on the p75 value, the share of good visits against Google's 75% mark), then the lab page by page, each value opening Google's own PageSpeed report. The Score tab breaks the score into its five lab measures, shaded by the points each site loses.
- **Moments that mean something.** When your place changed since the last analysis, "You’re 4th" rolls to "3rd" like a counter, the standings rows slide into place and a place won glints across your bar, once. An analysis that ends on screen lands with your position very large in the middle, which then settles into the sentence. The curve draws competitors first, then yours on top; the one to beat stands out, the others step back.
- **What moved, quietly.** Each score in the standings carries its change since your previous analysis ("+4", "−9", "=" under 2 points), on the same compared pages only. When you pass someone, "▲ You pass Halde" while the standings rows slide into place (never claimed on a tie).
- **Real analysis, end to end.** Your site (as a whole, or 1–8 key pages) and up to 8 competitors, names filled in from their domains, measured with PageSpeed Insights (mobile and desktop) and Chrome UX Report (current p75 and weekly history), straight from the browser with your free Google key. Rate-limited and retried; a page that fails reads "Measurement unavailable" and never holds up the rest. Every analysis is a point on the curve, so two are enough, and a finished run lands straight on the result. Addresses are normalised (scheme, www, trailing slash, redirects), and bot protection, cookie banners, empty carts and small sites without field data are each called out instead of skewing the ranking.
- **Zero dependencies, no build step.** Native ES modules, hand-drawn SVG charts, French and English, light and dark themes.

Designed and built by [Emmanuel Nsuele](https://fr.linkedin.com/in/emmanuel-nsuele).

## Run it

```bash
node serve.mjs
```

Then open http://localhost:4173. ES modules don't load from `file://`, which is why a tiny server is needed. `serve.mjs` uses only Node built-ins.

The app opens on the real product: a clean welcome until your first analysis. The demo (a fictional shop and its competitors) is one click away, from the welcome screen or the *My site | Demo* switch in the top bar, and a dark band across the top says you are in it, with *Leave the demo* to come back. To measure your own site, click **Analyze my site** (it opens Settings, where the project and the key live) and follow the four steps of the *Google key* card. It is one free Google Cloud API key, with two APIs switched on:

| API on the key | What it unlocks | Without it |
|---|---|---|
| **PageSpeed Insights API** (required) | The lab: score, standings, curve, quick wins, page-by-page lab in Compare, plus a copy of real-visitor data without history | No analysis (PageSpeed grants no quota without a key) |
| **Chrome UX Report API** (recommended) | Real visitors from the source: current values, share of good visits, and 6 months of weekly history in Compare | The analysis still runs; real visitors come from PageSpeed, without history |

Each step links to the right page of the Google Cloud console. As soon as the key is pasted, Allure checks it with one light request per API (nothing is measured) and ticks the steps itself; once both APIs answer, the card folds into one line. The key stays in your browser and is sent only to Google.

## Status — prototype v0.1

| Done | Next |
|---|---|
| Demo project (fictional shop, 26 weeks of history) | Page sheet: causes, history, page-to-page comparison |
| Home: summary + curve beside the standings (your company by name, change since the last analysis), quick-wins gauge, page bars when you compare pages; demo one click away in the top bar and told apart by a dark band across the top |
| Compare: score breakdown, real visitors (curves, standings, share of good visits), lab page by page with links to Google | | Fix sheet: the why, the pages, a ready-to-paste ticket |
| Real analysis: PageSpeed + CrUX, light progress screen, straight to the result, a curve point per analysis, one-click re-run | Scheduled weekly runs (phase 2: shared backend) |
| Settings: project (whole site or chosen pages, competitors, Google key), language, theme, demo / my site, delete my data | Printable A4 brief, CSV export |
| Mobile / desktop, FR / EN, light / dark, several tabs | |

The full product decisions, with every edge case studied before building, are in [SPEC.md](SPEC.md) (in French).

## Tests

```bash
node --test tests/
```

Plain Node 20, no dependencies, no key and no network: Google's APIs are mocked with realistic PageSpeed Insights and CrUX answers. The tests run real analyses end to end (redirects, failed pages, missing field data, a disabled CrUX API, daily quota, storage quota, an aborted run…), render the home and Compare screens on both devices and in both languages and fail on any broken value, check every answer the key check can get from Google, and prove that each combination of the quick-wins simulator adds up exactly. They run on every push (GitHub Actions).

## Structure

```
index.html · styles.css · serve.mjs
src/
  app.js          state, routing, toggles, sync across tabs
  api.js          PageSpeed Insights v5 and CrUX clients: concurrency limits, retries, key check
  analyze.js      a real analysis → the same data shape as the demo, plus notes
  project.js      setup and its checks, saved results, weekly lab history, run lock
  url.js          address normalisation, stable ids
  storage.js      the single persistence boundary (localStorage → backend in phase 2)
  metrics.js      thresholds, page health, audit catalogue
  prioritize.js   findings → ranked fixes
  benchmark.js    position: like-for-like comparison, standings, ties, gains, rank history, since last time
  demo.js         seeded demo project
  i18n.js         FR / EN strings and formatting
  charts.js       SVG race chart (gaps allowed), icons
  html.js         escaping
  logo.js         the Allure Analytics logotype, drawn as paths (assets/ holds the SVG files)
  views/          shell, welcome, home, compare, analyze (setup and run), settings, notes, stubs
tests/            end-to-end and unit checks on mocked Google APIs (node --test tests/)
```

## License

MIT © Emmanuel Nsuele. See [LICENSE](LICENSE).
