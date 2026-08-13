import http from 'node:http';

const PORT = Number(process.env.PORT || 3001);
const FALLBACK_CACHE_TTL_MS = Number(process.env.FX_CACHE_TTL_MS || 60 * 60 * 1000);
const STALE_TTL_MS = Number(process.env.FX_STALE_TTL_MS || 48 * 60 * 60 * 1000);
const ALLOWED = ['EGP', 'KWD', 'SAR', 'LBP', 'JOD', 'BHD', 'OMR', 'SDG', 'ILS'];
const configuredOrigins = (process.env.CORS_ORIGINS || '*').split(',').map((value) => value.trim()).filter(Boolean);
let cache = {
  fetchedAt: 0,
  refreshAfter: 0,
  providerUpdatedAt: null,
  nextUpdateAt: null,
  rates: null,
  source: 'open.er-api.com',
};

function corsOrigin(requestOrigin) {
  if (configuredOrigins.includes('*')) return '*';
  if (requestOrigin && configuredOrigins.includes(requestOrigin)) return requestOrigin;
  return configuredOrigins[0] || 'null';
}

function commonHeaders(req, cacheControl = 'no-store') {
  return {
    'cache-control': cacheControl,
    'access-control-allow-origin': corsOrigin(req.headers.origin),
    'access-control-allow-methods': 'GET, OPTIONS',
    'access-control-allow-headers': 'Content-Type, Authorization',
    'vary': 'Origin',
    'x-content-type-options': 'nosniff',
  };
}

function send(req, res, status, payload, cacheControl = 'no-store') {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    ...commonHeaders(req, cacheControl),
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
  });
  res.end(body);
}

function sendNoContent(req, res) {
  res.writeHead(204, commonHeaders(req));
  res.end();
}

async function fetchRates() {
  const response = await fetch('https://open.er-api.com/v6/latest/EGP', {
    signal: AbortSignal.timeout(8000),
    headers: { 'user-agent': 'aou-tma-hub/2.0' },
  });
  if (!response.ok) throw new Error(`fx_provider_${response.status}`);
  const payload = await response.json();
  if (!payload?.rates || payload.result === 'error') throw new Error('invalid_fx_payload');
  return payload;
}

function isoFromUnix(value) {
  return Number.isFinite(value) && value > 0 ? new Date(value * 1000).toISOString() : null;
}

function refreshTime(payload, now) {
  const providerNext = Number(payload.time_next_update_unix) * 1000;
  if (Number.isFinite(providerNext) && providerNext > now) {
    return providerNext + 60_000;
  }
  return now + FALLBACK_CACHE_TTL_MS;
}

async function getRates() {
  const now = Date.now();
  if (cache.rates && now < cache.refreshAfter) return { ...cache, status: 'fresh' };

  try {
    const payload = await fetchRates();
    cache = {
      fetchedAt: now,
      refreshAfter: refreshTime(payload, now),
      providerUpdatedAt: isoFromUnix(Number(payload.time_last_update_unix)),
      nextUpdateAt: isoFromUnix(Number(payload.time_next_update_unix)),
      rates: payload.rates,
      source: 'open.er-api.com',
    };
    return { ...cache, status: 'fresh' };
  } catch (error) {
    if (cache.rates && now - cache.fetchedAt < STALE_TTL_MS) {
      return { ...cache, status: 'stale', warning: error.message };
    }
    throw error;
  }
}

function ratePayload(currency, result) {
  const rate = currency === 'EGP' ? 1 : result.rates?.[currency];
  if (!rate) return null;
  return {
    base: 'EGP',
    currency,
    rate,
    source: currency === 'EGP' ? 'base' : result.source,
    cachedAt: new Date(result.fetchedAt || Date.now()).toISOString(),
    providerUpdatedAt: result.providerUpdatedAt || null,
    nextUpdateAt: result.nextUpdateAt || null,
    status: currency === 'EGP' ? 'base' : result.status,
  };
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return sendNoContent(req, res);
  if (req.method !== 'GET') return send(req, res, 405, { error: 'method_not_allowed' });

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if (url.pathname === '/health') return send(req, res, 200, { ok: true, service: 'fx-service', version: '2.0.0' });
  if (url.pathname === '/api/currencies') return send(req, res, 200, { base: 'EGP', currencies: ALLOWED });
  if (url.pathname === '/api/fx/EGP') {
    return send(
      req,
      res,
      200,
      ratePayload('EGP', { fetchedAt: Date.now(), rates: {}, status: 'base' }),
      'public, max-age=300',
    );
  }

  if (url.pathname === '/api/fx' && url.searchParams.get('currency')) {
    const currency = url.searchParams.get('currency').toUpperCase();
    if (!ALLOWED.includes(currency)) return send(req, res, 400, { error: 'unsupported_currency' });
    try {
      const result = await getRates();
      const payload = ratePayload(currency, result);
      if (!payload) return send(req, res, 502, { error: 'rate_unavailable' });
      return send(req, res, 200, payload, 'public, max-age=60, stale-while-revalidate=300');
    } catch (error) {
      return send(req, res, 503, { error: 'fx_unavailable', message: error.message });
    }
  }

  if (url.pathname === '/api/fx') {
    try {
      const result = await getRates();
      const rates = Object.fromEntries(ALLOWED.map((currency) => [currency, currency === 'EGP' ? 1 : result.rates[currency]]));
      return send(req, res, 200, {
        base: 'EGP',
        rates,
        source: result.source,
        cachedAt: new Date(result.fetchedAt).toISOString(),
        providerUpdatedAt: result.providerUpdatedAt,
        nextUpdateAt: result.nextUpdateAt,
        status: result.status,
      }, 'public, max-age=60, stale-while-revalidate=300');
    } catch (error) {
      return send(req, res, 503, { error: 'fx_unavailable', message: error.message });
    }
  }

  const match = url.pathname.match(/^\/api\/fx\/([A-Za-z]{3})$/);
  if (match) {
    const currency = match[1].toUpperCase();
    if (!ALLOWED.includes(currency)) return send(req, res, 400, { error: 'unsupported_currency' });
    try {
      const result = await getRates();
      const payload = ratePayload(currency, result);
      if (!payload) return send(req, res, 502, { error: 'rate_unavailable' });
      return send(req, res, 200, payload, 'public, max-age=60, stale-while-revalidate=300');
    } catch (error) {
      return send(req, res, 503, { error: 'fx_unavailable', message: error.message });
    }
  }

  return send(req, res, 404, { error: 'not_found' });
});

server.listen(PORT, '0.0.0.0', () => console.log(`FX service listening on ${PORT}`));
