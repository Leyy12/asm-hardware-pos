import { useState, useEffect } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../../firebase'
import { formatCurrency, formatDateTime, exportToCSV } from '../../utils/helpers'
import { Download, Search, Eye, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

export default function Refunds() {
    const [refunds, setRefunds] = useState([])
    const [search, setSearch] = useState('')
    const [selected, setSelected] = useState(null)

    useEffect(() => {
        const unsub = onSnapshot(
            query(collection(db, 'refunds'), orderBy('createdAt', 'desc')),
            snap => setRefunds(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        )
        return unsub
    }, [])

    const filtered = refunds.filter(r =>
        r.originalSaleId?.toLowerCase().includes(search.toLowerCase()) ||
        r.cashierId?.toLowerCase().includes(search.toLowerCase())
    )

    const totalRefunded = filtered.reduce((s, d) => s + (d.totalRefund || 0), 0)

    const handleExport = () => {
        exportToCSV(filtered.map(r => ({
            'Original Sale ID': r.originalSaleId,
            'Reason': r.reason,
            'Total Refund': r.totalRefund,
            'Date': formatDateTime(r.createdAt)
        })), 'refunds')
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Refund Records</h1>
                    <p className="page-subtitle">Total Refunded: <strong style={{ color: 'var(--danger)' }}>{formatCurrency(totalRefunded)}</strong></p>
                </div>
                <button className="btn btn-secondary" onClick={handleExport}><Download size={16} /> Export</button>
            </div>

            <div className="search-bar" style={{ marginBottom: 20, maxWidth: 400 }}>
                <Search size={15} className="search-icon" />
                <input id="refunds-search" className="form-input" placeholder="Search by sale ID…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr><th>Original Sale ID</th><th>Reason</th><th>Items</th><th>Total Refund</th><th>Date</th><th>Action</th></tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No refund records found.</td></tr>}
                        {filtered.map(r => (
                            <tr key={r.id}>
                                <td style={{ fontFamily: 'monospace', color: 'var(--accent-hover)', fontWeight: 600 }}>{r.originalSaleId}</td>
                                <td style={{ color: 'var(--text-secondary)' }}>{r.reason || '—'}</td>
                                <td>{r.items?.length || 0} items</td>
                                <td style={{ fontWeight: 700, color: 'var(--danger)' }}>-{formatCurrency(r.totalRefund)}</td>
                                <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{formatDateTime(r.createdAt)}</td>
                                <td><button className="btn btn-secondary btn-sm btn-icon" onClick={() => setSelected(r)}><Eye size={14} /></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <AnimatePresence>
                {selected && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.div className="modal" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
                            <div className="modal-header">
                                <span className="modal-title">Refund Details</span>
                                <button className="chat-icon-btn" onClick={() => setSelected(null)}><X size={18} /></button>
                            </div>
                            <div className="modal-body">
                                <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: 16 }}>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Original Sale: <span style={{ color: 'var(--accent-hover)', fontFamily: 'monospace' }}>{selected.originalSaleId}</span></p>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>Reason: <span style={{ color: 'var(--text-primary)' }}>{selected.reason}</span></p>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>Date: {formatDateTime(selected.createdAt)}</p>
                                </div>
                                <div className="table-wrapper">
                                    <table>
                                        <thead><tr><th>Product</th><th>Qty</th><th>Refund Amount</th></tr></thead>
                                        <tbody>
                                            {selected.items?.map((item, i) => (
                                                <tr key={i}>
                                                    <td>{item.name}</td><td>{item.qty}</td>
                                                    <td style={{ fontWeight: 600, color: 'var(--danger)' }}>-{formatCurrency(item.refundAmount)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--danger)' }}>Total: -{formatCurrency(selected.totalRefund)}</p>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
