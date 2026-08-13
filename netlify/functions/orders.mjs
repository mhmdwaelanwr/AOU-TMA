import { createServerlessOrder } from '../../serverless/shared.mjs';

const headers = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'Content-Type',
};

export default async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers });
  }
  let payload = {};
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ detail: 'invalid_json' }), { status: 400, headers });
  }
  try {
    const result = await createServerlessOrder(payload);
    return new Response(JSON.stringify(result.body), { status: result.status, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'internal_error', message: err?.message }), {
      status: 500,
      headers,
    });
  }
};
