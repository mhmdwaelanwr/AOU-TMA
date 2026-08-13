# Architecture

## Runtime

```text
Browser
  │
  ▼
Nginx / React SPA (:5173)
  ├── /catalog-api/* ──► FastAPI (:8000) ──► SQLite volume
  └── /fx-api/*      ──► Node 22 FX service (:3001) ──► ExchangeRate-API
```

## Responsibilities

### React frontend
- Search, faculty filtering and progressive rendering.
- Arabic/English with document-level RTL/LTR switching.
- Semantic light/dark theme tokens stored in `localStorage`.
- Currency selection and safe FX fallback to EGP when no usable rate exists.
- Accessible order dialog with validation, success and failure states.

### FastAPI catalog/order API
- Owns the 217-course catalog.
- Validates course and currency input.
- Persists incoming orders in SQLite.
- Exposes health and metadata endpoints.

### Node FX service
- Zero third-party runtime dependencies.
- Fetches EGP-based rates server-side.
- Refresh timing follows the upstream provider’s `time_next_update` value, with a one-hour fallback TTL.
- Up to 48-hour stale fallback when the upstream provider is temporarily unreachable.
- Only exposes the currencies supported by this product.

## Production boundaries
- Do not expose the SQLite database over HTTP.
- Put TLS at the reverse proxy / hosting layer.
- Set `CORS_ORIGINS` to the real frontend origin in deployments that bypass the included same-origin Nginx proxy.
- Back up the `orders-data` volume before destructive deployments.
