import { useState, useEffect } from 'react'
import { collection, onSnapshot, orderBy, query, where, Timestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import { formatCurrency, formatDateTime, exportToCSV } from '../../utils/helpers'
import { Download, Search, Eye, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import Pagination from '../../components/common/Pagination'
import toast from 'react-hot-toast'

const PAGE_SIZE = 10

export default function Sales() {
    const [sales, setSales] = useState([])
    const [search, setSearch] = useState('')
    const [selectedSale, setSelectedSale] = useState(null)
    const [dateFilter, setDateFilter] = useState('all')
    const [currentPage, setCurrentPage] = useState(1)

    useEffect(() => {
        const unsub = onSnapshot(
            query(collection(db, 'sales'), orderBy('createdAt', 'desc')),
            snap => setSales(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        )
        return unsub
    }, [])

    const [prevSearch, setPrevSearch] = useState(search)
    const [prevDateFilter, setPrevDateFilter] = useState(dateFilter)
    if (search !== prevSearch || dateFilter !== prevDateFilter) {
        setPrevSearch(search)
        setPrevDateFilter(dateFilter)
        setCurrentPage(1)
    }

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
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
    const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

    const handleExportSales = () => {
        if (filtered.length === 0) {
            toast.error('No sales data to export.')
            return
        }
        const exportData = filtered.map(s => ({
            'Transaction ID': s.transactionId,
            'Cashier': s.cashierName,
            'Date & Time': formatDateTime(s.createdAt),
            'Items Count': s.items?.length || 0,
            'Total': formatCurrency(s.total),
            'Status': s.status || 'completed'
        }))
        exportToCSV(exportData, 'Sales Report')
        toast.success(`Exported ${filtered.length} sales records!`)
    }

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="page-title">Sales Records</h1>
                    <p className="page-subtitle">Total Revenue: <strong style={{ color: 'var(--success)' }}>{formatCurrency(totalRevenue)}</strong></p>
                </div>
                <button className="btn" onClick={handleExportSales} style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 8, padding: '8px 16px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--accent)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-elevated)'}>
                    <Download size={16} /> Export Sales
                </button>
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
                            <th style={{ width: 50 }}>No.</th>
                            <th>Transaction ID</th><th>Cashier</th><th>Date & Time</th>
                            <th>Items</th><th>Total</th><th>Status</th><th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginated.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No sales records found.</td></tr>}
                        {paginated.map((s, index) => {
                            const rowIndex = (currentPage - 1) * PAGE_SIZE + index + 1
                            return (
                                <tr key={s.id}>
                                    <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{rowIndex}</td>
                                    <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent-hover)' }}>{s.transactionId}</td>
                                <td>{s.cashierName}</td>
                                <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{formatDateTime(s.createdAt)}</td>
                                <td>{s.items?.length || 0} items</td>
                                <td style={{ fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(s.total)}</td>
                                <td><span className={`badge badge-${s.status === 'refunded' ? 'danger' : 'success'}`}>{s.status || 'completed'}</span></td>
                                <td>
                                    <button className="btn btn-info btn-sm btn-icon" onClick={() => setSelectedSale(s)}><Eye size={14} /></button>
                                </td>
                            </tr>
                            )
                        })}
                    </tbody>
                </table>
                <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />
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
                            <div className="modal-body" style={{ padding: 24 }}>
                                <div style={{ background: 'var(--bg-elevated)', borderRadius: 12, padding: 20, marginBottom: 20, border: '1px solid var(--border)' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                                        <div>
                                            <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 800, marginBottom: 4 }}>Transaction ID</p>
                                            <p style={{ fontSize: '1.1rem', fontFamily: 'monospace', fontWeight: 800, color: 'var(--accent-hover)' }}>{selectedSale.transactionId}</p>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                        <div>
                                            <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 800, marginBottom: 4 }}>Processed By</p>
                                            <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>{selectedSale.cashierName}</p>
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 800, marginBottom: 4 }}>Date & Time</p>
                                            <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{formatDateTime(selectedSale.createdAt)}</p>
                                        </div>
                                    </div>
                                </div>

                                <h4 style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 10 }}>Sale Items</h4>
                                <div className="table-wrapper" style={{ margin: 0, marginBottom: 20, borderRadius: 10, overflow: 'hidden' }}>
                                    <table style={{ margin: 0 }}>
                                        <thead style={{ background: 'var(--bg-elevated)' }}>
                                            <tr>
                                                <th style={{ fontSize: '0.7rem' }}>Product</th>
                                                <th style={{ fontSize: '0.7rem', width: 60, textAlign: 'center' }}>Qty</th>
                                                <th style={{ fontSize: '0.7rem', width: 100, textAlign: 'right' }}>Price</th>
                                                <th style={{ fontSize: '0.7rem', width: 120, textAlign: 'right' }}>Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedSale.items?.map((item, i) => (
                                                <tr key={i}>
                                                    <td style={{ fontWeight: 500, fontSize: '0.85rem' }}>{item.name}</td>
                                                    <td style={{ textAlign: 'center', fontSize: '0.85rem' }}>{item.qty}</td>
                                                    <td style={{ textAlign: 'right', fontSize: '0.85rem' }}>{formatCurrency(item.price)}</td>
                                                    <td style={{ fontWeight: 700, color: 'var(--success)', textAlign: 'right', fontSize: '0.85rem' }}>{formatCurrency(item.subtotal)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div style={{ background: 'var(--bg-sidebar)', borderRadius: 12, padding: 20, marginTop: 20, border: '1px solid var(--border)' }}>
                                    <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 800, marginBottom: 6 }}>Total Amount</p>
                                    <p style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--success)' }}>{formatCurrency(selectedSale.total)}</p>
                                </div>
                            </div>
                            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                                <button className="btn btn-secondary" onClick={() => setSelectedSale(null)}>Close</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
