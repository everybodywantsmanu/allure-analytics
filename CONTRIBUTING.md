# Contributing

Thanks for your interest in Allure Analytics. It's a small product, built with care: ideas, bug reports and fixes are welcome.

## Report a bug or suggest an idea

Open an [issue](../../issues/new/choose) and pick **Bug** or **Idea**. For a bug, say what you did, what you expected and what happened; a screenshot and the device (mobile or desktop) help a lot. Never paste your Google API key.

## Run it locally

You need [Node.js](https://nodejs.org) 20 or later, nothing else.

```bash
node serve.mjs          # the app on http://localhost:4173
node --test tests/      # the tests, on mocked Google APIs (no key, no network)
```

The demo works without a key. To measure a real site, follow the *Google key* card in Settings.

## Make a change

- **No dependencies, no build step.** Native ES modules, hand-drawn SVG, plain CSS. Please keep it that way.
- **Read [SPEC.md](SPEC.md) first** (in French): every product decision and edge case is written there. A change in behaviour comes with its line in the spec, edge cases included.
- **Strings live in `src/i18n.js`**, in French and English. Persistence goes only through `src/storage.js`.
- **Design:** minimal, one attention colour (orange) for your own values below the excellence level, competitors in grey. Every number is said once.
- **Tests:** `node --test tests/` must stay green. Add a case when you fix a bug.
- Open a pull request with a short description of the why, and a before/after screenshot for anything visible.
