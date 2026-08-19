import { listBranches } from '../../serverless/shared.mjs';

const headers = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'public, max-age=86400, s-maxage=604800',
  'x-content-type-options': 'nosniff',
  'access-control-allow-origin': '*',
};

export default async () => {
  try {
    const result = listBranches();
    return new Response(JSON.stringify(result), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'internal_error', message: err?.message }), {
      status: 500,
      headers: { ...headers, 'cache-control': 'no-store' },
    });
  }
};
