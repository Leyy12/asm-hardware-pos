import { loadInventaCatalog } from '../_lib/inventaCatalog.js'

// GET /api/inventa/products[?segment=Hardware|Grocery|Pharmacy]
// Keys live only in Vercel's environment variables, never in code.
// See api/_lib/inventaCatalog.js for the variable names.
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const segment = typeof req.query?.segment === 'string' ? req.query.segment : null
  const { status, body } = await loadInventaCatalog({ segment })
  res.setHeader?.('Cache-Control', 'no-store')
  return res.status(status).json(body)
}
