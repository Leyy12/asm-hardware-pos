import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
    collection, onSnapshot, addDoc, doc, runTransaction,
    serverTimestamp, query, where
} from 'firebase/firestore'
import { db } from '../../firebase'
import { auth } from '../../firebase'
import { formatCurrency, formatDateTime } from '../../utils/helpers'
import { Search, RotateCcw, Check } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

export default function CashierRefund() {
    const [saleIdInput, setSaleIdInput] = useState('')
    const [foundSale, setFoundSale] = useState(null)
    const [selectedItems, setSelectedItems] = useState([])
    const [reason, setReason] = useState('')
    const [processing, setProcessing] = useState(false)
    const [sales, setSales] = useState([])
    const { userProfile } = useAuth()

    useEffect(() => {
        const unsub = onSnapshot(
            query(collection(db, 'sales'), where('status', '==', 'completed')),
            snap => setSales(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        )
        return unsub
    }, [])

    const handleSearch = () => {
        const sale = sales.find(s =>
            s.transactionId?.toLowerCase() === saleIdInput.trim().toLowerCase()
        )
        if (!sale) return toast.error('Transaction not found.')
        setFoundSale(sale)
        setSelectedItems([])
    }

    const toggleItem = (item) => {
        setSelectedItems(prev =>
            prev.find(i => i.productId === item.productId)
                ? prev.filter(i => i.productId !== item.productId)
                : [...prev, { ...item, refundAmount: item.subtotal }]
        )
    }

    const handleRefund = async () => {
        if (selectedItems.length === 0) return toast.error('Select at least one item to refund.')
        if (!reason.trim()) return toast.error('Please provide a reason for the refund.')
        setProcessing(true)

        try {
            const totalRefund = selectedItems.reduce((s, i) => s + i.refundAmount, 0)

            await runTransaction(db, async (tx) => {
                // Restore stock
                for (const item of selectedItems) {
                    const pRef = doc(db, 'products', item.productId)
                    const pSnap = await tx.get(pRef)
                    if (pSnap.exists()) {
                        tx.update(pRef, { stock: pSnap.data().stock + item.qty, updatedAt: serverTimestamp() })
                    }
                }

                // Create refund record
                const refundRef = doc(collection(db, 'refunds'))
                tx.set(refundRef, {
                    originalSaleId: foundSale.transactionId,
                    originalSaleDocId: foundSale.id,
                    cashierId: auth.currentUser?.uid,
                    cashierName: userProfile?.name || 'Cashier',
                    reason,
                    items: selectedItems.map(i => ({ productId: i.productId, name: i.name, qty: i.qty, refundAmount: i.refundAmount })),
                    totalRefund,
                    createdAt: serverTimestamp()
                })

                // Mark original sale as refunded
                tx.update(doc(db, 'sales', foundSale.id), { status: 'refunded', updatedAt: serverTimestamp() })
            })

            toast.success('Refund processed successfully!')
            setFoundSale(null)
            setSaleIdInput('')
            setSelectedItems([])
            setReason('')
        } catch (err) {
            toast.error(err.message || 'Refund failed.')
        } finally {
            setProcessing(false)
        }
    }

    const totalRefund = selectedItems.reduce((s, i) => s + i.refundAmount, 0)

    return (
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
            <h1 className="page-title" style={{ marginBottom: 8 }}>Process Refund</h1>
            <p className="page-subtitle" style={{ marginBottom: 28 }}>Search a completed transaction to initiate a refund.</p>

            {/* Search */}
            <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
                <label className="form-label">Transaction ID</label>
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                    <input
                        id="refund-search-input"
                        className="form-input"
                        placeholder="e.g. ASM-260425-0001"
                        value={saleIdInput}
                        onChange={e => setSaleIdInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    />
                    <button id="refund-search-btn" className="btn btn-primary" onClick={handleSearch}>
                        <Search size={16} /> Search
                    </button>
                </div>
            </div>

            {/* Found Sale */}
            {foundSale && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                            <div>
                                <p style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-hover)', fontSize: '1rem' }}>{foundSale.transactionId}</p>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    By {foundSale.cashierName} · {formatDateTime(foundSale.createdAt)}
                                </p>
                            </div>
                            <span className="badge badge-success">Select items to refund</span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                            {foundSale.items?.map((item, i) => {
                                const checked = !!selectedItems.find(s => s.productId === item.productId)
                                return (
                                    <div
                                        key={i}
                                        id={`refund-item-${i}`}
                                        onClick={() => toggleItem(item)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 14,
                                            padding: '12px 16px', borderRadius: 10,
                                            background: checked ? 'var(--danger-bg)' : 'var(--bg-elevated)',
                                            border: `1px solid ${checked ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
                                            cursor: 'pointer', transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${checked ? 'var(--danger)' : 'var(--text-muted)'}`, background: checked ? 'var(--danger)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            {checked && <Check size={12} color="white" />}
                                        </div>
                                        <span style={{ flex: 1, fontWeight: 600, fontSize: '0.875rem' }}>{item.name}</span>
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>x{item.qty}</span>
                                        <span style={{ fontWeight: 700, color: checked ? 'var(--danger)' : 'var(--text-primary)' }}>{formatCurrency(item.subtotal)}</span>
                                    </div>
                                )
                            })}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Reason for Refund *</label>
                            <textarea className="form-textarea" placeholder="e.g. Defective item, wrong product ordered…" value={reason} onChange={e => setReason(e.target.value)} />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                            <p style={{ fontWeight: 800, color: 'var(--danger)', fontSize: '1.1rem' }}>
                                Refund: {formatCurrency(totalRefund)}
                            </p>
                            <button
                                id="process-refund-btn"
                                className="btn btn-danger"
                                onClick={handleRefund}
                                disabled={processing || selectedItems.length === 0 || !reason.trim()}
                            >
                                <RotateCcw size={16} />
                                {processing ? 'Processing…' : 'Process Refund'}
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    )
}
