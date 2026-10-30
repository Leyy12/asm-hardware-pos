import { useState, useEffect, useMemo } from 'react'
import {
    collection, query, orderBy, limit, onSnapshot,
    where, Timestamp, getDocs
} from 'firebase/firestore'
import { db } from '../../firebase'
import { formatCurrency } from '../../utils/helpers'
import { useAuth } from '../../context/AuthContext'
import {
    Package, AlertTriangle,
    TrendingUp, Calendar, Banknote, FileText, BarChart as BarChartIcon
} from 'lucide-react'
import {
    XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts'
import { useNavigate } from 'react-router-dom'
import Pagination from '../../components/common/Pagination'

const RESTOCK_PAGE_SIZE = 5



export default function Dashboard() {
    const navigate = useNavigate()
    const [stats, setStats] = useState({ totalProducts: 0, lowStock: 0, activeCashiers: 0 })
    const [recentSales, setRecentSales] = useState([])
    const [salesData, setSalesData] = useState([])
    const [timeRange, setTimeRange] = useState('weekly')
    const [categoryData, setCategoryData] = useState([])
    const [lowStockItems, setLowStockItems] = useState([])
    const [registeredCashiers, setRegisteredCashiers] = useState([])
    const [loading, setLoading] = useState(true)
    const [restockPage, setRestockPage] = useState(1)
    const { settings } = useAuth()

    const { 
        todaySalesData, 
        todaySalesTotal, 
        todayTransactionsCount,
        todayItemsSold, 
        displayTrend, 
        displayTopSelling 
    } = useMemo(() => {
        const now = new Date()
        const startOfToday = new Date()
        startOfToday.setHours(0, 0, 0, 0)

        const startOfWeek = new Date()
        startOfWeek.setDate(startOfWeek.getDate() - 6)
        startOfWeek.setHours(0, 0, 0, 0)

        const startOfMonth = new Date()
        startOfMonth.setDate(startOfMonth.getDate() - 29)
        startOfMonth.setHours(0, 0, 0, 0)

        // Filter sales by status (excluding refunded for stats and charts)
        const activeSales = salesData.filter(s => s.status !== 'refunded')

        // Today's Sales
        const todaySales = activeSales.filter(s => {
            const date = s.createdAt?.toDate?.() || new Date(s.createdAt)
            return date >= startOfToday
        })
        const todayTotal = todaySales.reduce((sum, s) => sum + (s.total || 0), 0)
        const todayTxCount = todaySales.length
        const todayItems = todaySales.reduce((sum, s) => {
            return sum + (s.items || []).reduce((itemSum, item) => itemSum + (item.qty || 0), 0)
        }, 0)

        // Filter sales by selected timeRange
        let filteredSales = []
        let chartSlots = []

        if (timeRange === 'daily') {
            filteredSales = todaySales
            chartSlots = [
                { day: '08:00', sales: 0, revenue: 0 },
                { day: '10:00', sales: 0, revenue: 0 },
                { day: '12:00', sales: 0, revenue: 0 },
                { day: '14:00', sales: 0, revenue: 0 },
                { day: '16:00', sales: 0, revenue: 0 },
                { day: '18:00', sales: 0, revenue: 0 },
                { day: '20:00', sales: 0, revenue: 0 },
            ]
            filteredSales.forEach(s => {
                const date = s.createdAt?.toDate?.() || new Date(s.createdAt)
                const hour = date.getHours()
                let idx = 0
                if (hour >= 20) idx = 6
                else if (hour >= 18) idx = 5
                else if (hour >= 16) idx = 4
                else if (hour >= 14) idx = 3
                else if (hour >= 12) idx = 2
                else if (hour >= 10) idx = 1
                else idx = 0
                chartSlots[idx].sales += s.total || 0
                chartSlots[idx].revenue += s.total || 0
            })
        } else if (timeRange === 'weekly') {
            filteredSales = activeSales.filter(s => {
                const date = s.createdAt?.toDate?.() || new Date(s.createdAt)
                return date >= startOfWeek
            })
            chartSlots = Array.from({ length: 7 }, (_, i) => {
                const d = new Date()
                d.setDate(d.getDate() - (6 - i))
                return {
                    date: d,
                    day: d.toLocaleDateString('en-PH', { weekday: 'short' }),
                    sales: 0,
                    revenue: 0
                }
            })
            filteredSales.forEach(s => {
                const date = s.createdAt?.toDate?.() || new Date(s.createdAt)
                const slot = chartSlots.find(slot => slot.date.toDateString() === date.toDateString())
                if (slot) {
                    slot.sales += s.total || 0
                    slot.revenue += s.total || 0
                }
            })
        } else {
            // monthly
            filteredSales = activeSales.filter(s => {
                const date = s.createdAt?.toDate?.() || new Date(s.createdAt)
                return date >= startOfMonth
            })
            chartSlots = Array.from({ length: 30 }, (_, i) => {
                const d = new Date()
                d.setDate(d.getDate() - (29 - i))
                return {
                    date: d,
                    day: d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
                    sales: 0,
                    revenue: 0
                }
            })
            filteredSales.forEach(s => {
                const date = s.createdAt?.toDate?.() || new Date(s.createdAt)
                const slot = chartSlots.find(slot => slot.date.toDateString() === date.toDateString())
                if (slot) {
                    slot.sales += s.total || 0
                    slot.revenue += s.total || 0
                }
            })
        }

        // Top Selling Products
        const topSellingMap = {}
        filteredSales.forEach(s => {
            (s.items || []).forEach(item => {
                if (!topSellingMap[item.name]) {
                    topSellingMap[item.name] = { 
                        name: item.name, 
                        qty: 0, 
                        revenue: 0, 
                        category: item.category || 'General' 
                    }
                }
                topSellingMap[item.name].qty += item.qty || 0
                topSellingMap[item.name].revenue += item.subtotal || (item.qty * item.price) || 0
            })
        })
        const topProducts = Object.values(topSellingMap)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 6)

        return {
            todaySalesData: todaySales,
            todaySalesTotal: todayTotal,
            todayTransactionsCount: todayTxCount,
            todayItemsSold: todayItems,
            displayTrend: chartSlots,
            displayTopSelling: topProducts
        }
    }, [salesData, timeRange])

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

    useEffect(() => {
        // Products & low stock
        const unsubProducts = onSnapshot(collection(db, 'products'), snap => {
            const products = snap.docs.map(d => d.data())
            const threshold = settings?.lowStockAlert ?? 5
            const low = products.filter(p => p.isActive !== false && p.stock <= (p.lowStockThreshold ?? threshold))
            setStats(prev => ({ ...prev, totalProducts: products.length, lowStock: low.length }))
            setLowStockItems(low)
        })

        // Cashiers
        const unsubUsers = onSnapshot(
            query(collection(db, 'users'), where('role', '==', 'cashier'), where('isActive', '==', true)),
            snap => {
                setStats(prev => ({ ...prev, activeCashiers: snap.size }))
                setRegisteredCashiers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
            }
        )

        // Sales (real-time all sales)
        const unsubSales = onSnapshot(
            query(collection(db, 'sales'), orderBy('createdAt', 'desc')),
            snap => {
                const sales = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                setSalesData(sales)
                setRecentSales(sales.slice(0, 8))
            }
        )

        loadCategoryData()
        setLoading(false)

        return () => {
            unsubProducts(); unsubUsers(); unsubSales()
        }
    }, [settings?.lowStockAlert])

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



    const restockTotalPages = Math.ceil(lowStockItems.length / RESTOCK_PAGE_SIZE)
    const restockPaginated = lowStockItems.slice((restockPage - 1) * RESTOCK_PAGE_SIZE, restockPage * RESTOCK_PAGE_SIZE)

    // Extract size from product name if size field is not set (e.g. "MOCHA BLANCH (1L)" → "1L")
    const extractSize = (item) => {
        if (item.size && item.size.trim()) return item.size
        const match = item.name?.match(/\(([^)]+)\)/)
        return match ? match[1] : '—'
    }

    // Clean up product names to strip parenthetical size tags
    const cleanProductName = (name) => {
        if (!name) return ''
        return name.replace(/\s*\([^)]+\)/g, '').trim()
    }

    // Get a realistic example supplier name based on category
    const getExampleSupplier = (item) => {
        if (item.supplierName && item.supplierName.trim()) return item.supplierName
        if (item.supplier && item.supplier.trim()) return item.supplier
        
        const prodName = (item.name || '').toLowerCase()
        const cat = (item.category || '').toLowerCase()
        
        if (cat.includes('cement') || cat.includes('concrete')) return 'Pioneer Cement Corp'
        if (cat.includes('steel') || cat.includes('metal') || cat.includes('iron')) return 'Fortress Steel Supply'
        if (cat.includes('tool')) return 'Apex Hardware & Tools'
        if (cat.includes('electric') || cat.includes('wire') || cat.includes('pvc')) return 'PowerGrid Electricals'
        if (cat.includes('drink') || cat.includes('beverage') || cat.includes('coffee') || cat.includes('mocha')) return 'Pacific Beverage Distributors'
        
        // Paint Categories & Brands
        if (prodName.includes('solo') || cat.includes('white')) return 'Boysen Paints Philippines'
        if (prodName.includes('black') || prodName.includes('smoke') || prodName.includes('seal') || cat.includes('gray') || cat.includes('black')) return 'Davies Paints Philippines, Inc.'
        if (prodName.includes('mocha') || prodName.includes('choco') || prodName.includes('sand') || cat.includes('brown')) return 'Nippon Paint Philippines'
        if (prodName.includes('smiley') || prodName.includes('sun') || prodName.includes('calamansi') || cat.includes('yellow')) return 'Island Paints (Charter Chemical)'
        if (prodName.includes('peach') || prodName.includes('jolly') || cat.includes('orange')) return 'Universal Paint & Coatings'
        
        return 'Mega Hardware Distributors'
    }

    const kpiCards = [
        { title: 'Date', value: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), icon: Calendar },
        { title: 'Today Sales', value: formatCurrency(todaySalesTotal), icon: Banknote },
        { title: 'Total Transaction', value: todayTransactionsCount, icon: FileText },
        { title: 'Total Items Sold', value: todayItemsSold, icon: Package },
    ]

    return (
        <div style={{ color: 'var(--text-primary)', background: 'transparent', minHeight: '100%', paddingBottom: 40 }}>
            {/* Header */}
            <div className="page-header" style={{ marginBottom: '24px' }}>
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">Welcome back! Here's what's happening today.</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                {kpiCards.map(({ title, value, icon: Icon }, i) => (
                    <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', backdropFilter: 'blur(10px)', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                        <div>
                            <p style={{ fontSize: '0.68rem', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</p>
                            <p style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', fontFamily: 'var(--font-primary)' }}>{value}</p>
                        </div>
                        <Icon size={32} color="var(--accent)" strokeWidth={1.5} />
                    </div>
                ))}
            </div>

            {/* Low Stock Alert Banner */}
            {lowStockItems.length > 0 && (
                <div style={{ background: 'linear-gradient(90deg, #ef4444, #b91c1c)', padding: '16px 24px', borderRadius: 12, color: 'white', display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, boxShadow: '0 8px 20px rgba(239, 68, 68, 0.2)' }}>
                    <AlertTriangle size={28} color="#fbbf24" strokeWidth={2} />
                    <div>
                        <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Low Stock Alert</h3>
                        <p style={{ margin: '2px 0 0', fontSize: '0.8rem' }}><strong>{lowStockItems.length}</strong> product{lowStockItems.length > 1 ? 's' : ''} are running low on stock and need restocking soon</p>
                    </div>
                </div>
            )}

            {/* Products Need Restock Table */}
            <div style={{ marginBottom: 32 }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.2rem', fontWeight: 800, fontFamily: 'var(--font-primary)', marginBottom: 12, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
                    <Package size={18} color="var(--accent)" /> Products Need Restock
                </h3>
                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                            <tr>
                                <th style={{ width: 50, padding: '12px 20px', fontWeight: 700, fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>No.</th>
                                <th style={{ padding: '12px 20px', fontWeight: 700, fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Product Name</th>
                                <th style={{ padding: '12px 20px', fontWeight: 700, fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</th>
                                <th style={{ padding: '12px 20px', fontWeight: 700, fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Size</th>
                                <th style={{ padding: '12px 20px', fontWeight: 700, fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Price</th>
                                <th style={{ padding: '12px 20px', fontWeight: 700, fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Stock</th>
                                <th style={{ padding: '12px 20px', fontWeight: 700, fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Supplier</th>
                                <th style={{ padding: '12px 20px', fontWeight: 700, fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {restockPaginated.map((item, index) => {
                                const rowIndex = (restockPage - 1) * RESTOCK_PAGE_SIZE + index + 1
                                return (
                                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                                        <td style={{ padding: '14px 20px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '13px' }}>{rowIndex}</td>
                                        <td style={{ padding: '14px 20px', fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>{cleanProductName(item.name)}</td>
                                        <td style={{ padding: '14px 20px', fontSize: '13px', color: 'var(--text-secondary)' }}>{item.category || 'General'}</td>
                                        <td style={{ padding: '14px 20px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>{extractSize(item)}</td>
                                        <td style={{ padding: '14px 20px', fontWeight: 600, fontSize: '13px', color: 'var(--accent-hover)' }}>{formatCurrency(item.price)}</td>
                                        <td style={{ padding: '14px 20px' }}>
                                            <span style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '6px 12px', borderRadius: 8, fontSize: '12px', fontWeight: 700, border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                                                {item.stock} {item.unit || 'units'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '14px 20px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>{getExampleSupplier(item)}</td>
                                        <td style={{ padding: '14px 20px' }}>
                                            <button
                                                onClick={() => navigate('/admin/inventory', { state: { highlightId: item.id } })}
                                                style={{ background: 'var(--accent)', color: 'var(--bg-base)', padding: '8px 16px', borderRadius: 8, border: 'none', fontWeight: 800, cursor: 'pointer', fontSize: '12px', transition: 'transform 0.2s' }}
                                                onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
                                                onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                                            >
                                                + Add Stock
                                            </button>
                                        </td>
                                    </tr>
                                )
                             })}
                             {lowStockItems.length === 0 && (
                                 <tr>
                                     <td colSpan="8" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                                         ✅ All products are sufficiently stocked.
                                     </td>
                                 </tr>
                            )}
                        </tbody>
                    </table>
                    <Pagination currentPage={restockPage} totalPages={restockTotalPages} totalItems={lowStockItems.length} pageSize={RESTOCK_PAGE_SIZE} onPageChange={setRestockPage} />
                </div>
            </div>

            {/* Revenue Chart + Top Selling Products — Side by Side */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'stretch' }}>

                {/* LEFT: Revenue Area Chart */}
                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 28, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', minHeight: 440, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                <BarChartIcon size={20} color="#3b82f6" />
                                <span style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'var(--font-primary)', color: 'var(--text-primary)' }}>Revenue Chart</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '3px 10px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 700 }}>
                                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', animation: 'pulse-glow 2s ease infinite' }} />
                                    Live
                                </div>
                            </div>
                            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                                {timeRange === 'daily' ? "Today's sales performance overview" : timeRange === 'weekly' ? "7-day sales performance overview" : "30-day sales performance overview"}
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                            {['Daily', 'Weekly', 'Monthly'].map((t) => {
                                const active = timeRange === t.toLowerCase()
                                return (
                                    <button
                                        key={t}
                                        onClick={() => setTimeRange(t.toLowerCase())}
                                        style={{
                                            background: 'transparent',
                                            color: active ? '#3b82f6' : 'var(--text-muted)',
                                            border: active ? '1.5px solid rgba(37,99,235,0.6)' : '1px solid transparent',
                                            padding: '5px 14px',
                                            borderRadius: 8,
                                            fontWeight: 700,
                                            fontSize: '12px',
                                            cursor: 'pointer',
                                            outline: 'none',
                                            transition: 'all 0.18s',
                                            boxShadow: active ? '0 0 12px rgba(37,99,235,0.15)' : 'none',
                                        }}
                                    >
                                        {t}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div style={{ flex: 1, minHeight: 280 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={displayTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                                        <stop offset="65%" stopColor="#3b82f6" stopOpacity={0.05} />
                                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.07)" />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }} dy={8} tickFormatter={v => v.split(',')[0]} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }} dx={-4} tickFormatter={v => v >= 1000 ? `₱${(v / 1000).toFixed(0)}k` : `₱${v}`} width={52} />
                                <Tooltip
                                    contentStyle={{ background: 'rgba(8,15,30,0.96)', borderRadius: 10, border: '1px solid rgba(37,99,235,0.3)', boxShadow: '0 8px 28px rgba(0,0,0,0.45)', padding: '9px 14px', fontSize: '13px' }}
                                    labelStyle={{ color: '#475569', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}
                                    itemStyle={{ color: '#3b82f6', fontWeight: 800, fontSize: '13px' }}
                                    formatter={v => [`₱${Number(v).toLocaleString()}`, 'Revenue']}
                                />
                                <Area type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2.5} fill="url(#revenueGradient)" dot={{ r: 3.5, fill: '#3b82f6', stroke: 'transparent', strokeWidth: 0 }} activeDot={{ r: 5.5, fill: '#3b82f6', stroke: 'rgba(37,99,235,0.35)', strokeWidth: 6 }} style={{ filter: 'drop-shadow(0 0 6px rgba(37,99,235,0.4))' }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* RIGHT: Top Selling Products */}
                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 28, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', minHeight: 440 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <TrendingUp size={20} color="#3b82f6" strokeWidth={2} style={{ filter: 'drop-shadow(0 0 6px rgba(37,99,235,0.5))' }} />
                            <span style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'var(--font-primary)', color: 'var(--text-primary)' }}>Top Selling Products</span>
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '3px 10px', borderRadius: 20, border: '1px solid var(--border)', fontWeight: 600, textTransform: 'capitalize' }}>
                            {timeRange === 'daily' ? 'Today' : timeRange}
                        </span>
                    </div>

                    {/* Column headers */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, paddingBottom: 10, borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Product</span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center', minWidth: 36 }}>Qty</span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'right', minWidth: 72 }}>Revenue</span>
                    </div>

                    {/* Rows */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {displayTopSelling.map((p, i) => (
                            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, alignItems: 'center', padding: '10px 0', borderBottom: i < displayTopSelling.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                    {/* Rank badge */}
                                    <div style={{ width: 28, height: 22, borderRadius: 6, padding: '0 6px', background: i === 0 ? 'rgba(251,191,36,0.15)' : i <= 2 ? 'rgba(148,163,184,0.12)' : 'rgba(71,85,105,0.15)', color: i === 0 ? '#fbbf24' : i <= 2 ? '#94a3b8' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 900, flexShrink: 0, border: i === 0 ? '1px solid rgba(251,191,36,0.5)' : i <= 2 ? '1px solid rgba(148,163,184,0.4)' : '1px solid rgba(71,85,105,0.4)', letterSpacing: '-0.01em' }}>#{i + 1}</div>
                                    <div style={{ minWidth: 0 }}>
                                        <p style={{ margin: 0, fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</p>
                                        <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>{p.category}</p>
                                    </div>
                                </div>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'center', minWidth: 36 }}>{p.qty}</span>
                                <span style={{ fontSize: '13px', fontWeight: 800, color: '#3b82f6', textAlign: 'right', minWidth: 72, textShadow: '0 0 10px rgba(37,99,235,0.3)' }}>₱{Number(p.revenue).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
