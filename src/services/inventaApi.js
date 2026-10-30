/**
 * inventaApi.js — ASM Hardware frontend service for InventaAPI
 *
 * SECURITY: This file knows NOTHING about the INVENTA_API_KEY.
 * All calls go to /api/inventa/products (ASM backend).
 * The Vite dev proxy forwards /api/* → http://localhost:3002.
 * The backend then securely calls InventaAPI with the secret key.
 */

const BASE = '/api/inventa'

/**
 * Fetch all products from the InventaAPI DaaS catalog
 * via the secure ASM backend proxy.
 *
 * @returns {Promise<{ ok: boolean, data: any[], error: string|null }>}
 */
export async function fetchInventaProducts() {
  try {
    const res = await fetch(`${BASE}/products`)
    const body = await res.json()

    if (!res.ok) {
      return { ok: false, data: [], error: body.error || `Server returned ${res.status}` }
    }

    // InventaAPI may return an array directly or { products: [...] }
    // Normalise both shapes here so the component doesn't need to care.
    const products = Array.isArray(body)
      ? body
      : (body.products ?? body.catalog ?? body.data ?? body.items ?? [])

    return { ok: true, data: products, error: null }
  } catch (err) {
    return { ok: false, data: [], error: 'Unable to reach ASM backend. Is it running on port 3002?' }
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
