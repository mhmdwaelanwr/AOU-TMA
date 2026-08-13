# AOU TMA Hub — V3 Pro

A production-oriented full-stack catalog and request experience for AOU TMA services. The V2 rebuild moves the original prototype to a reusable design system, responsive bilingual UI, server-side FX handling and persisted orders.

## Product highlights

- 217 searchable course entries across four faculties.
- Arabic + English with real RTL/LTR switching.
- Semantic Light/Dark themes shared between Figma and CSS.
- Nine product currencies: EGP, KWD, SAR, LBP, JOD, BHD, OMR, SDG and ILS.
- Latest available FX conversion with client cache, server cache and safe EGP fallback.
- Faculty filters, sorting, skeleton loading, empty/error states and progressive “load more”.
- Accessible order modal with validation, success state and generated Order ID.
- SQLite order persistence in a Docker volume.
- Same-origin Nginx reverse proxy for the React production container.
- GitHub Actions checks for frontend build, FastAPI tests and Node syntax.

## Stack

```text
frontend/        React 19 + TypeScript + Vite
backend-python/  Python 3.13 + FastAPI + SQLite
backend-node/    Node.js 22 native HTTP + Fetch (zero runtime packages)
```

Architecture details: `docs/ARCHITECTURE.md`.

## Run production-style with Docker

```bash
docker compose up --build
```

Open `http://localhost:5173`.

The frontend container is built with Vite and served by Nginx. Nginx proxies catalog/order requests to FastAPI and FX requests to the Node service so the browser stays on one origin.

## Run development mode

```bash
docker compose -f docker-compose.dev.yml up --build
```

Or run each service directly using the `.env.example` files in its folder.

## Useful endpoints

```text
GET  /health
GET  /api/meta
GET  /api/courses?q=TM105&faculty=all
GET  /api/courses/TM105
POST /api/orders

GET  /api/currencies
GET  /api/fx/EGP
GET  /api/fx/KWD
```

## FX behavior

Base course prices are stored in EGP. The Node service requests the latest available EGP-based rates from ExchangeRate-API, uses the provider’s own next-update timestamp to decide when to refresh (with a one-hour fallback TTL), and may serve its last successful value for up to 48 hours if the upstream source is temporarily unavailable. The UI labels this as “latest” rather than implying tick-by-tick market pricing.

## Tests

```bash
cd backend-python
pip install -r requirements-dev.txt
pytest -q

cd ../backend-node
node --check src/index.js

cd ../frontend
npm install
npm run build
```

## Figma

Editable product file: https://www.figma.com/design/nx6k9oAx6QXT90Rmn69SdT

The V2 page contains desktop Light/Dark, Arabic mobile Light/Dark, semantic variables and reusable components. See `docs/FIGMA.md`.

## V3 — Official AOU course titles + icon system

The catalog now preserves the course title beside its code using the current AOU Egypt faculty catalogues supplied for this project. Exact-code matching is deliberately strict: when a TMA code is not present verbatim in the current catalogue, its title remains `null` and `titleStatus` is `not_found_in_current_catalogue` rather than guessing or aliasing a different course.

Saved backend catalog data:

```text
backend-python/app/courses.json             Runtime TMA catalog (217 records)
backend-python/app/course_catalogue.json    Portable catalog snapshot + source metadata
backend-python/app/course_titles.json       Lightweight code → title lookup
backend-python/app/catalogue_sources.json   Official AOU catalogue source URLs
backend-python/app/unresolved_course_codes.json Exact TMA codes not found in the current catalogues
```

Current enrichment result: **150 / 217** TMA records have an exact current-catalogue title; **67** retain a clearly marked unresolved title. The API search now matches both course code and official title.

Official catalogue sources used:

```text
https://www.aou.edu.eg/faculties/media/Pages/course-catalogue.aspx
https://www.aou.edu.eg/faculties/business/Pages/course-catalogue.aspx
https://www.aou.edu.eg/faculties/language/Pages/course-catalogue.aspx
https://www.aou.edu.eg/faculties/computer/Pages/course-catalogue.aspx
https://www.aou.edu.eg/faculties/education/Pages/course-catalogue.aspx
```

