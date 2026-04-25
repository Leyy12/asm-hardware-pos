import { useState, useEffect } from 'react'
import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore'
import { db } from '../../firebase'
import { formatCurrency } from '../../utils/helpers'
import { Package, AlertTriangle, ArrowUp, ArrowDown, Search, Filter, PieChart as PieChartIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

export default function InventoryMonitoring() {
    const [products, setProducts] = useState([])
    const [lowStock, setLowStock] = useState([])
    const [searchQuery, setSearchQuery] = useState('')
    const [filter, setFilter] = useState('all') // all, low, out
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'products'), (snap) => {
            const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            setProducts(list)
            setLowStock(list.filter(p => p.stock <= (p.lowStockThreshold || 5)))
            setLoading(false)
        })
        return () => unsub()
    }, [])

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
        
        if (filter === 'low') return matchesSearch && p.stock <= (p.lowStockThreshold || 5) && p.stock > 0
        if (filter === 'out') return matchesSearch && p.stock <= 0
        return matchesSearch
    })

    const outOfStock = products.filter(p => p.stock <= 0)
    const optimalStock = products.filter(p => p.stock > (p.lowStockThreshold || 5))

    const pieData = [
        { name: 'Optimal', value: optimalStock.length, color: '#10B981' },
        { name: 'Low Stock', value: lowStock.length - outOfStock.length, color: '#f59e0b' },
        { name: 'Out of Stock', value: outOfStock.length, color: '#ef4444' },
    ].filter(d => d.value > 0)

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
                            { label: 'LOW STOCK', value: lowStock.length, icon: AlertTriangle, color: '#f59e0b' },
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

                    {/* Quick Insight */}
                    <div className="glass-card" style={{ padding: 20, background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Inventory Health</h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                            {outOfStock.length > 0 
                                ? `⚠️ There are ${outOfStock.length} items currently out of stock. Immediate reorder recommended.` 
                                : lowStock.length > 0 
                                    ? `🔔 ${lowStock.length} items are approaching their threshold. Consider restocking soon.`
                                    : "✅ Your inventory levels are currently optimal."
                            }
                        </p>
                    </div>
                </div>

                <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column' }}>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '0.875rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <PieChartIcon size={16} color="var(--accent)" /> Stock Distribution
                    </h4>
                    <div style={{ height: 180, width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    innerRadius={50}
                                    outerRadius={70}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8 }}
                                    itemStyle={{ fontSize: '0.75rem', fontWeight: 700 }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8 }}>
                        {pieData.map((d, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{d.name}</span>
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
                            {f === 'all' ? 'All Stock' : f === 'low' ? 'Low Stock' : 'Out of Stock'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                        <tr>
                            <th style={{ padding: '14px 20px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Product</th>
                            <th style={{ padding: '14px 20px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Category</th>
                            <th style={{ padding: '14px 20px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Stock Level</th>
                            <th style={{ padding: '14px 20px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Threshold</th>
                            <th style={{ padding: '14px 20px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProducts.map(product => {
                            const isLow = product.stock <= (product.lowStockThreshold || 5) && product.stock > 0
                            const isOut = product.stock <= 0
                            
                            return (
                                <tr key={product.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '14px 20px' }}>
                                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{product.name}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>SKU: {product.sku || 'N/A'}</div>
                                    </td>
                                    <td style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{product.category || 'General'}</td>
                                    <td style={{ padding: '14px 20px' }}>
                                        <div style={{ fontWeight: 800, color: isOut ? '#ef4444' : isLow ? '#f59e0b' : 'var(--success)', fontSize: '1rem' }}>
                                            {product.stock} {product.unit || 'pcs'}
                                        </div>
                                    </td>
                                    <td style={{ padding: '14px 20px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                        {product.lowStockThreshold || 5} {product.unit || 'pcs'}
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
                {filteredProducts.length === 0 && (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                        No products found matching your criteria.
                    </div>
                )}
            </div>
        </div>
    )
}
