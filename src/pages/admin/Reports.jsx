import { useState, useEffect, useMemo } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../../firebase'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer
} from 'recharts'
import { TrendingUp, BarChart2, Download } from 'lucide-react'
import { formatCurrency, exportToCSV } from '../../utils/helpers'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'



/* ─── Rank badge colours ─── */
const rankColors = [
    { bg: 'rgba(251,191,36,0.15)',  border: 'rgba(251,191,36,0.5)',  text: '#fbbf24' },  // #1 gold
    { bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.4)', text: '#94a3b8' },  // #2 silver
    { bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.4)', text: '#94a3b8' },  // #3 now matches #2
    { bg: 'rgba(71,85,105,0.15)',   border: 'rgba(71,85,105,0.4)',   text: '#64748b' },  // #4
    { bg: 'rgba(71,85,105,0.15)',   border: 'rgba(71,85,105,0.4)',   text: '#64748b' },  // #5
    { bg: 'rgba(71,85,105,0.15)',   border: 'rgba(71,85,105,0.4)',   text: '#64748b' },  // #6
]

/* ─── Custom chart tooltip ─── */
function ChartTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null
    return (
        <div style={{
            background: 'rgba(8,15,30,0.96)',
            border: '1px solid rgba(37,99,235,0.3)',
            borderRadius: 10,
            padding: '9px 14px',
            boxShadow: '0 8px 28px rgba(0,0,0,0.45)',
            fontSize: '13px',
        }}>
            <p style={{ margin: '0 0 3px', fontSize: '12px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#3b82f6' }}>
                ₱{Number(payload[0].value).toLocaleString()}
            </p>
        </div>
    )
}

