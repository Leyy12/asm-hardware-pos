/* global process */
// Shared InventaAPI catalog loader, used by the Vercel function
// (api/inventa/products.js) and `npm run dev` (vite.config.js).
// Vercel does not turn files in folders starting with "_" into endpoints.
//
// InventaAPI gives one API key per segment, and each key returns only the
// products linked to it. Set one variable per segment you want to show:
//   INVENTA_API_KEY_HARDWARE, INVENTA_API_KEY_GROCERY, INVENTA_API_KEY_PHARMACY
// The older single INVENTA_API_KEY still works and counts as Hardware.

export const SEGMENTS = ['Hardware', 'Grocery', 'Pharmacy']
const MAX_PAGES = 20 // safety stop when following ?page=N

export function inventaApiUrl(env = process.env) {
  return (env.INVENTA_API_URL || 'https://inventaapi.shop').trim().replace(/\/+$/, '')
}

// Returns [{ segment, key }] for every segment that has a key set.
export function configuredKeys(env = process.env) {
  const keys = []
  for (const segment of SEGMENTS) {
    let key = (env[`INVENTA_API_KEY_${segment.toUpperCase()}`] || '').trim()
    if (!key && segment === 'Hardware') key = (env.INVENTA_API_KEY || '').trim()
    if (key) keys.push({ segment, key })
  }
  return keys
}

function errorMessage(status) {
  switch (status) {
    case 401: return 'Authentication failed. The API key is wrong, expired, or revoked.'
    case 403: return 'This API key does not have permission for the catalog.'
    case 429: return 'Rate limit or monthly quota reached. Try again later.'
    default: return `InventaAPI returned ${status}. The service may be unavailable.`
  }
}

// Loads every page of one key's catalog. Throws { status, message } on failure.
async function loadSegment({ apiUrl, segment, key, fetchImpl }) {
  const products = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    let res
    try {
      res = await fetchImpl(`${apiUrl}/daas/v1/catalog?page=${page}`, {
        headers: { 'x-api-key': key, Accept: 'application/json' },
      })
    } catch (err) {
      throw { status: 503, message: `Unable to reach InventaAPI at ${apiUrl}: ${err.message}` }
    }
    if (!res.ok) throw { status: res.status, message: errorMessage(res.status) }

    const body = await res.json()
    const list = Array.isArray(body) ? body : (body.products ?? [])
    // Tag each product with the key it came from, so the page can filter by segment.
    for (const p of list) products.push({ ...p, inventaSegment: segment })

    if (!body?.meta?.pagination?.hasNextPage) break
  }
  return products
}

// Calls InventaAPI once per configured key (in parallel) and combines the results.
// One failing key does not hide the others; its error is listed in `segments`.
// Returns { status, body } ready to send as JSON.
export async function loadInventaCatalog({ env = process.env, fetchImpl = fetch, segment = null } = {}) {
  const apiUrl = inventaApiUrl(env)
  let keys = configuredKeys(env)
  if (segment) keys = keys.filter(k => k.segment.toLowerCase() === String(segment).toLowerCase())

  if (keys.length === 0) {
    return {
      status: 503,
      body: {
        error: segment
          ? `No InventaAPI key is set for the ${segment} segment.`
          : 'InventaAPI not configured. Set INVENTA_API_KEY_HARDWARE, INVENTA_API_KEY_GROCERY and/or INVENTA_API_KEY_PHARMACY.',
      },
    }
  }

  const results = await Promise.allSettled(
    keys.map(k => loadSegment({ apiUrl, segment: k.segment, key: k.key, fetchImpl }))
  )

  const products = []
  const segments = results.map((r, i) => {
    const name = keys[i].segment
    if (r.status === 'fulfilled') {
      products.push(...r.value)
      return { segment: name, ok: true, count: r.value.length }
    }
    return { segment: name, ok: false, status: r.reason?.status || 502, error: r.reason?.message || 'Unknown error' }
  })

  const failed = segments.filter(s => !s.ok)
  if (failed.length === segments.length) {
    // Every key failed: pass on the first error's status so the page shows it.
    const first = failed[0]
    const status = [401, 403, 429, 503].includes(first.status) ? first.status : 502
    const detail = failed.map(s => `${s.segment}: ${s.error}`).join(' ')
    return { status, body: { error: `InventaAPI request failed. ${detail}`, segments } }
  }

  return { status: 200, body: { status: 'success', products, segments } }
}
