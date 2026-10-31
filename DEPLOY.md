# Deploy / Live Server

## Local hot-reload live server

```bash
npm run setup
npm run live
```

Open: http://localhost:5173

Services:
- React/Vite: 5173
- FastAPI: 8000
- FX Node service: 3001

## Vercel Services (proposed multi-service project)

**Do not deploy to production until the service names, public route prefixes,
internal binding, and persistence plan have been confirmed.**

Import the repository from its root (not from `frontend/`). The root
`vercel.json` uses the current Vercel Services model:

| Service | Root | Runtime | Public route |
|---|---|---|---|
| `frontend` | `frontend` | Vite (static) | `/(.*)` catch-all |
| `backend-python` | `backend-python` | FastAPI (`app.main:app`) | `/api`, `/api/*`, `/health` |
| `backend-node` | `backend-node` | Container (`Dockerfile`) | **Internal only** |

### Internal communication

`backend-python` declares this runtime-only binding to `backend-node`:

```json
{ "type": "service", "service": "backend-node", "format": "url", "env": "FX_INTERNAL_URL" }
```

FastAPI reads `FX_INTERNAL_URL` at **request time** to fetch the
private Node routes `/api/fx?currency=KWD` and `/api/currencies`.
The public browser requests remain `/api/fx`, `/api/currencies`,
`/api/courses`, etc. Rewrites keep the original path intact, and the
Node container is not exposed by a public rewrite.

Do **not** add `FX_INTERNAL_URL` manually to Vercel environment
variables, nor reference it in Vite/browser code: Vercel injects it only
into the calling FastAPI runtime.

### Local verification

```bash
npx vercel dev -L
# Another terminal:
curl http://localhost:3000/health
curl http://localhost:3000/api/courses?q=TM105
curl http://localhost:3000/api/currencies
curl 'http://localhost:3000/api/fx?currency=KWD'
```

The local port printed by Vercel takes precedence over `3000`.
The container service requires Docker to be running. `npm run live`
remains available as the original three-process development mode.

### IMPORTANT: persistence and account limitations

The FastAPI app currently uses **SQLite files**, which are not
durable in Vercel Functions. In the Vercel runtime the DB defaults to
`/tmp/aou-tma-orders.db` only so read-side startup can initialize.
The app returns HTTP **503** for POST, PUT, PATCH and DELETE
to avoid creating accounts/orders/payments that may silently disappear.
Catalog, health and FX endpoints still work.

For production accounts, referrals, orders, complaints and
payments, migrate SQLite to a durable managed database and remove this
guard only after durable persistence is implemented and tested.
Do **not** set `VITE_ACCOUNT_BACKEND=true` on Vercel until then;
the frontend currently hides the account-based navigation by default.
The frontend's order form may report `durable_storage_required`
until persistence is implemented.

The previous root `api/*.mjs` serverless adapters are no longer
the active Vercel route entrypoints when using `services`.
Netlify continues to use `netlify.toml`.

### Environment variables

Use project settings for `JWT_SECRET`, `GOOGLE_CLIENT_ID`,
`ADMIN_USER_IDS` and payment destinations **only when their
backend functionality is enabled with durable storage**. Frontend
client URLs default to same-origin and should not be pointed at
Docker hostnames. Do not set `FX_INTERNAL_URL` yourself.

## Netlify

1. Push this folder to GitHub.
2. Import the repository in Netlify.
3. Keep Base directory empty / repository root.
4. `netlify.toml` supplies the build, publish folder and function redirects.
5. Add payment environment variables in Site configuration → Environment variables.
6. Deploy.

## Payment variables

```env
VODAFONE_CASH_NUMBER=
ORANGE_CASH_NUMBER=
ETISALAT_CASH_NUMBER=
WE_PAY_NUMBER=
INSTAPAY_ADDRESS=
USDT_TRC20_ADDRESS=
USDT_BEP20_ADDRESS=
```

## Durable orders on serverless hosting

For local/Docker mode, FastAPI stores orders in SQLite.

For the **legacy Netlify adapter** (not this new Vercel Services configuration), set:

```env
ORDER_WEBHOOK_URL=https://your-durable-order-receiver.example/webhook
```

The serverless order function forwards the validated order to this endpoint. Without a webhook, the legacy serverless order endpoint returns HTTP 503 and does not claim durable storage.

## Production safety requirements

- The new Vercel Services deployment routes all `/api/*` requests to FastAPI, but blocks state-changing endpoints until a durable datastore replaces local SQLite. The legacy Netlify adapter continues to use its separate serverless handlers.
- Set `ORDER_WEBHOOK_URL` to an **HTTPS** endpoint that validates and durably stores orders before acknowledging them. Without it, the serverless API returns HTTP 503 and does not claim a request was submitted.
- In FastAPI deployments, set a strong `JWT_SECRET`, and use `ADMIN_USER_IDS` (comma-separated verified internal user IDs) to grant admin access. **Never grant admin rights by an unverified sign-up email.**
- Google login uses verified Google ID tokens, not client-supplied email addresses. Configure matching `GOOGLE_CLIENT_ID` on FastAPI and `VITE_GOOGLE_CLIENT_ID` for the frontend build to enable it.
- Do not collect, submit, or store LMS passwords or university login credentials.