/* ─── Y-axis formatter ─── */
const yFmt = (v) => {
    if (v === 0)    return 'P0'
    if (v >= 1000)  return `P${(v / 1000).toFixed(0)}k`
    return `P${v}`
}

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
export default function Reports() {
    const [sales, setSales]   = useState([])
    const [timeRange, setTimeRange] = useState('daily')
    const [livePulse, setLivePulse] = useState(true)

    /* Live dot pulse animation */
    useEffect(() => {
        const t = setInterval(() => setLivePulse(p => !p), 1100)
        return () => clearInterval(t)
    }, [])

    /* Firestore real-time listener */
    useEffect(() => {
        const unsub = onSnapshot(
            query(collection(db, 'sales'), orderBy('createdAt', 'desc')),
            snap => setSales(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        )
        return unsub
    }, [])

    /* ── Derived state via useMemo (avoids setState-in-effect lint error) ── */
    const { chartData, topProducts, totalRevenue, totalTransactions } = useMemo(() => {
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
        const activeSales = sales.filter(s => s.status !== 'refunded')

        // Filter sales by selected timeRange
        let filteredSales = []
        let chartSlots = []

        if (timeRange === 'daily') {
            filteredSales = activeSales.filter(s => {
                const date = s.createdAt?.toDate?.() || new Date(s.createdAt)
                return date >= startOfToday
            })
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

        const totalRev = filteredSales.reduce((sum, s) => sum + (s.total || 0), 0)
        const txCount = filteredSales.length

        return {
            chartData: chartSlots,
            topProducts,
            totalRevenue: totalRev,
            totalTransactions: txCount
        }
    }, [sales, timeRange])

    /* Export CSV */
    const handleExport = () => {
        if (!topProducts.length) { toast.error('No data to export.'); return }
        exportToCSV(
            topProducts.map(p => ({ Product: p.name, Category: p.category, Qty: p.qty, Revenue: formatCurrency(p.revenue) })),
            'Sales_Report'
        )
        toast.success(`Exported ${totalTransactions} transactions — ${formatCurrency(totalRevenue)} total`)
    }

    /* ── RENDER ── */
    return (
        <div style={{ width: '100%' }}>

            {/* ══ PAGE HEADER ══ */}
            <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="page-header"
                style={{ marginBottom: 20 }}
            >
                <div>
                    <h1 className="page-title">Reports</h1>
                    <p className="page-subtitle">Sales analytics and inventory insights</p>
                </div>
                <button
                    className="btn"
                    onClick={handleExport}
                    style={{
                        background: 'var(--bg-elevated)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border)',
                        padding: '9px 18px', borderRadius: 10,
                        fontWeight: 700, fontSize: 12,
                        display: 'flex', alignItems: 'center', gap: 7,
                        cursor: 'pointer', transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = '#fff' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                >
                    <Download size={15} /> Export Report
                </button>
            </motion.div>


            {/* ══ KPI STAT CARDS ══ */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.13, duration: 0.32 }}
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 14,
                    marginBottom: 18,
                }}
            >
                {[
                    {
                        label: 'Total Revenue',
                        value: formatCurrency(totalRevenue),
                        color: 'var(--success)',
                        glow: 'rgba(22,163,74,0.18)',
                        topColor: 'rgba(22,163,74,0.5)',
                    },
                    {
                        label: 'Transactions',
                        value: totalTransactions,
                        color: '#3b82f6',
                        glow: 'rgba(37,99,235,0.18)',
                        topColor: 'rgba(37,99,235,0.5)',
                    },
                    {
                        label: 'Avg. Order Value',
                        value: formatCurrency(totalRevenue / Math.max(totalTransactions, 1)),
                        color: '#3b82f6',
                        glow: 'rgba(37,99,235,0.18)',
                        topColor: 'rgba(37,99,235,0.5)',
                    },
                ].map((kpi, i) => (
                    <motion.div
                        key={i}
                        whileHover={{ y: -2 }}
                        style={{
                            background: 'var(--bg-surface)',
                            border: 'none',
                            borderRadius: 12,
                            padding: '18px 20px',
                            position: 'relative', overflow: 'hidden',
                            transition: 'all 0.2s',
                            cursor: 'default',
                        }}
                    >
                        {/* top accent line - removed */}
                        {/* <div style={{
                            position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                            background: `linear-gradient(90deg, transparent, ${kpi.topColor}, transparent)`,
                        }} /> */}
                        <p style={{
                            margin: '0 0 10px',
                            fontSize: 12, fontWeight: 800,
                            color: 'var(--text-muted)',
                            textTransform: 'uppercase', letterSpacing: '0.1em',
                        }}>
                            {kpi.label}
                        </p>
                        <p style={{
                            margin: 0,
                            fontFamily: 'var(--font-primary)',
                            fontSize: 14, fontWeight: 900,
                            color: '#ffffff',
                            letterSpacing: '-0.02em', lineHeight: 1.2,
                        }}>
                            {kpi.value}
                        </p>
                    </motion.div>
                ))}
            </motion.div>

            {/* ══ MAIN TWO-COLUMN GRID ══ */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 20,
                alignItems: 'stretch',
            }}>

                {/* ════════════════════════════
                    LEFT — Revenue Chart Card
                ════════════════════════════ */}
                <motion.div
                    initial={{ opacity: 0, x: -18 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.08, duration: 0.38 }}
                    style={{
                        background: 'var(--bg-surface)',
                        border: 'none',
                        borderRadius: 16,
                        padding: '28px 28px 18px',
                        boxShadow: 'var(--shadow-md)',
                        position: 'relative',
                        overflow: 'hidden',
                        minHeight: 440,
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    {/* top bluish glow strip - removed */}
                    {/* <div style={{
                        position: 'absolute', top: 0, left: '12%', right: '12%', height: 1,
                        background: 'linear-gradient(90deg, transparent, rgba(37,99,235,0.45), transparent)',
                    }} /> */}

                    {/* ── Card header row ── */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        {/* Left: icon + title + LIVE badge */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <BarChart2 size={20} color="#3b82f6" strokeWidth={2} style={{ filter: 'drop-shadow(0 0 6px rgba(37,99,235,0.5))' }} />
                            <span style={{
                                fontFamily: 'var(--font-primary)',
                                fontSize: '1.2rem', fontWeight: 800,
                                color: 'var(--text-primary)',
                            }}>
                                Revenue Chart
                            </span>
                            {/* LIVE badge */}
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                padding: '3px 9px', borderRadius: 20,
                                background: 'rgba(16,185,129,0.1)',
                                border: '1px solid rgba(16,185,129,0.3)',
                                fontSize: 12, fontWeight: 800,
                                color: '#10b981', letterSpacing: '0.05em',
                            }}>
                                <span style={{
                                    width: 5, height: 5, borderRadius: '50%',
                                    background: '#10b981',
                                    boxShadow: livePulse ? '0 0 7px #10b981' : 'none',
                                    transition: 'box-shadow 0.5s',
                                    display: 'inline-block',
                                }} />
                                Live
                            </span>
                        </div>

                        {/* Right: Daily / Weekly / Monthly toggles */}
                        <div style={{ display: 'flex', gap: 6 }}>
                            {['Daily', 'Weekly', 'Monthly'].map(label => {
                                const active = timeRange === label.toLowerCase()
                                return (
                                    <button
                                        key={label}
                                        onClick={() => setTimeRange(label.toLowerCase())}
                                        style={{
                                            padding: '5px 14px',
                                            borderRadius: 8,
                                            border: active
                                                ? '1.5px solid rgba(37,99,235,0.6)'
                                                : '1px solid transparent',
                                            background: 'transparent',
                                            color: active ? '#3b82f6' : 'var(--text-muted)',
                                            fontSize: 12, fontWeight: 700,
                                            cursor: 'pointer', transition: 'all 0.18s',
                                            outline: 'none',
                                            boxShadow: active ? '0 0 12px rgba(37,99,235,0.15)' : 'none',
                                        }}
                                        onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--text-secondary)' }}
                                        onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--text-muted)' }}
                                    >
                                        {label}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Subtitle */}
                    <p style={{ margin: '0 0 18px 0', fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
                        7-day sales performance overview
                    </p>

                    {/* ── Area Chart ── */}
                    <div style={{ width: '100%', flex: 1, minHeight: 280 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="rptGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%"   stopColor="#3b82f6" stopOpacity={0.25} />
                                        <stop offset="65%"  stopColor="#3b82f6" stopOpacity={0.05} />
                                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0}    />
                                    </linearGradient>
                                </defs>

                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="rgba(148,163,184,0.07)"
                                    vertical={false}
                                />

                                <XAxis
                                    dataKey="day"
                                    tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }}
                                    axisLine={false}
                                    tickLine={false}
                                    dy={8}
                                />

                                <YAxis
                                    tickFormatter={yFmt}
                                    tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }}
                                    axisLine={false}
                                    tickLine={false}
                                    dx={-2}
                                />

                                <Tooltip
                                    content={<ChartTooltip />}
                                    cursor={{ stroke: 'rgba(37,99,235,0.15)', strokeWidth: 1, strokeDasharray: '4 4' }}
                                />

                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#3b82f6"
                                    strokeWidth={2.5}
                                    fill="url(#rptGrad)"
                                    dot={{ r: 3.5, fill: '#3b82f6', stroke: 'transparent', strokeWidth: 0 }}
                                    activeDot={{ r: 5.5, fill: '#3b82f6', stroke: 'rgba(37,99,235,0.35)', strokeWidth: 6 }}
                                    style={{ filter: 'drop-shadow(0 0 6px rgba(37,99,235,0.4))' }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* ════════════════════════════
                    RIGHT — Top Selling Products
                ════════════════════════════ */}
                <motion.div
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.12, duration: 0.38 }}
                    style={{
                        background: 'var(--bg-surface)',
                        border: 'none',
                        borderRadius: 16,
                        padding: 28,
                        boxShadow: 'var(--shadow-md)',
                        position: 'relative',
                        overflow: 'hidden',
                        minHeight: 440,
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    {/* top bluish glow strip - removed */}
                    {/* <div style={{
                        position: 'absolute', top: 0, left: '12%', right: '12%', height: 1,
                        background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.45), transparent)',
                    }} /> */}

                    {/* ── Card header row ── */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <TrendingUp
                                size={18}
                                color="#22d3ee"
                                strokeWidth={2.5}
                                style={{ filter: 'drop-shadow(0 0 6px rgba(6,182,212,0.5))' }}
                            />
                            <span style={{
                                fontFamily: 'var(--font-primary)',
                                fontSize: '1.2rem', fontWeight: 800,
                                color: 'var(--text-primary)',
                            }}>
                                Top Selling Products
                            </span>
                        </div>

                        {/* Today pill */}
                        <button style={{
                            padding: '4px 13px', borderRadius: 20,
                            border: '1.5px solid rgba(37,99,235,0.45)',
                            background: 'rgba(37,99,235,0.06)',
                            color: '#3b82f6',
                            fontSize: 12, fontWeight: 700,
                            cursor: 'pointer', outline: 'none',
                            transition: 'all 0.18s',
                        }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(37,99,235,0.12)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(37,99,235,0.2)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(37,99,235,0.06)'; e.currentTarget.style.boxShadow = 'none' }}
                        >
                            Today
                        </button>
                    </div>

                    {/* ── Column headers ── */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 40px 76px',
                        gap: 8,
                        padding: '0 2px 10px',
                        borderBottom: '1px solid var(--border-light)',
                        marginBottom: 2,
                    }}>
                        {['PRODUCT', 'QTY', 'REVENUE'].map(h => (
                            <p key={h} style={{
                                margin: 0,
                                fontSize: 11, fontWeight: 800,
                                color: 'var(--text-muted)',
                                textTransform: 'uppercase', letterSpacing: '0.1em',
                                textAlign: h !== 'PRODUCT' ? 'right' : 'left',
                            }}>
                                {h}
                            </p>
                        ))}
                    </div>

                    {/* ── Product rows ── */}
                    <div>
                        {topProducts.length === 0 ? (
                            <div style={{ padding: '36px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                                No sales transactions recorded yet.
                            </div>
                        ) : (
                            topProducts.map((product, i) => {
                                const rc = rankColors[i] || rankColors[3]
                                return (
                                    <motion.div
                                        key={product.id}
                                        initial={{ opacity: 0, x: -8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.2 + i * 0.06 }}
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 40px 76px',
                                            alignItems: 'center',
                                            gap: 8,
                                            padding: '11px 2px',
                                            borderBottom: i < topProducts.length - 1
                                                ? '1px solid var(--border-light)'
                                                : 'none',
                                            borderRadius: 8,
                                            transition: 'background 0.15s',
                                            cursor: 'default',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        {/* Product col: rank badge + name + category */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                            {/* Rank badge — pill shape */}
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                minWidth: 28, height: 22, padding: '0 6px',
                                                borderRadius: 6,
                                                background: rc.bg,
                                                border: `1px solid ${rc.border}`,
                                                fontSize: 11, fontWeight: 900,
                                                color: rc.text,
                                                flexShrink: 0, letterSpacing: '-0.01em',
                                            }}>
                                                #{i + 1}
                                            </span>
 
                                            <div style={{ minWidth: 0 }}>
                                                <p style={{
                                                    margin: 0,
                                                    fontSize: 13, fontWeight: 700,
                                                    color: 'var(--text-primary)',
                                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                }}>
                                                    {product.name}
                                                </p>
                                                <p style={{
                                                    margin: '1px 0 0',
                                                    fontSize: 11,
                                                    color: 'var(--text-muted)',
                                                    fontWeight: 500,
                                                }}>
                                                    {product.category || 'Products'}
                                                </p>
                                            </div>
                                        </div>
 
                                        {/* QTY */}
                                        <p style={{
                                            margin: 0, textAlign: 'right',
                                            fontSize: 13, fontWeight: 600,
                                            color: 'var(--text-primary)',
                                        }}>
                                            {product.qty}
                                        </p>
 
                                        {/* REVENUE */}
                                        <p style={{
                                            margin: 0, textAlign: 'right',
                                            fontSize: 13, fontWeight: 800,
                                            color: '#3b82f6',
                                            textShadow: '0 0 10px rgba(37,99,235,0.3)',
                                            letterSpacing: '-0.01em',
                                        }}>
                                            {formatCurrency(product.revenue)}
                                        </p>
                                    </motion.div>
                                )
                            })
                        )}
                    </div>
                </motion.div>

            </div>

            {/* Responsive */}
            <style>{`
                @media (max-width: 860px) {
                    .reports-row { grid-template-columns: 1fr !important; }
                }
            `}</style>
        </div>
    )
}
