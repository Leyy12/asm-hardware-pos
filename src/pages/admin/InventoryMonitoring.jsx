import { useState, useEffect } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase'
import { formatCurrency, resolveLowStockThreshold } from '../../utils/helpers'
import { Package, AlertTriangle, Search, PieChart as PieChartIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import Pagination from '../../components/common/Pagination'
import { useAuth } from '../../context/AuthContext'

const PAGE_SIZE = 10

export default function InventoryMonitoring() {
    const [products, setProducts] = useState([])
    const [categories, setCategories] = useState([])
    const [searchQuery, setSearchQuery] = useState('')
    const [filter, setFilter] = useState('all')
    const [loading, setLoading] = useState(true)
    const [currentPage, setCurrentPage] = useState(1)
    const { settings } = useAuth()
    const defaultThreshold = settings?.lowStockAlert ?? 5

    useEffect(() => {
        setLoading(true)
        const unsub1 = onSnapshot(collection(db, 'products'), snap => {
            setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
            setLoading(false)
        })
        const unsub2 = onSnapshot(collection(db, 'categories'), snap => {
            setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        })
        return () => { unsub1(); unsub2() }
    }, [])

    const [prevSearchQuery, setPrevSearchQuery] = useState(searchQuery)
    const [prevFilter, setPrevFilter] = useState(filter)
    if (searchQuery !== prevSearchQuery || filter !== prevFilter) {
        setPrevSearchQuery(searchQuery)
        setPrevFilter(filter)
        setCurrentPage(1)
    }

    const getThreshold = (threshold) => resolveLowStockThreshold(threshold, defaultThreshold)

    const filteredProducts = products.filter(p => {
        const nameLower = (p.name || '').toLowerCase()
        const skuLower = (p.sku || '').toLowerCase()
        const matchesSearch = nameLower.includes(searchQuery.toLowerCase()) || 
                              skuLower.includes(searchQuery.toLowerCase())
        const stockVal = Number(p.stock) || 0
        if (filter === 'low') return matchesSearch && stockVal > 0 && stockVal <= getThreshold(p.lowStockThreshold)
        if (filter === 'out') return matchesSearch && stockVal <= 0
        return matchesSearch
    })

    const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE)
    const paginated = filteredProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

    const outOfStock = products.filter(p => (Number(p.stock) || 0) <= 0)
    const lowStockItems = products.filter(p => {
        const stockVal = Number(p.stock) || 0
        return stockVal > 0 && stockVal <= getThreshold(p.lowStockThreshold)
    })
    const optimalStock = products.filter(p => {
        const stockVal = Number(p.stock) || 0
        return stockVal > getThreshold(p.lowStockThreshold)
    })

    const optimalStockCount = optimalStock.length
    const lowStockCount = lowStockItems.length
    const outOfStockCount = outOfStock.length
    const totalCountForChart = optimalStockCount + lowStockCount + outOfStockCount

    const chartSlices = [
        { label: 'Optimal', count: optimalStockCount, color: '#10B981' },
        { label: 'Low Stock', count: lowStockCount, color: '#f59e0b' },
        { label: 'Out of Stock', count: outOfStockCount, color: '#ef4444' },
    ].filter(s => s.count > 0)

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--text-muted)' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 40, height: 40, border: '4px solid var(--border)', borderTop: '4px solid var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}></div>
                    <p style={{ margin: 0, fontWeight: 600 }}>Loading inventory monitoring...</p>
                </div>
            </div>
        )
    }

    return (
        <div style={{ color: 'var(--text-primary)' }}>
            <div className="page-header" style={{ marginBottom: 24 }}>
                <div>
                    <h1 className="page-title">Inventory Monitoring</h1>
                    <p className="page-subtitle">Track stock levels and reorder requirements in real-time.</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr', gap: 24, marginBottom: 32 }}>
                <div>
                    {/* Stats Overview */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
                        {[
                            { label: 'TOTAL ITEMS', value: products.length, icon: Package, color: 'var(--accent)' },
                            { label: 'LOW STOCK', value: lowStockItems.length, icon: AlertTriangle, color: '#f59e0b' },
                            { label: 'OUT OF STOCK', value: outOfStock.length, icon: AlertTriangle, color: '#ef4444' },
                        ].map((s, i) => (
                            <div key={i} style={{ background: 'var(--bg-surface)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>{s.label}</span>
                                    <s.icon size={16} color={s.color} />
                                </div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{s.value}</div>
                            </div>
                        ))}
                    </div>

                    {/* Quick Insight / Inventory Health Card */}
                    <div className="glass-card" style={{ padding: 20, background: 'var(--bg-elevated)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 180, justifyContent: 'center' }}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Inventory Health</h4>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                            {outOfStock.length > 0 ? (
                                <div>
                                    <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6, color: '#ef4444', fontWeight: 700, marginBottom: 10 }}>
                                        ⚠️ There are {outOfStock.length} items currently out of stock. Immediate reorder recommended.
                                    </p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        {outOfStock.slice(0, 2).map(p => (
                                            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(239, 68, 68, 0.05)', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</span>
                                                <span style={{ fontFamily: 'monospace', color: '#ef4444', fontWeight: 700 }}>0 {p.unit || 'pcs'} left</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : lowStockItems.length > 0 ? (
                                <div>
                                    <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6, color: '#f59e0b', fontWeight: 700, marginBottom: 10 }}>
                                        🔔 {lowStockItems.length} items are approaching their threshold. Consider restocking soon.
                                    </p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        {lowStockItems.slice(0, 2).map(p => (
                                            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(245, 158, 11, 0.05)', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(245, 158, 11, 0.1)' }}>
                                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</span>
                                                <span style={{ fontFamily: 'monospace', color: '#f59e0b', fontWeight: 700 }}>{p.stock} {p.unit || 'pcs'} left (threshold: {getThreshold(p.lowStockThreshold)})</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <p style={{ margin: 0, color: 'var(--success)', fontWeight: 700 }}>
                                    ✅ Your inventory levels are currently optimal. No critical action needed.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stock Distribution Card using Premium Custom SVG Donut Chart */}
                <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', position: 'relative', minHeight: 310, justifyContent: 'space-between' }}>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '0.875rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <PieChartIcon size={16} color="var(--accent)" /> Stock Distribution
                    </h4>
                    
                    <div style={{ height: 160, width: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 140, height: 140, position: 'relative' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={chartSlices}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={35}
                                        outerRadius={45}
                                        paddingAngle={totalCountForChart > 1 ? 4 : 0}
                                        dataKey="count"
                                        startAngle={90}
                                        endAngle={-270}
                                        stroke="none"
                                    >
                                        {chartSlices.map((slice, index) => (
                                            <Cell key={`cell-${index}`} fill={slice.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.75rem' }}
                                        itemStyle={{ color: 'var(--text-primary)' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                                <p style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', lineHeight: 1 }}>{totalCountForChart}</p>
                                <p style={{ fontSize: '0.55rem', color: 'var(--text-muted)', margin: 0, marginTop: 2, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Items</p>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                        {chartSlices.map((d, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 6, border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{d.label}</span>
                                </div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                                    {d.count} {d.count > 1 ? 'items' : 'item'} ({totalCountForChart > 0 ? Math.round((d.count / totalCountForChart) * 100) : 0}%)
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 300 }}>
                    <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                        type="text" 
                        placeholder="Search by product name or SKU..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ width: '100%', padding: '12px 12px 12px 40px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'white', fontSize: '0.9rem' }}
                    />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {['all', 'low', 'out'].map(f => (
                        <button 
                            key={f}
                            onClick={() => setFilter(f)}
                            style={{ 
                                padding: '10px 16px', 
                                background: filter === f ? 'var(--accent)' : 'var(--bg-surface)', 
                                color: filter === f ? 'var(--bg-base)' : 'var(--text-primary)',
                                border: '1px solid var(--border)',
                                borderRadius: 8,
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                textTransform: 'capitalize'
                            }}
                        >
                            {f === 'all' ? 'All Critical' : f === 'low' ? 'Low Stock' : 'Out of Stock'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                        <tr>
                            <th style={{ width: 50, padding: '14px 20px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>No.</th>
                            <th style={{ padding: '14px 20px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Product</th>
                            <th style={{ padding: '14px 20px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Category</th>
                            <th style={{ padding: '14px 20px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Stock Level</th>
                            <th style={{ padding: '14px 20px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Threshold</th>
                            <th style={{ padding: '14px 20px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginated.length === 0 && (
                            <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No products found.</td></tr>
                        )}
                        {paginated.map((product, index) => {
                            const rowIndex = (currentPage - 1) * PAGE_SIZE + index + 1
                            const threshold = getThreshold(product.lowStockThreshold)
                            const isLow = product.stock > 0 && product.stock <= threshold
                            const isOut = product.stock <= 0
                            
                            return (
                                <tr key={product.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '14px 20px', color: 'var(--text-muted)', fontWeight: 600 }}>{rowIndex}</td>
                                    <td style={{ padding: '14px 20px' }}>
                                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{product.name}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>SKU: {product.sku || 'N/A'}</div>
                                    </td>
                                    <td style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                        {categories.find(c => c.id === product.categoryId)?.name || 'General'}
                                    </td>
                                    <td style={{ padding: '14px 20px' }}>
                                        <div style={{ fontWeight: 800, color: isOut ? '#ef4444' : isLow ? '#f59e0b' : 'var(--success)', fontSize: '1rem' }}>
                                            {product.stock} {product.unit || 'pcs'}
                                        </div>
                                    </td>
                                    <td style={{ padding: '14px 20px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                        {threshold} {product.unit || 'pcs'}
                                    </td>
                                    <td style={{ padding: '14px 20px' }}>
                                        {isOut ? (
                                            <span style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '4px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 800, border: '1px solid rgba(239, 68, 68, 0.2)' }}>OUT OF STOCK</span>
                                        ) : isLow ? (
                                            <span style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '4px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 800, border: '1px solid rgba(245, 158, 11, 0.2)' }}>LOW STOCK</span>
                                        ) : (
                                            <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '4px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 800, border: '1px solid rgba(16, 185, 129, 0.2)' }}>OPTIMAL</span>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
                <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={filteredProducts.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />
            </div>
        </div>
    )
}
