import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package, RefreshCw, AlertTriangle, CheckCircle,
  Search, Tag, Hash, Layers, Info, Database,
  ChevronDown, ChevronUp, X
} from 'lucide-react'
import { fetchInventaProducts } from '../../services/inventaApi'

// ─── Helper: render any value safely ──────────────────────────────────────────
function renderValue(val) {
  if (val === null || val === undefined || val === '') return <span style={{ color: 'var(--text-muted)' }}>—</span>
  if (typeof val === 'boolean') return val ? 'Yes' : 'No'
  if (typeof val === 'object') return <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{JSON.stringify(val)}</span>
  return String(val)
}

// ─── Expandable detail drawer for a single product ───────────────────────────
function ProductDetail({ product, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 10 }}
      transition={{ duration: 0.2 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)'
      }}
      onClick={onClose}
    >
      <motion.div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: 28,
          maxWidth: 560,
          width: '90%',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
              {product.name || product.productName || product.title || 'Product Detail'}
            </h3>
            {(product.sku || product.id) && (
              <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {product.sku ? `SKU: ${product.sku}` : ''}{product.sku && product.id ? ' · ' : ''}{product.id ? `ID: ${product.id}` : ''}
              </p>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* All fields as a table */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {Object.entries(product).map(([key, val]) => (
              <tr key={key} style={{ borderBottom: '1px solid var(--border-light)' }}>
                <td style={{ padding: '8px 12px 8px 0', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap', verticalAlign: 'top', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {key}
                </td>
                <td style={{ padding: '8px 0', fontSize: '0.83rem', color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                  {renderValue(val)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </motion.div>
  )
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({ product, index, onDetail }) {
  // Auto-detect common field names from InventaAPI response
  const name     = product.name     || product.productName || product.title    || `Product #${index + 1}`
  const category = product.category || product.categoryName|| product.type     || null
  const sku      = product.sku      || product.productCode || product.code     || null
  const pid      = product.id       || product.productId   || product._id      || null
  const brand    = product.brand    || product.brandName   || null
  const price    = product.price    || product.unitPrice   || product.cost     || null
  const stock    = product.stock    !== undefined ? product.stock
                 : product.quantity !== undefined ? product.quantity
                 : product.inventory !== undefined ? product.inventory
                 : null
  const variants = product.variants || product.variantList || null

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
      className="catalog-card"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        cursor: 'pointer',
        transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.15s'
      }}
      whileHover={{ scale: 1.015 }}
      onClick={() => onDetail(product)}
    >
      {/* Icon + Name */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{
          width: 42, height: 42, borderRadius: 10, flexShrink: 0,
          background: 'linear-gradient(135deg, var(--accent) 0%, #1d4ed8 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Package size={20} color="white" strokeWidth={1.8} />
        </div>
        <div style={{ minWidth: 0 }}>
          <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name}
          </h4>
          {category && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4,
              fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
              color: 'var(--accent-hover)', background: 'var(--accent-glow)',
              padding: '2px 8px', borderRadius: 20
            }}>
              <Tag size={10} /> {category}
            </span>
          )}
        </div>
      </div>

      {/* Meta chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {sku && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 6, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Hash size={11} /> {sku}
          </span>
        )}
        {pid && !sku && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 6, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Hash size={11} /> {pid}
          </span>
        )}
        {brand && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 6, padding: '2px 8px' }}>
            {brand}
          </span>
        )}
        {stock !== null && (
          <span style={{
            fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: 6,
            color: stock === 0 ? 'var(--danger)' : stock < 10 ? 'var(--warning)' : 'var(--success)',
            background: stock === 0 ? 'var(--danger-bg)' : stock < 10 ? 'var(--warning-bg)' : 'var(--success-bg)',
            border: `1px solid ${stock === 0 ? 'var(--danger-border)' : stock < 10 ? 'var(--warning-border)' : 'var(--success-border)'}`
          }}>
            Stock: {stock}
          </span>
        )}
        {price !== null && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 6, padding: '2px 8px' }}>
            ₱{Number(price).toLocaleString()}
          </span>
        )}
        {variants && Array.isArray(variants) && variants.length > 0 && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 6, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Layers size={11} /> {variants.length} variant{variants.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Detail hint */}
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 'auto', paddingTop: 6, borderTop: '1px solid var(--border-light)' }}>
        <Info size={11} /> Click to view all fields
      </div>
    </motion.div>
  )
}

// ─── Main Catalog Page ────────────────────────────────────────────────────────
export default function Catalog() {
  const [products, setProducts]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [search, setSearch]         = useState('')
  const [detail, setDetail]         = useState(null)
  const [lastFetched, setLastFetched] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { ok, data, error: err } = await fetchInventaProducts()
    if (!ok) {
      setError(err)
      setProducts([])
    } else {
      setProducts(data)
      setLastFetched(new Date())
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Filter by search
  const filtered = products.filter(p => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return JSON.stringify(p).toLowerCase().includes(q)
  })

  return (
    <div style={{ padding: '28px 32px', fontFamily: 'var(--font-primary)', minHeight: '100%' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #0891B2 0%, #0E7490 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Database size={18} color="white" strokeWidth={1.8} />
            </div>
            <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
              DaaS Catalog
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: '0.83rem', color: 'var(--text-muted)' }}>
            Products fetched securely from InventaAPI via ASM backend
            {lastFetched && <> · Last updated {lastFetched.toLocaleTimeString()}</>}
          </p>
        </div>

        <button
          onClick={load}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px',
            background: 'var(--accent)', color: 'white', border: 'none',
            borderRadius: 'var(--radius-md)', cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '0.85rem', fontWeight: 600, opacity: loading ? 0.7 : 1,
            transition: 'opacity 0.2s, background 0.2s',
            fontFamily: 'var(--font-primary)'
          }}
        >
          <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {/* ── Status banner ── */}
      <AnimatePresence mode="wait">
        {error && !loading && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 18px',
              background: 'var(--danger-bg)', border: '1px solid var(--danger-border)',
              borderRadius: 'var(--radius-md)', marginBottom: 24
            }}
          >
            <AlertTriangle size={18} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem', color: 'var(--danger)' }}>Failed to load catalog</p>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{error}</p>
              <p style={{ margin: '8px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Make sure the ASM backend is running: <code style={{ background: 'var(--bg-surface)', padding: '2px 6px', borderRadius: 4 }}>cd server && npm start</code>
                &nbsp;and that <code style={{ background: 'var(--bg-surface)', padding: '2px 6px', borderRadius: 4 }}>INVENTA_API_KEY</code> is set in <code style={{ background: 'var(--bg-surface)', padding: '2px 6px', borderRadius: 4 }}>server/.env</code>
              </p>
            </div>
          </motion.div>
        )}

        {!loading && !error && products.length > 0 && (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
              background: 'var(--success-bg)', border: '1px solid var(--success-border)',
              borderRadius: 'var(--radius-md)', marginBottom: 24
            }}
          >
            <CheckCircle size={16} style={{ color: 'var(--success)' }} />
            <span style={{ fontSize: '0.83rem', color: 'var(--success)', fontWeight: 600 }}>
              {products.length} product{products.length !== 1 ? 's' : ''} loaded from InventaAPI
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Search ── */}
      {!loading && products.length > 0 && (
        <div style={{ position: 'relative', maxWidth: 380, marginBottom: 24 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search products…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px 10px 38px',
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
              fontSize: '0.87rem', fontFamily: 'var(--font-primary)', outline: 'none',
              boxSizing: 'border-box', transition: 'border-color 0.2s'
            }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{
              height: 150, background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', animation: 'pulse 1.4s ease-in-out infinite'
            }} />
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && !error && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <Package size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p style={{ margin: 0, fontSize: '0.92rem' }}>
            {search ? `No products match "${search}"` : 'No products found in InventaAPI catalog.'}
          </p>
        </div>
      )}

      {/* ── Product grid ── */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {filtered.map((p, i) => (
            <ProductCard
              key={p.id || p._id || p.productId || i}
              product={p}
              index={i}
              onDetail={setDetail}
            />
          ))}
        </div>
      )}

      {/* ── Detail modal ── */}
      <AnimatePresence>
        {detail && <ProductDetail product={detail} onClose={() => setDetail(null)} />}
      </AnimatePresence>

      {/* ── Spin animation ── */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}
