import 'dotenv/config'
import express from 'express'
import cors from 'cors'

const app = express()
const PORT = process.env.PORT || 3001

// ─── CORS ─────────────────────────────────────────────────────────────────────
// Only allow requests from the Vite dev server.
// In production, update ALLOWED_ORIGIN to your deployed frontend URL.
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:5173'
app.use(cors({ origin: ALLOWED_ORIGIN, optionsSuccessStatus: 200 }))

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ─── GET /api/inventa/products ────────────────────────────────────────────────
// Securely proxies: GET ${INVENTA_API_URL}/daas/v1/catalog
// The INVENTA_API_KEY never leaves the server.
app.get('/api/inventa/products', async (_req, res) => {
  const apiUrl  = process.env.INVENTA_API_URL
  const apiKey  = process.env.INVENTA_API_KEY

  // Guard: refuse to proceed if the key is missing
  if (!apiKey || !apiUrl) {
    return res.status(503).json({
      error: 'InventaAPI not configured. Set INVENTA_API_URL and INVENTA_API_KEY in server/.env'
    })
  }

  const endpoint = `${apiUrl}/daas/v1/catalog`

  try {
    const upstream = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json'
      }
    })

    // ── Map upstream status codes to safe messages ──────────────────────────
    if (!upstream.ok) {
      switch (upstream.status) {
        case 401:
          return res.status(401).json({ error: 'InventaAPI authentication failed. Check your API key.' })
        case 403:
          return res.status(403).json({ error: 'InventaAPI key does not have permission for DaaS.' })
        case 429:
          return res.status(429).json({ error: 'InventaAPI rate limit reached. Try again later.' })
        default:
          return res.status(502).json({ error: `InventaAPI returned ${upstream.status}. Service may be unavailable.` })
      }
    }

    const data = await upstream.json()

    // Forward the catalog data to the browser (no secret key included)
    return res.json(data)

  } catch (err) {
    // Network-level failure (InventaAPI unreachable)
    console.error('[ASM Backend] Unable to reach InventaAPI:', err.message)
    return res.status(503).json({ error: 'Unable to connect to InventaAPI. Ensure it is running on ' + apiUrl })
  }
})

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[ASM Backend] Server running → http://localhost:${PORT}`)
  console.log(`[ASM Backend] Health:   http://localhost:${PORT}/api/health`)
  console.log(`[ASM Backend] Catalog:  http://localhost:${PORT}/api/inventa/products`)
  // NOTE: INVENTA_API_KEY is intentionally NOT logged here
})
