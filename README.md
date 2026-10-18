# NutriScan

An AI-first calorie and macro tracker in the spirit of Yazio. Describe a meal in one sentence or
snap a photo, and **Gemini** estimates every ingredient, portion and macro. Everything else — diary,
targets, water, steps, fasting and weight trends — is built in.

Local-first: your diary lives in your browser. The only network calls are the AI requests you trigger,
made with your own Gemini API key.

**Live app:** https://karlfredenhagen.github.io/nutriscan/ — installable, works offline after the first
visit.

## Features

- **AI food tracking** — text and/or photo → structured meal breakdown, editable portions, one-tap log.
- **AI meal suggestions** — "what fits my remaining macros?" with portions and a full macro split.
- **Calorie & macro targets** — Mifflin-St Jeor BMR, activity multiplier, goal pace, protein/carb/fat
  split and fiber target. Fully editable.
- **Barcode scanning** — EAN/UPC scan with the camera (or a photo of the barcode, or typed digits)
  resolved through the open **Open Food Facts** database, then portioned and logged.
- **Food diary** — breakfast, lunch, dinner, snacks; searchable 140-food database, custom foods,
  serving shortcuts, copy-yesterday, edit or delete any entry.
- **Water & steps** — quick logging with goals.
- **Exercise** — MET-based calorie burn for 15 activities, added back to your daily budget.
- **Fasting** — 14:10 / 16:8 / 18:6 / 20:4 plans, live timer, fasting stages, streaks and history.
- **Insights** — 7/30-day calorie chart, average macros, weight chart with goal line, streaks and
  data-driven coaching notes.
- **Data** — JSON export/import. No account, no backend, no tracking.

## Barcode scanning

Packaged foods are resolved with [Open Food Facts](https://world.openfoodfacts.org) — the open,
crowd-sourced food database (ODbL). No account or API key, and the API sends CORS headers, so it is
called directly from the browser:

```
GET https://world.openfoodfacts.org/api/v2/product/{barcode}.json?fields=…
```

Nutrition is read from the per-100 g fields (falling back to `energy_100g` in kJ, or per-serving
values scaled by `serving_quantity`), so scanned products land in the diary with real serving sizes
and, where available, a Nutri-Score and product image. Partial community entries are labelled
"Partial data" and you can correct them via **Edit values**, which opens the custom-food form.

Decoding runs entirely on-device:

- native `BarcodeDetector` in Chromium browsers (EAN-13, EAN-8, UPC-A, UPC-E);
- the [`barcode-detector`](https://github.com/Sec-ant/barcode-detector) ZXing-WASM ponyfill,
  dynamically imported (≈15 kB gzipped, WASM fetched once) for Safari and Firefox.

The scanner also accepts a photo of a barcode and manual 8–14 digit entry, and offers Gemini or a
custom food when a product is missing. Decoded numbers are sent to Open Food Facts; the camera feed
never leaves your device. Note the WASM reader is fetched from jsDelivr on first use by default —
self-host it via `prepareZXingModule` if you need a strict offline/CSP setup.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

Build for production:

```bash
npm run build
npm run preview
```

## Installing it as an app (PWA)

NutriScan ships a web manifest and a service worker, so it installs to a home screen and runs
full-screen without browser chrome:

- **Android / desktop Chromium** — an **Install app** button appears in *Profile → Install app* once
the browser offers it; the address-bar install icon works too.
- **iPhone / iPad** — Safari → **Share → Add to Home Screen** (iOS has no install prompt API; the
  profile card shows the same instructions).

Offline behaviour: the app shell is precached, so the diary, charts and fasting timer open without a
network. Open Food Facts lookups are network-first with a 90-day cache, so products you scanned stay
viewable offline; the Gemini API is never cached. Icons are generated with
`python3 scripts/make-icons.py`.

## Deploying to GitHub Pages

`.github/workflows/deploy.yml` builds and publishes the app on every push to `main`; the live site is
https://karlfredenhagen.github.io/nutriscan/. Pages is already set to **Source: GitHub Actions** for
this repository.

Publishing a fork:

1. Push it to GitHub (any name; the base path is derived automatically — `/<repo>/` for a project
   page, `/` for a `<user>.github.io` repo).
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. Push to `main` (or run the workflow manually). The site lands at
   `https://<user>.github.io/<repo>/`.

The build sets `VITE_BASE` so assets, the manifest, `start_url`, `scope` and the service worker all
resolve under the repository subpath. `scripts/postbuild.mjs` writes `404.html` (Pages has no SPA
rewrites) and `.nojekyll`. To test a project-page build locally:

```bash
VITE_BASE=/nutriscan/ npm run build && npx serve dist
```

**Caveat:** camera barcode scanning needs HTTPS — GitHub Pages provides it. If you fork this to a
repository with a different name, nothing else needs changing.

## Connecting Gemini

1. Create a free API key in [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Open **Profile → Gemini AI**, paste the key and press **Save & test**.
3. Pick a model. The default is `gemini-3.8-flash`; if a model isn't enabled for your key the client
   automatically falls back through `gemini-3.6-flash` → `gemini-3.5-flash-lite` → preview/legacy IDs.

The key is stored in `localStorage` and sent only to
`https://generativelanguage.googleapis.com`. Requests use `x-goog-api-key`, inline base64 images
(downscaled to 1024 px) and structured JSON output. Photos are never persisted.

> **Note on deployment:** this is a bring-your-own-key personal app. If you host it publicly,
> consider proxying Gemini through a small server so the key lives in a server-side secret instead of
> each visitor's browser.

## Verified behaviour

The flows below were exercised in a real headless Chromium session against the dev server
(`artifacts/` holds the screenshots): onboarding → target calculation → food search and portion
logging → entry edit/delete → custom foods → water and steps → AI text analysis (with a stubbed
Gemini response, asserting request shape, review UI, portion scaling and logging) → AI meal
suggestion → insights and weight chart → fasting start/end/history → profile, plan recalculation and
backup export. No console or page errors.

Barcode coverage: a stubbed Open Food Facts response asserts the exact request URL/fields, product
card, serving-sized portion default and the logged calories; an unknown barcode asserts the not-found
and custom-food path; a generated EAN-13 PNG is decoded by the WASM reader; the camera loop was run
against a synthetic camera device (1280×720, live). A real browser fetch to the live Open Food Facts
API returned Nutella with 539 kcal/100 g, confirming CORS end-to-end.

A live Gemini request could not be tested here because it needs a real API key.

## Tech

React 19 · TypeScript · Vite 7 · Tailwind CSS 4 · lucide-react · barcode-detector (lazy). No chart
or state libraries — charts are hand-rolled SVG and state is a small persisted React context.

```
src/
  lib/          nutrition math, Gemini client, date/format helpers
  data/foods.ts seed food database + search
  store.tsx     persistent state and all actions
  components/   onboarding, diary, food picker, AI logger, insights, fasting, profile
```

## What's not included (yet)

These Yazio features are deliberately out of scope for this build:

- **Recipe library and meal plans.**
- **Wearable / health-app step sync** — steps are entered manually.
- **Accounts, sync and social** — the diary is device-local by design.

## Disclaimers

Nutrition estimates are approximations, not medical advice. Fasting is not suitable for everyone
(pregnant people, under-18s, or anyone managing a condition that requires regular meals).
