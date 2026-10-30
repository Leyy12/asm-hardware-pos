export default async function handler(req, res) {
  // Allow GET requests only
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  // The key decides which products come back, so it must be the store's
  // Hardware API key. It lives only in Vercel's environment, never in code.
  const apiUrl = (process.env.INVENTA_API_URL || 'https://inventaapi.shop').replace(/\/+$/, '')
  const apiKey = process.env.INVENTA_API_KEY

  if (!apiKey || !apiUrl) {
    return res.status(503).json({
      error: 'InventaAPI not configured. Set INVENTA_API_KEY (the Hardware API key) in the Vercel environment variables.'
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
    return res.status(200).json(data)
  } catch (err) {
    return res.status(503).json({ error: 'Unable to connect to upstream InventaAPI: ' + err.message })
  }
}
