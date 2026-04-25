import { useState, useEffect } from 'react'
import { collection, getDocs, query, where, Timestamp, orderBy } from 'firebase/firestore'
import { db } from '../../firebase'
import { formatCurrency } from '../../utils/helpers'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LineChart, Line, Cell
} from 'recharts'
import { Calendar, TrendingUp, Package, Download } from 'lucide-react'

const COLORS = ['#10B981', '#388E3C', '#1976D2', '#D32F2F', '#09bccd']

export default function Reports() {
    const [tab, setTab] = useState('weekly')
    const [salesData, setSalesData] = useState([])
    const [topProducts, setTopProducts] = useState([])
    const [summary, setSummary] = useState({ revenue: 0, transactions: 0, avgOrder: 0 })
    const [loading, setLoading] = useState(false)

    useEffect(() => { loadReport(tab) }, [tab])

    async function loadReport(period) {
        setLoading(true)
        const now = new Date()
        let startDate, groups

        if (period === 'daily') {
            startDate = new Date(); startDate.setHours(0, 0, 0, 0)
            groups = Array.from({ length: 24 }, (_, i) => ({
                label: `${String(i).padStart(2, '0')}:00`, start: new Date(startDate),
                end: new Date(startDate)
            })).map((g, i) => {
                g.start.setHours(i); g.end.setHours(i + 1); return g
            })
        } else if (period === 'weekly') {
            startDate = new Date(); startDate.setDate(startDate.getDate() - 6); startDate.setHours(0, 0, 0, 0)
            groups = Array.from({ length: 7 }, (_, i) => {
                const d = new Date(startDate); d.setDate(d.getDate() + i)
                const end = new Date(d); end.setDate(end.getDate() + 1)
                return { label: d.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' }), start: d, end }
            })
        } else {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1)
            const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
            groups = Array.from({ length: daysInMonth }, (_, i) => {
                const d = new Date(now.getFullYear(), now.getMonth(), i + 1)
                const end = new Date(d); end.setDate(end.getDate() + 1)
                return { label: `Day ${i + 1}`, start: d, end }
            })
        }

        const snap = await getDocs(
            query(collection(db, 'sales'),
                where('createdAt', '>=', Timestamp.fromDate(startDate)),
                where('status', '!=', 'refunded'))
        )
        const allSales = snap.docs.map(d => d.data())

        const chartData = groups.map(g => {
            const inRange = allSales.filter(s => {
                const d = s.createdAt?.toDate?.() || new Date(0)
                return d >= g.start && d < g.end
            })
            return { name: g.label, revenue: inRange.reduce((a, s) => a + (s.total || 0), 0), transactions: inRange.length }
        })

        // Top products
        const prodCount = {}
        allSales.forEach(s => {
            s.items?.forEach(item => {
                prodCount[item.name] = (prodCount[item.name] || 0) + item.qty
            })
        })
        const top = Object.entries(prodCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, qty]) => ({ name, qty }))

        const totalRev = allSales.reduce((a, s) => a + (s.total || 0), 0)
        setSalesData(chartData)
        setTopProducts(top)
        setSummary({ revenue: totalRev, transactions: allSales.length, avgOrder: allSales.length ? totalRev / allSales.length : 0 })
        setLoading(false)
    }

    const tabs = [
        { key: 'daily', label: 'Daily', icon: Calendar },
        { key: 'weekly', label: 'Weekly', icon: TrendingUp },
        { key: 'monthly', label: 'Monthly', icon: Package },
    ]

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Reports</h1>
                    <p className="page-subtitle">Sales analytics and inventory insights</p>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
                {tabs.map(({ key, label, icon: Icon }) => (
                    <button key={key} id={`report-tab-${key}`}
                        className={`btn ${tab === key ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setTab(key)}>
                        <Icon size={15} /> {label}
                    </button>
                ))}
            </div>

            {/* Summary KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
                {[
                    { label: 'Total Revenue', value: formatCurrency(summary.revenue), color: 'var(--success)' },
                    { label: 'Transactions', value: summary.transactions, color: 'var(--accent-hover)' },
                    { label: 'Avg. Order Value', value: formatCurrency(summary.avgOrder), color: 'var(--cyan)' },
                ].map(({ label, value, color }) => (
                    <div key={label} className="glass-card" style={{ padding: '20px 24px' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
                        <p style={{ fontSize: '1.6rem', fontWeight: 800, color, marginTop: 4, fontFamily: 'var(--font-display)' }}>{value}</p>
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 24 }}>
                <div className="glass-card" style={{ padding: 24 }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 20 }}>Revenue Chart</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={salesData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                            <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} interval="preserveStartEnd" />
                            <YAxis tickFormatter={v => `₱${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                            <Tooltip
                                formatter={(v, name) => [name === 'revenue' ? formatCurrency(v) : v, name === 'revenue' ? 'Revenue' : 'Transactions']}
                                contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8 }}
                            />
                            <Bar dataKey="revenue" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="glass-card" style={{ padding: 24 }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 20 }}>Top Selling Products</h3>
                    {topProducts.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No data for this period.</p>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {topProducts.map((p, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 28, height: 28, borderRadius: 8, background: `${COLORS[i]}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS[i], fontWeight: 800, fontSize: '0.75rem', flexShrink: 0 }}>{i + 1}</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{p.name}</span>
                                        <span style={{ fontSize: '0.8rem', color: COLORS[i], fontWeight: 700 }}>{p.qty} sold</span>
                                    </div>
                                    <div style={{ height: 4, background: 'var(--bg-elevated)', borderRadius: 2 }}>
                                        <div style={{ height: '100%', width: `${(p.qty / (topProducts[0]?.qty || 1)) * 100}%`, background: COLORS[i], borderRadius: 2, transition: 'width 0.6s ease' }} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
