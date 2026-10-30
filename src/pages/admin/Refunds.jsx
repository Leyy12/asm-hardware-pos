import { useState, useEffect } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../../firebase'
import { formatCurrency, formatDateTime } from '../../utils/helpers'
import { Search, Eye, X, CheckCircle } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import Pagination from '../../components/common/Pagination'

const PAGE_SIZE = 10

const getExampleName = (id) => {
    const NAMES = [
        'Juan Dela Cruz',
        'Maria Santos',
        'Jose Rizal',
        'Ana Alcantara',
        'Pedro Penduko',
        'Gabriela Silang',
        'Andres Bonifacio',
        'Corazon Aquino',
        'Manuel Quezon',
        'Emilio Aguinaldo',
        'Melchora Aquino',
        'Apolinario Mabini'
    ]
    if (!id) return NAMES[0]
    let hash = 0
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash)
    }
    return NAMES[Math.abs(hash) % NAMES.length]
}

export default function Refunds() {
    const [exchanges, setExchanges] = useState([])
    const [search, setSearch] = useState('')
    const [selected, setSelected] = useState(null)
    const [currentPage, setCurrentPage] = useState(1)

    useEffect(() => {
        const unsub = onSnapshot(
            query(collection(db, 'refundExchangeRecords'), orderBy('createdAt', 'desc')),
            snap => setExchanges(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        )
        return unsub
    }, [])

    const [prevSearch, setPrevSearch] = useState(search)
    if (search !== prevSearch) {
        setPrevSearch(search)
        setCurrentPage(1)
    }

    const filtered = exchanges.filter(e =>
        e.exchangeReference?.toLowerCase().includes(search.toLowerCase()) ||
        e.originalSaleId?.toLowerCase().includes(search.toLowerCase()) ||
        e.cashierName?.toLowerCase().includes(search.toLowerCase())
    )

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
    const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

    const statusBadge = (status) => {
        return <span className="badge badge-success"><CheckCircle size={12}/> {status}</span>
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Exchange & Refund Records</h1>
                    <p className="page-subtitle">Approved exchanges completed by cashiers • {exchanges.length} total records</p>
                </div>
            </div>

            <div className="search-bar" style={{ marginBottom: 20, maxWidth: 400 }}>
                <Search size={15} className="search-icon" />
                <input id="exchanges-search" className="form-input" placeholder="Search by Reference, Sale ID, or Cashier…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th style={{ width: 44 }}>No.</th>
                            <th style={{ whiteSpace: 'nowrap' }}>Exchange Ref</th>
                            <th style={{ whiteSpace: 'nowrap' }}>Original Sale</th>
                            <th style={{ whiteSpace: 'nowrap' }}>Customer</th>
                            <th style={{ whiteSpace: 'nowrap' }}>Cashier</th>
                            <th>Reason</th>
                            <th style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>Total Value</th>
                            <th style={{ whiteSpace: 'nowrap' }}>Status</th>
                            <th style={{ whiteSpace: 'nowrap' }}>Date & Time</th>
                            <th style={{ textAlign: 'center', width: 130 }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginated.length === 0 && <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No exchange records found.</td></tr>}
                        {paginated.map((e, index) => {
                            const rowIndex = (currentPage - 1) * PAGE_SIZE + index + 1
                            return (
                                <tr key={e.id}>
                                    <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{rowIndex}</td>
                                    <td style={{ fontFamily: 'monospace', color: 'var(--accent-hover)', fontWeight: 700, whiteSpace: 'nowrap' }}>{e.exchangeReference}</td>
                                    <td style={{ fontFamily: 'monospace', color: 'var(--accent-hover)', fontWeight: 700, whiteSpace: 'nowrap' }}>{e.originalSaleId}</td>
                                    <td style={{ color: 'var(--text-primary)', fontWeight: 600, whiteSpace: 'nowrap' }}>{e.customerName || getExampleName(e.id)}</td>
                                    <td style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{e.cashierName}</td>
                                    <td style={{ color: 'var(--text-secondary)' }}>
                                        <div style={{ maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {e.reason || '—'}
                                        </div>
                                    </td>
                                    <td style={{ fontWeight: 700, color: 'var(--success)', whiteSpace: 'nowrap', textAlign: 'right' }}>{formatCurrency(e.replacementValue)}</td>
                                    <td>{statusBadge(e.status)}</td>
                                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>{formatDateTime(e.createdAt)}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <button
                                            onClick={() => setSelected(e)}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 5,
                                                background: 'rgba(14,165,233,0.12)',
                                                color: '#38bdf8',
                                                border: '1px solid rgba(14,165,233,0.3)',
                                                borderRadius: 6,
                                                padding: '5px 12px',
                                                fontSize: '0.78rem',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                whiteSpace: 'nowrap',
                                                transition: 'all 0.15s',
                                            }}
                                            onMouseEnter={ev => { ev.currentTarget.style.background = 'rgba(14,165,233,0.22)'; ev.currentTarget.style.borderColor = '#38bdf8' }}
                                            onMouseLeave={ev => { ev.currentTarget.style.background = 'rgba(14,165,233,0.12)'; ev.currentTarget.style.borderColor = 'rgba(14,165,233,0.3)' }}
                                        >
                                            <Eye size={13} /> View Details
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
                <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />
            </div>

            <AnimatePresence>
                {selected && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.div className="modal" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
                            <div className="modal-header">
                                <span className="modal-title">Exchange Record Details</span>
                                <button className="chat-icon-btn" onClick={() => setSelected(null)}><X size={18} /></button>
                            </div>
                            <div className="modal-body" style={{ padding: 24 }}>
                                <div style={{ background: 'var(--bg-elevated)', borderRadius: 12, padding: 20, marginBottom: 20, border: '1px solid var(--border)' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                                        <div>
                                            <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 800, marginBottom: 4 }}>Exchange Reference</p>
                                            <p style={{ fontSize: '1.1rem', fontFamily: 'monospace', fontWeight: 800, color: 'var(--accent-hover)' }}>{selected.exchangeReference}</p>
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 800, marginBottom: 4 }}>Original Sale</p>
                                            <p style={{ fontSize: '1.1rem', fontFamily: 'monospace', fontWeight: 800, color: 'var(--accent-hover)' }}>{selected.originalSaleId}</p>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 20 }}>
                                        <div>
                                            <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 800, marginBottom: 4 }}>Customer Name</p>
                                            <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 700 }}>{selected.customerName || getExampleName(selected.id)}</p>
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 800, marginBottom: 4 }}>Processed By</p>
                                            <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>{selected.cashierName}</p>
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 800, marginBottom: 4 }}>Date & Time</p>
                                            <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{formatDateTime(selected.createdAt)}</p>
                                        </div>
                                    </div>

                                    <div style={{ background: 'var(--bg-sidebar)', padding: 14, borderRadius: 8, borderLeft: '4px solid var(--accent)' }}>
                                        <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 800, marginBottom: 6 }}>Reason for Exchange</p>
                                        <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>"{selected.reason}"</p>
                                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                <strong>Returned Condition:</strong> {selected.returnedCondition === 'reusable' ? '✓ Reusable (Inventory Restored)' : '✗ Defective (Not Restocked)'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <h4 style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 10 }}>Returned Items</h4>
                                <div className="table-wrapper" style={{ margin: 0, marginBottom: 20, borderRadius: 10, overflow: 'hidden' }}>
                                    <table style={{ margin: 0 }}>
                                        <thead style={{ background: 'var(--bg-elevated)' }}>
                                            <tr>
                                                <th style={{ fontSize: '0.7rem' }}>Product</th>
                                                <th style={{ fontSize: '0.7rem', width: 60, textAlign: 'center' }}>Qty</th>
                                                <th style={{ fontSize: '0.7rem', width: 120, textAlign: 'right' }}>Refund Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selected.returnedItems?.map((item, i) => (
                                                <tr key={i}>
                                                    <td style={{ fontWeight: 500, fontSize: '0.85rem' }}>{item.name}</td>
                                                    <td style={{ textAlign: 'center', fontSize: '0.85rem' }}>{item.qty}</td>
                                                    <td style={{ fontWeight: 700, color: 'var(--danger)', textAlign: 'right', fontSize: '0.85rem' }}>{formatCurrency(item.amount)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <h4 style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 10 }}>Replacement Items Given</h4>
                                <div className="table-wrapper" style={{ margin: 0, borderRadius: 10, overflow: 'hidden' }}>
                                    <table style={{ margin: 0 }}>
                                        <thead style={{ background: 'var(--bg-elevated)' }}>
                                            <tr>
                                                <th style={{ fontSize: '0.7rem' }}>Product</th>
                                                <th style={{ fontSize: '0.7rem', width: 60, textAlign: 'center' }}>Qty</th>
                                                <th style={{ fontSize: '0.7rem', width: 120, textAlign: 'right' }}>Price</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selected.replacementItems?.map((item, i) => (
                                                <tr key={i}>
                                                    <td style={{ fontWeight: 500, fontSize: '0.85rem' }}>{item.name}</td>
                                                    <td style={{ textAlign: 'center', fontSize: '0.85rem' }}>{item.qty}</td>
                                                    <td style={{ fontWeight: 700, color: 'var(--text-primary)', textAlign: 'right', fontSize: '0.85rem' }}>{formatCurrency(item.price * item.qty)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div style={{ background: 'var(--bg-sidebar)', borderRadius: 12, padding: 20, marginTop: 20, border: '1px solid var(--border)' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                        <div>
                                            <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 800, marginBottom: 6 }}>Total Refund Value</p>
                                            <p style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--danger)' }}>{formatCurrency(selected.totalRefund)}</p>
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 800, marginBottom: 6 }}>Replacement Value</p>
                                            <p style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--success)' }}>{formatCurrency(selected.replacementValue)}</p>
                                        </div>
                                    </div>
                                    {selected.additionalPayment > 0 && (
                                        <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                <strong>Additional Payment:</strong> {formatCurrency(selected.additionalPayment)} (Customer paid this amount)
                                            </p>
                                        </div>
                                    )}
                                    {selected.exchangeCredit > 0 && (
                                        <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                <strong>Store Credit:</strong> {formatCurrency(selected.exchangeCredit)} (Customer received this as credit/balance)
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {selected.notes && (
                                    <div style={{ background: 'rgba(76, 175, 80, 0.1)', borderRadius: 12, padding: 16, marginTop: 20, border: '1px solid rgba(76, 175, 80, 0.3)', borderLeft: '4px solid var(--success)' }}>
                                        <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--success)', fontWeight: 800, marginBottom: 6 }}>Notes</p>
                                        <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{selected.notes}</p>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                                <button className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
