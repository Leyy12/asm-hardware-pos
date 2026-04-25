import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
    collection, query, orderBy, limit, onSnapshot,
    where, Timestamp, getDocs
} from 'firebase/firestore'
import { db } from '../../firebase'
import { formatCurrency, formatDateTime } from '../../utils/helpers'
import {
    ShoppingCart, Package, AlertTriangle, Users,
    TrendingUp, ArrowUpRight, Calendar, Banknote, FileText, BarChart as BarChartIcon
} from 'lucide-react'
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts'

const COLORS = ['#10B981', '#388E3C', '#1976D2', '#D32F2F', '#09bccd', '#f59e0b']

const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } })
}

export default function Dashboard() {
    const [stats, setStats] = useState({ todaySales: 0, totalProducts: 0, lowStock: 0, activeCashiers: 0 })
    const [recentSales, setRecentSales] = useState([])
    const [salesTrend, setSalesTrend] = useState([])
    const [categoryData, setCategoryData] = useState([])
    const [lowStockItems, setLowStockItems] = useState([])
    const [registeredCashiers, setRegisteredCashiers] = useState([])
    const [todaySalesData, setTodaySalesData] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Real-time stats
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const todayTs = Timestamp.fromDate(today)

        // Today's sales
        const unsubSales = onSnapshot(
            query(collection(db, 'sales'), where('createdAt', '>=', todayTs)),
            snap => {
                const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                const todayTotal = docs.reduce((sum, d) => sum + (d.total || 0), 0)
                setStats(prev => ({ ...prev, todaySales: todayTotal }))
                setTodaySalesData(docs)
            }
        )

        // Products & low stock
        const unsubProducts = onSnapshot(collection(db, 'products'), snap => {
            const products = snap.docs.map(d => d.data())
            const low = products.filter(p => p.isActive !== false && p.stock <= p.lowStockThreshold)
            setStats(prev => ({ ...prev, totalProducts: products.length, lowStock: low.length }))
            setLowStockItems(low.slice(0, 5))
        })

        // Cashiers
        const unsubUsers = onSnapshot(
            query(collection(db, 'users'), where('role', '==', 'cashier'), where('isActive', '==', true)),
            snap => {
                setStats(prev => ({ ...prev, activeCashiers: snap.size }))
                setRegisteredCashiers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
            }
        )

        // Recent sales (last 8)
        const unsubRecent = onSnapshot(
            query(collection(db, 'sales'), orderBy('createdAt', 'desc'), limit(8)),
            snap => {
                const sales = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                setRecentSales(sales)
            }
        )

        // Sales trend (last 7 days)
        loadSalesTrend()
        loadCategoryData()
        setLoading(false)

        return () => {
            unsubSales(); unsubProducts(); unsubUsers(); unsubRecent()
        }
    }, [])

    async function loadSalesTrend() {
        const days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date()
            d.setDate(d.getDate() - (6 - i))
            d.setHours(0, 0, 0, 0)
            return d
        })

        const trend = await Promise.all(
            days.map(async (day) => {
                const next = new Date(day); next.setDate(next.getDate() + 1)
                const snap = await getDocs(
                    query(collection(db, 'sales'),
                        where('createdAt', '>=', Timestamp.fromDate(day)),
                        where('createdAt', '<', Timestamp.fromDate(next)))
                )
                const total = snap.docs.reduce((s, d) => s + (d.data().total || 0), 0)
                return {
                    day: day.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' }),
                    sales: total
                }
            })
        )
        setSalesTrend(trend)
    }

    async function loadCategoryData() {
        const [catSnap, prodSnap] = await Promise.all([
            getDocs(collection(db, 'categories')),
            getDocs(collection(db, 'products'))
        ])
        const cats = catSnap.docs.reduce((acc, d) => ({ ...acc, [d.id]: d.data().name }), {})
        const counts = {}
        prodSnap.docs.forEach(d => {
            const cat = cats[d.data().categoryId] || 'Uncategorized'
            counts[cat] = (counts[cat] || 0) + 1
        })
        setCategoryData(Object.entries(counts).map(([name, value]) => ({ name, value })))
    }

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload?.length) {
            return (
                <div className="glass-card" style={{ padding: '10px 14px', fontSize: '0.8rem' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>{label}</p>
                    <p style={{ color: 'var(--accent-hover)', fontWeight: 700 }}>{formatCurrency(payload[0].value)}</p>
                </div>
            )
        }
        return null
    }

    // Calculate total items sold
    const totalItemsSold = todaySalesData.reduce((sum, sale) => {
        const items = sale.items || []
        return sum + items.reduce((itemSum, item) => itemSum + (item.qty || 0), 0)
    }, 0)

    const kpiCards = [
        { title: 'Date', value: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), icon: Calendar },
        { title: 'Today Sales', value: formatCurrency(stats.todaySales), icon: Banknote },
        { title: 'Total Transaction', value: todaySalesData.length, icon: FileText },
        { title: 'Total Item Solds', value: totalItemsSold, icon: Package },
    ]

    return (
        <div style={{ color: 'var(--text-primary)', background: 'transparent', minHeight: '100%', paddingBottom: 40 }}>
            {/* Header */}
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>Dashboard</h1>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Welcome back! Here's what's happening today.</p>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                {kpiCards.map(({ title, value, icon: Icon }, i) => (
                    <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', backdropFilter: 'blur(10px)', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                        <div>
                            <p style={{ fontSize: '0.75rem', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</p>
                            <p style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{value}</p>
                        </div>
                        <Icon size={32} color="var(--accent)" strokeWidth={1.5} />
                    </div>
                ))}
            </div>

            {/* Low Stock Alert Banner */}
            {lowStockItems.length > 0 && (
                <div style={{ background: 'linear-gradient(90deg, #ef4444, #b91c1c)', padding: '16px 24px', borderRadius: 12, color: 'white', display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, boxShadow: '0 8px 20px rgba(239, 68, 68, 0.2)' }}>
                    <AlertTriangle size={36} color="#fbbf24" strokeWidth={2} />
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, textTransform: 'uppercase' }}>Low Stock Alert</h3>
                        <p style={{ margin: 0, fontSize: '0.9rem' }}><strong>{lowStockItems.length}</strong> product ({lowStockItems.length}) are running low on stock and need restocking soon</p>
                    </div>
                </div>
            )}

            {/* Products Need Restock Table */}
            <div style={{ marginBottom: 32 }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.25rem', fontWeight: 800, marginBottom: 16, color: 'var(--text-primary)' }}>
                    <Package size={24} color="var(--accent)" /> Products Need Restock
                </h3>
                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                            <tr>
                                <th style={{ padding: '14px 20px', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Product Name</th>
                                <th style={{ padding: '14px 20px', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Category</th>
                                <th style={{ padding: '14px 20px', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Size</th>
                                <th style={{ padding: '14px 20px', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Price</th>
                                <th style={{ padding: '14px 20px', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Current Stock</th>
                                <th style={{ padding: '14px 20px', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lowStockItems.map(item => (
                                <tr key={item.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                                    <td style={{ padding: '14px 20px', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{item.name}</td>
                                    <td style={{ padding: '14px 20px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{item.category || 'General'}</td>
                                    <td style={{ padding: '14px 20px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{item.size || 'N/A'}</td>
                                    <td style={{ padding: '14px 20px', fontWeight: 600, fontSize: '0.95rem', color: 'var(--accent)' }}>{formatCurrency(item.price)}</td>
                                    <td style={{ padding: '14px 20px' }}>
                                        <span style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '6px 12px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700, border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                                            {item.stock} units
                                        </span>
                                    </td>
                                    <td style={{ padding: '14px 20px' }}>
                                        <button style={{ background: 'var(--accent)', color: 'var(--bg-base)', padding: '8px 16px', borderRadius: 8, border: 'none', fontWeight: 800, cursor: 'pointer', fontSize: '0.8rem', transition: 'transform 0.2s' }} onMouseEnter={e => e.target.style.transform = 'scale(1.05)'} onMouseLeave={e => e.target.style.transform = 'scale(1)'}>
                                            + Add Stock
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {lowStockItems.length === 0 && (
                                <tr>
                                    <td colSpan="6" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                        ✅ All products are sufficiently stocked.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Live Sales Feed (Bar Chart) */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Live Sales Feed</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--success-bg)', color: 'var(--success)', padding: '4px 12px', borderRadius: 16, fontSize: '0.7rem', fontWeight: 700 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', animation: 'pulse-glow 2s ease infinite' }} />
                            Live Updates
                        </div>
                    </div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                        <BarChartIcon size={24} color="var(--accent)" /> Transaction
                    </h3>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {['Daily', 'Weekly', 'Monthly', 'Yearly'].map((t, i) => (
                            <button key={t} style={{ 
                                background: i === 0 ? 'var(--accent)' : 'var(--bg-elevated)', 
                                color: i === 0 ? 'var(--bg-base)' : 'var(--text-primary)', 
                                border: '1px solid var(--border)', 
                                padding: '8px 20px', 
                                borderRadius: 8, 
                                fontWeight: 800,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}>
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ height: 350, width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={salesTrend}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.1)" />
                            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} dx={-10} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                            <Tooltip cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} contentStyle={{ background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border)', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }} />
                            <Bar dataKey="sales" fill="var(--chart-yellow)" radius={[6, 6, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    )
}
