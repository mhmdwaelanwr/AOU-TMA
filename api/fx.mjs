import { fx } from '../serverless/shared.mjs';
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  const url = new URL(req.url, 'http://localhost');
  const result = await fx(url.searchParams.get('currency') || 'EGP');
  return res.status(result.status).json(result.body || { error: result.error, message: result.message });
}
