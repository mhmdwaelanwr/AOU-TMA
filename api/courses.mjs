import { searchCourses } from '../serverless/shared.mjs';
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  const url = new URL(req.url, 'http://localhost');
  return res.status(200).json(searchCourses(url));
}
