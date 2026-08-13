const AOU_COUNTRIES = new Set(['EG', 'KW', 'SA', 'LB', 'JO', 'BH', 'OM', 'SD', 'PS']);

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  const header = req.headers['x-vercel-ip-country'] || req.headers['x-country-code'] || '';
  const countryCode = String(header).trim().toUpperCase();
  const supported = AOU_COUNTRIES.has(countryCode);
  return res.status(200).json({ countryCode: supported ? countryCode : null, supported, source: countryCode ? 'edge-header' : 'browser-fallback' });
}
