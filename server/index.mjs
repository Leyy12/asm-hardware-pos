import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'

// Always read server/.env, whichever folder the server is started from.
dotenv.config({ path: fileURLToPath(new URL('./.env', import.meta.url)) })
import express from 'express'
import cors from 'cors'
import { loadInventaCatalog } from '../api/_lib/inventaCatalog.js'

const app = express()
const PORT = process.env.PORT || 3002  // vite.config.js proxies /api to 3002

// ─── CORS ─────────────────────────────────────────────────────────────────────
// Only allow requests from the Vite dev server.
// In production, update ALLOWED_ORIGIN to your deployed frontend URL.
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:5173'
app.use(cors({ origin: ALLOWED_ORIGIN, optionsSuccessStatus: 200 }))

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ─── GET /api/inventa/products[?segment=Hardware|Grocery|Pharmacy] ──────────
// Calls InventaAPI once per segment key in server/.env and combines the results.
// The keys never leave the server. See api/_lib/inventaCatalog.js.
app.get('/api/inventa/products', async (req, res) => {
  const segment = typeof req.query.segment === 'string' ? req.query.segment : null
  const { status, body } = await loadInventaCatalog({ segment })
  for (const s of body.segments || []) {
    if (!s.ok) console.error(`[ASM Backend] InventaAPI ${s.segment} key failed: ${s.error}`)
  }
  return res.status(status).json(body)
})

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[ASM Backend] Server running → http://localhost:${PORT}`)
  console.log(`[ASM Backend] Health:   http://localhost:${PORT}/api/health`)
  console.log(`[ASM Backend] Catalog:  http://localhost:${PORT}/api/inventa/products`)
  // NOTE: INVENTA_API_KEY is intentionally NOT logged here
})
