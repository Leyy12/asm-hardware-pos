import { useState, useEffect } from 'react'
import { collection, onSnapshot, orderBy, query, where, Timestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import { formatCurrency, formatDateTime, exportToCSV } from '../../utils/helpers'
import { Download, Search, Eye, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

export default function Sales() {
    const [sales, setSales] = useState([])
    const [search, setSearch] = useState('')
    const [selectedSale, setSelectedSale] = useState(null)
    const [dateFilter, setDateFilter] = useState('all')

    useEffect(() => {
        const unsub = onSnapshot(
            query(collection(db, 'sales'), orderBy('createdAt', 'desc')),
            snap => setSales(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        )
        return unsub
    }, [])

    const filtered = sales.filter(s => {
        const matchSearch = s.transactionId?.toLowerCase().includes(search.toLowerCase()) ||
            s.cashierName?.toLowerCase().includes(search.toLowerCase())
        if (!matchSearch) return false
        if (dateFilter === 'all') return true
        const date = s.createdAt?.toDate?.() || new Date()
        const now = new Date()
        if (dateFilter === 'today') {
            return date.toDateString() === now.toDateString()
        }
        if (dateFilter === 'week') {
            const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
            return date >= weekAgo
        }
        if (dateFilter === 'month') {
            return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
        }
        return true
    })

    const totalRevenue = filtered.filter(s => s.status !== 'refunded').reduce((s, d) => s + (d.total || 0), 0)

    const handleExport = () => {
        const data = filtered.map(s => ({
            'Transaction ID': s.transactionId, 'Cashier': s.cashierName,
            'Date': formatDateTime(s.createdAt), 'Total': s.total, 'Status': s.status || 'completed'
        }))
        exportToCSV(data, 'sales')
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Sales Records</h1>
                    <p className="page-subtitle">Total Revenue: <strong style={{ color: 'var(--success)' }}>{formatCurrency(totalRevenue)}</strong></p>
                </div>
                <button className="btn btn-secondary" onClick={handleExport}><Download size={16} /> Export</button>
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
                    <Search size={15} className="search-icon" />
                    <input id="sales-search" className="form-input" placeholder="Search transaction ID or cashier…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="form-select" style={{ width: 160 }} value={dateFilter} onChange={e => setDateFilter(e.target.value)}>
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                </select>
            </div>

            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Transaction ID</th><th>Cashier</th><th>Date & Time</th>
                            <th>Items</th><th>Total</th><th>Status</th><th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No sales records found.</td></tr>}
                        {filtered.map(s => (
                            <tr key={s.id}>
                                <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent-hover)' }}>{s.transactionId}</td>
                                <td>{s.cashierName}</td>
                                <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{formatDateTime(s.createdAt)}</td>
                                <td>{s.items?.length || 0} items</td>
                                <td style={{ fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(s.total)}</td>
                                <td><span className={`badge badge-${s.status === 'refunded' ? 'danger' : 'success'}`}>{s.status || 'completed'}</span></td>
                                <td>
                                    <button className="btn btn-secondary btn-sm btn-icon" onClick={() => setSelectedSale(s)}><Eye size={14} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Detail Modal */}
            <AnimatePresence>
                {selectedSale && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.div className="modal" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
                            <div className="modal-header">
                                <span className="modal-title">Sale Details</span>
                                <button className="chat-icon-btn" onClick={() => setSelectedSale(null)}><X size={18} /></button>
                            </div>
                            <div className="modal-body">
                                <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: 16, marginBottom: 8 }}>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Transaction ID</p>
                                    <p style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-hover)' }}>{selectedSale.transactionId}</p>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>Cashier: <span style={{ color: 'var(--text-primary)' }}>{selectedSale.cashierName}</span></p>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Date: <span style={{ color: 'var(--text-primary)' }}>{formatDateTime(selectedSale.createdAt)}</span></p>
                                </div>
                                <div className="table-wrapper">
                                    <table>
                                        <thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr></thead>
                                        <tbody>
                                            {selectedSale.items?.map((item, i) => (
                                                <tr key={i}>
                                                    <td>{item.name}</td>
                                                    <td>{item.qty}</td>
                                                    <td>{formatCurrency(item.price)}</td>
                                                    <td style={{ fontWeight: 600 }}>{formatCurrency(item.subtotal)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div style={{ textAlign: 'right', paddingTop: 8 }}>
                                    <p style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--success)' }}>Total: {formatCurrency(selectedSale.total)}</p>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
