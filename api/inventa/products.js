export default async function handler(req, res) {
  // Allow GET requests only
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const apiUrl = process.env.INVENTA_API_URL || 'https://inventa-api-theta.vercel.app'
  const apiKey = process.env.INVENTA_API_KEY || 'daas_v2_8115ff6d9b3410886f67b6971855d706.d345ebc499f462cac3f24dc159542264a4a14afd2b3c3fe9bc7d0506d585da24'

  if (!apiKey || !apiUrl) {
    return res.status(503).json({
      error: 'InventaAPI not configured. Set INVENTA_API_URL and INVENTA_API_KEY in environment variables.'
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
