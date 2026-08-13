import { createServerlessOrder } from '../serverless/shared.mjs';
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  let payload = req.body || {};
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); } catch { return res.status(400).json({ detail: 'invalid_json' }); }
  }
  const result = await createServerlessOrder(payload);
  return res.status(result.status).json(result.body);
}
