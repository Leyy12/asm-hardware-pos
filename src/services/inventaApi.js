/**
 * inventaApi.js — ASM Hardware frontend service for InventaAPI
 *
 * SECURITY: This file knows NOTHING about the INVENTA_API_KEY.
 * All calls go to /api/inventa/products (ASM backend).
 * Locally, `npm run dev` answers this route (see vite.config.js); on Vercel it is
 * api/inventa/products.js. Both read the keys from environment variables.
 * The backend then securely calls InventaAPI with the secret key.
 */

const BASE = '/api/inventa'

/**
 * Fetch products from the InventaAPI DaaS catalog via the secure ASM backend.
 * The backend calls InventaAPI once per segment key (Hardware, Grocery,
 * Pharmacy) and tags each product with `inventaSegment`.
 *
 * `segments` lists each key's result, e.g.
 *   [{ segment: 'Hardware', ok: true, count: 2 },
 *    { segment: 'Grocery', ok: false, error: '...' }]
 *
 * @returns {Promise<{ ok: boolean, data: any[], segments: any[], error: string|null }>}
 */
export async function fetchInventaProducts() {
  try {
    const res = await fetch(`${BASE}/products`)
    const body = await res.json()
    const segments = Array.isArray(body.segments) ? body.segments : []

    if (!res.ok) {
      return { ok: false, data: [], segments, error: body.error || `Server returned ${res.status}` }
    }

    // InventaAPI may return an array directly or { products: [...] }
    // Normalise both shapes here so the component doesn't need to care.
    const products = Array.isArray(body)
      ? body
      : (body.products ?? body.catalog ?? body.data ?? body.items ?? [])

    return { ok: true, data: products, segments, error: null }
  } catch {
    return { ok: false, data: [], segments: [], error: 'Unable to reach the ASM server. Is `npm run dev` running?' }
  }
}

/**
 * Check ASM backend health.
 * @returns {Promise<boolean>}
 */
export async function checkBackendHealth() {
  try {
    const res = await fetch('/api/health')
    return res.ok
  } catch {
    return false
  }
}
