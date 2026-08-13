const AOU_COUNTRIES = new Set(['EG', 'KW', 'SA', 'LB', 'JO', 'BH', 'OM', 'SD', 'PS']);

export default async (request, context) => {
  const header = context?.geo?.country?.code || request.headers.get('x-nf-country') || request.headers.get('x-country-code') || '';
  const countryCode = String(header).trim().toUpperCase();
  const supported = AOU_COUNTRIES.has(countryCode);
  return new Response(JSON.stringify({ countryCode: supported ? countryCode : null, supported, source: countryCode ? 'edge-geo' : 'browser-fallback' }), {
    status: 200,
    headers: { 'content-type':'application/json; charset=utf-8', 'cache-control':'private, no-store', 'x-content-type-options':'nosniff' },
  });
};