The frontend and Figma UI now use a consistent icon language for course cards, filters, stats, currency/language controls and the order flow. Course cards show **code → official title → faculty** as their information hierarchy.


## V4: official descriptions, semantic icons, and payment options

This package extends the course catalogue with:

- `description`, `descriptionStatus`, and `descriptionSource` fields in `backend-python/app/courses.json`.
- `backend-python/app/course_descriptions.json`, a compact course-description/icon lookup file.
- Semantic `icon` values derived from each course title and description (programming, data, finance, management, languages, education, media, law, health, etc.).
- React course cards and the order dialog show the official description when available and link back to the AOU catalogue source.
- Payment options endpoint and UI for Vodafone Cash, Orange Cash, e& cash, WE Pay, InstaPay, USDT TRC20, and USDT BEP20.
- Payment receiving destinations are **not hard-coded**. Set them with environment variables before deployment.
- `backend-python/scripts/sync_aou_catalogue.py` fetches official course titles/descriptions from the same AOU Egypt faculty catalogue pages and updates the local JSON dataset.
- `.github/workflows/sync-aou-catalogue.yml` can refresh the official catalogue weekly or on demand.

### Payment environment variables

```env
VODAFONE_CASH_NUMBER=
ORANGE_CASH_NUMBER=
ETISALAT_CASH_NUMBER=
WE_PAY_NUMBER=
INSTAPAY_ADDRESS=
USDT_TRC20_ADDRESS=
USDT_BEP20_ADDRESS=
```

Only configure networks/addresses you actually support. For USDT the customer must use the exact network shown in the checkout.

### Refresh official AOU descriptions

```bash
cd backend-python
python -m pip install -r scripts/requirements-sync.txt
python scripts/sync_aou_catalogue.py
```

Official catalogue sources:

- Computer Studies: `https://www.aou.edu.eg/faculties/computer/Pages/course-catalogue.aspx`
- Business Studies: `https://www.aou.edu.eg/faculties/business/Pages/course-catalogue.aspx`
- Language Studies: `https://www.aou.edu.eg/faculties/language/Pages/course-catalogue.aspx`
- Education: `https://www.aou.edu.eg/faculties/education/Pages/course-catalogue.aspx`
- Media: `https://www.aou.edu.eg/faculties/media/Pages/course-catalogue.aspx`

## V4.1 — Live server + Vercel / Netlify deployment

### One-command live development

First-time setup:

```bash
npm run setup
```

Then run the entire project with hot reload:

```bash
npm run live
```

Open `http://localhost:5173`. This starts Vite/React on 5173, FastAPI on 8000, and the Node FX service on 3001.

### Vercel

The repository root now contains `vercel.json` plus serverless handlers under `api/`. Import the repository in Vercel and deploy from the repository root. The frontend automatically uses same-origin `/api/*` endpoints in production, so `VITE_API_URL` and `VITE_FX_URL` can remain unset.

### Netlify

The repository root contains `netlify.toml` plus functions in `netlify/functions/`. Import the repository in Netlify from the repository root; the configured build produces `frontend/dist` and redirects `/api/*` to the functions.

### Payment environment variables on Vercel / Netlify

Configure the same payment secrets in the hosting dashboard:

```env
VODAFONE_CASH_NUMBER=
ORANGE_CASH_NUMBER=
ETISALAT_CASH_NUMBER=
WE_PAY_NUMBER=
INSTAPAY_ADDRESS=
USDT_TRC20_ADDRESS=
USDT_BEP20_ADDRESS=
```

### Serverless order persistence

Local/Docker mode persists orders in SQLite through FastAPI. Vercel/Netlify serverless filesystems are not treated as durable order storage by this project. Set `ORDER_WEBHOOK_URL` to forward each accepted order to your own durable endpoint/automation. Without it, the serverless endpoint still validates the request and returns an Order ID, but it is not persisted server-side.
