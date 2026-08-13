import { fx } from '../../serverless/shared.mjs';

const headers = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'public, max-age=60, s-maxage=300',
  'x-content-type-options': 'nosniff',
  'access-control-allow-origin': '*',
};

export default async (request) => {
  try {
    const url = new URL(request.url);
    const currency = url.searchParams.get('currency') || 'EGP';
    const result = await fx(currency);
    const status = result.status || 500;
    const body = result.body || { error: result.error, message: result.message };
    return new Response(JSON.stringify(body), {
      status,
      headers: {
        ...headers,
        'cache-control': status === 200 ? 'public, max-age=60, s-maxage=300' : 'no-store',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'internal_error', message: err?.message }), {
      status: 500,
      headers: { ...headers, 'cache-control': 'no-store' },
    });
  }
};
