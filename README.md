# AOU TMA Hub — Full-Stack Systems Prototype

A bilingual full-stack catalog and request-flow project built around Arab Open University course metadata. The repository demonstrates responsive product UI, catalog enrichment, backend APIs, persisted requests, currency conversion, deployment patterns, and payment-method configuration.

> **Independent project — not affiliated with or endorsed by Arab Open University.** Any real-world use must comply with university rules and applicable academic-integrity policies. The software must not be used to submit work authored by another person, impersonate a student, or outsource assessed coursework where those activities are prohibited.

## Engineering scope

- Searchable course catalog with faculty filtering and progressive loading.
- Arabic + English UI with RTL / LTR switching.
- Semantic light / dark themes.
- Multi-currency display with server-side FX retrieval, caching, and EGP fallback.
- Accessible request/order modal with validation and generated IDs.
- SQLite persistence for local / Docker mode.
- React production build served through Nginx.
- Same-origin proxying for frontend, FastAPI, and FX-service requests.
- GitHub Actions checks for frontend build, FastAPI tests, and Node syntax.
- Vercel and Netlify serverless deployment adapters.
- Optional durable-order forwarding through `ORDER_WEBHOOK_URL` for serverless deployments.

## Stack

```text
frontend/        React 19 + TypeScript + Vite
backend-python/  Python 3.13 + FastAPI + SQLite
backend-node/    Node.js 22 native HTTP + Fetch
```

Architecture details live in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Run with Docker

```bash
docker compose up --build
```

Open:

```text
http://localhost:5173
```

The frontend container is built with Vite and served by Nginx. Nginx proxies catalog / request traffic to FastAPI and FX requests to the Node service so the browser remains on one origin.

## Development mode

First-time setup:

```bash
npm run setup
```

Run the project with hot reload:

```bash
npm run live
```

The development topology uses:

```text
Vite / React     localhost:5173
FastAPI          localhost:8000
Node FX service  localhost:3001
```

The Docker development stack is also available:

```bash
docker compose -f docker-compose.dev.yml up --build
```

## API examples

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

## Course catalog enrichment

The project stores course codes and enriches them with current titles / descriptions when an exact match is available from the public AOU Egypt faculty catalogues.

The matching policy is deliberately strict: an unresolved code remains unresolved rather than being guessed or silently mapped to a different course.

Relevant generated data includes:

```text
backend-python/app/courses.json
backend-python/app/course_catalogue.json
backend-python/app/course_titles.json
backend-python/app/catalogue_sources.json
backend-python/app/unresolved_course_codes.json
backend-python/app/course_descriptions.json
```

The repository's recorded enrichment state contains 217 catalog records, with 150 exact title matches and 67 codes explicitly retained as unresolved in the current catalogue snapshot.

### Catalogue sources

- Computer Studies: `https://www.aou.edu.eg/faculties/computer/Pages/course-catalogue.aspx`
- Business Studies: `https://www.aou.edu.eg/faculties/business/Pages/course-catalogue.aspx`
- Language Studies: `https://www.aou.edu.eg/faculties/language/Pages/course-catalogue.aspx`
- Education: `https://www.aou.edu.eg/faculties/education/Pages/course-catalogue.aspx`
- Media: `https://www.aou.edu.eg/faculties/media/Pages/course-catalogue.aspx`

Refresh the local snapshot with:

```bash
cd backend-python
python -m pip install -r scripts/requirements-sync.txt
python scripts/sync_aou_catalogue.py
```

## FX behavior

Base prices are stored in EGP. The Node service requests EGP-based rates from ExchangeRate-API and uses the provider's next-update metadata when available, with a one-hour fallback TTL. The service may retain its last successful value for up to 48 hours during an upstream outage.

The UI describes this data as the **latest available** rate rather than implying tick-by-tick market pricing.

## Payment-method configuration

The application can expose configured payment methods, including Egyptian mobile wallets, InstaPay, and selected USDT networks.

Receiving destinations are intentionally supplied through environment variables rather than hard-coded in source:

```env
VODAFONE_CASH_NUMBER=
ORANGE_CASH_NUMBER=
ETISALAT_CASH_NUMBER=
WE_PAY_NUMBER=
INSTAPAY_ADDRESS=
USDT_TRC20_ADDRESS=
USDT_BEP20_ADDRESS=
```

Only configure payment methods and networks you are legally and operationally prepared to support. Do not commit receiving secrets or private credentials.

## Serverless persistence boundary

Local / Docker mode persists requests in SQLite through FastAPI.

Vercel and Netlify serverless filesystems are **not** treated as durable order storage. Set `ORDER_WEBHOOK_URL` to forward accepted requests to an external durable system. Without it, the serverless endpoint can validate a request and return an ID, but that request is not represented as durably persisted by the serverless filesystem.

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

## Design source

Editable Figma file:

`https://www.figma.com/design/nx6k9oAx6QXT90Rmn69SdT`

The design system includes desktop and mobile states, light / dark themes, Arabic RTL layouts, semantic variables, and reusable components. See [`docs/FIGMA.md`](docs/FIGMA.md).

## Deployment

### Vercel

The repository root contains `vercel.json` plus serverless handlers under `api/`. Import the repository from the root. The frontend uses same-origin `/api/*` endpoints in production.

### Netlify

The repository root contains `netlify.toml` and functions under `netlify/functions/`. The configured build produces `frontend/dist` and routes `/api/*` to the functions.

## Academic-integrity and affiliation notice

This repository is a software-engineering project, not an official AOU system. Public university course metadata is used only as the catalog domain for the application.

Users remain responsible for complying with their university's academic-integrity, assessment, copyright, and conduct rules. Nothing in this repository authorizes plagiarism, impersonation, unauthorized collaboration, or submission of third-party work as a student's own.