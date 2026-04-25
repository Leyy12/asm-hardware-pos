// Discount Cards Management Page for ASM Hardware
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    collection, onSnapshot, addDoc, updateDoc, deleteDoc,
    doc, serverTimestamp, query, orderBy, getDoc
} from 'firebase/firestore'
import { db } from '../../firebase'
import { QRCodeSVG } from 'qrcode.react'
import { Plus, Trash2, X, CreditCard, QrCode, Copy, RefreshCw, Package } from 'lucide-react'
import toast from 'react-hot-toast'

// Generate a unique card number: ASM-XXXX-XXXX-XXXX
function generateCardNumber() {
    const seg = () => Math.random().toString(36).substring(2, 6).toUpperCase()
    return `ASM-${seg()}-${seg()}-${seg()}`
}

const STATUS_COLORS = {
    active: 'success',
    used: 'warning',
    revoked: 'danger'
}

export default function DiscountCards() {
    const [cards, setCards] = useState([])
    const [qrCard, setQrCard] = useState(null)
    const [editCard, setEditCard] = useState(null)
    const [deleteId, setDeleteId] = useState(null)
    const [generating, setGenerating] = useState(false)
    const [count, setCount] = useState(1)
    const [customerName, setCustomerName] = useState('')
    const [filterStatus, setFilterStatus] = useState('all')
    const [defaultRate, setDefaultRate] = useState(10)

    useEffect(() => {
        const unsub = onSnapshot(
            query(collection(db, 'discountCards'), orderBy('createdAt', 'desc')),
            snap => setCards(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        )
        // Fetch default settings
        getDoc(doc(db, 'settings', 'system')).then(snap => {
            if (snap.exists() && snap.data().defaultDiscount) {
                setDefaultRate(snap.data().defaultDiscount)
            }
        })
        return unsub
    }, [])

    const handleGenerate = async () => {
        if (!customerName && count === 1) return toast.error('Please enter a customer name for single card generation.')
        setGenerating(true)
        try {
            const batch = Array.from({ length: Number(count) }, (_, i) => ({
                cardNumber: generateCardNumber(),
                customerName: count === 1 ? customerName : `Customer ${i + 1}`,
                status: 'active',
                discount: defaultRate,
                createdAt: serverTimestamp(),
                usedAt: null,
                usedBy: null,
                transactionId: null
            }))
            for (const card of batch) {
                await addDoc(collection(db, 'discountCards'), card)
            }
            toast.success(`Generated ${count} discount card${count > 1 ? 's' : ''}!`)
            setCount(1)
            setCustomerName('')
        } catch (err) {
            toast.error('Failed to generate cards.')
        } finally {
            setGenerating(false)
        }
    }

    const handleUpdate = async () => {
        if (!editCard.customerName) return toast.error('Customer name is required.')
        try {
            await updateDoc(doc(db, 'discountCards', editCard.id), {
                customerName: editCard.customerName,
                discount: Number(editCard.discount)
            })
            toast.success('Card updated!')
            setEditCard(null)
        } catch (err) {
            toast.error('Failed to update card.')
        }
    }

    const handleRevoke = async (id) => {
        if (!id) return
        await updateDoc(doc(db, 'discountCards', id), { status: 'revoked' })
        toast.success('Card revoked.')
        setDeleteId(null)
    }

    const handleDelete = async (id) => {
        if (!id) return
        await deleteDoc(doc(db, 'discountCards', id))
        toast.success('Card deleted.')
        setDeleteId(null)
    }

    const copyCard = (num) => {
        navigator.clipboard.writeText(num)
        toast.success('Card number copied!')
    }

    const filtered = filterStatus === 'all' ? cards : cards.filter(c => c.status === filterStatus)
    const stats = {
        total: cards.length,
        active: cards.filter(c => c.status === 'active').length,
        used: cards.filter(c => c.status === 'used').length,
        revoked: cards.filter(c => c.status === 'revoked').length
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Discount Cards</h1>
                    <p className="page-subtitle">Manage 10% discount cards for customers</p>
                </div>
            </div>

            {/* Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
                {[
                    { label: 'Total Cards', value: stats.total, color: 'var(--text-primary)', bg: 'rgba(255,255,255,0.05)' },
                    { label: 'Active', value: stats.active, color: 'var(--success)', bg: 'var(--success-bg)' },
                    { label: 'Used', value: stats.used, color: 'var(--warning)', bg: 'var(--warning-bg)' },
                    { label: 'Revoked', value: stats.revoked, color: 'var(--danger)', bg: 'var(--danger-bg)' },
                ].map(({ label, value, color, bg }) => (
                    <div key={label} className="glass-card" style={{ padding: '18px 22px', background: bg }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
                        <p style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 900, color, margin: 0 }}>{value}</p>
                    </div>
                ))}
            </div>

            {/* Generate Panel */}
            <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CreditCard size={18} style={{ color: 'var(--accent-hover)' }} />
                    Generate New Cards
                </h3>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ flex: 1, minWidth: 200, margin: 0 }}>
                        <label className="form-label">Customer Name</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="e.g. Juan Dela Cruz"
                            value={customerName}
                            onChange={e => setCustomerName(e.target.value)}
                        />
                    </div>
                    <div className="form-group" style={{ width: 120, margin: 0 }}>
                        <label className="form-label">Qty</label>
                        <input
                            type="number"
                            className="form-input"
                            min={1}
                            max={50}
                            value={count}
                            onChange={e => setCount(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                        />
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={handleGenerate}
                        disabled={generating}
                        style={{ height: 42, gap: 8 }}
                    >
                        <Plus size={16} />
                        {generating ? 'Generating…' : `Create Card`}
                    </button>
                </div>
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {['all', 'active', 'used', 'revoked'].map(s => (
                    <button
                        key={s}
                        className={`pos-mode-tab ${filterStatus === s ? 'active' : ''}`}
                        onClick={() => setFilterStatus(s)}
                        style={{ textTransform: 'capitalize' }}
                    >
                        {s === 'all' ? 'All Cards' : s}
                        {s === 'all'
                            ? ` (${stats.total})`
                            : ` (${stats[s] ?? 0})`
                        }
                    </button>
                ))}
            </div>

            {/* Cards Table */}
            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Customer Name</th>
                            <th>Card Number</th>
                            <th>Discount</th>
                            <th>Status</th>
                            <th>Created</th>
                            <th style={{ width: 150 }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 && (
                            <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
                                No cards found. Generate some above!
                            </td></tr>
                        )}
                        {filtered.map(card => (
                            <tr key={card.id}>
                                <td><span style={{ fontWeight: 700 }}>{card.customerName || '—'}</span></td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                            {card.cardNumber}
                                        </span>
                                        <button
                                            onClick={() => copyCard(card.cardNumber)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
                                            title="Copy card number"
                                        >
                                            <Copy size={13} />
                                        </button>
                                    </div>
                                </td>
                                <td><span style={{ fontWeight: 800, color: 'var(--success)' }}>{card.discount || 10}%</span></td>
                                <td>
                                    <span className={`badge badge-${STATUS_COLORS[card.status] || 'secondary'}`}>
                                        {card.status}
                                    </span>
                                </td>
                                <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    {card.createdAt?.toDate?.()?.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) || '—'}
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button
                                            className="btn btn-secondary btn-sm btn-icon"
                                            onClick={() => setQrCard(card)}
                                            title="View & Print ID"
                                        >
                                            <QrCode size={13} />
                                        </button>
                                        <button
                                            className="btn btn-secondary btn-sm btn-icon"
                                            onClick={() => setEditCard(card)}
                                            title="Edit Card Info"
                                        >
                                            <RefreshCw size={13} />
                                        </button>
                                        {card.status === 'active' && (
                                            <button
                                                className="btn btn-secondary btn-sm"
                                                style={{ fontSize: '0.75rem' }}
                                                onClick={() => setDeleteId({ action: 'revoke', card })}
                                                title="Revoke"
                                            >
                                                Revoke
                                            </button>
                                        )}
                                        <button
                                            className="btn btn-danger btn-sm btn-icon"
                                            onClick={() => setDeleteId({ action: 'delete', card })}
                                            title="Delete"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* QR Code / ID Card Modal */}
            <AnimatePresence>
                {qrCard && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setQrCard(null)}>
                        <motion.div className="modal" style={{ maxWidth: 420, padding: 0, background: 'transparent', boxShadow: 'none' }}
                            initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }}
                            onClick={e => e.stopPropagation()}>
                            
                            {/* The Premium ID Card Design */}
                            <div id="dc-card-printable" style={{ 
                                width: '380px', 
                                height: '540px', 
                                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', 
                                borderRadius: '32px', 
                                padding: '40px 30px', 
                                display: 'flex', 
                                flexDirection: 'column', 
                                alignItems: 'center', 
                                border: '3px solid #F2D21E',
                                position: 'relative',
                                overflow: 'hidden',
                                margin: '0 auto',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
                            }}>
                                {/* Mesh Gradient Overlay */}
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.1, backgroundImage: 'radial-gradient(at 0% 0%, #F2D21E 0, transparent 50%), radial-gradient(at 100% 100%, #F2D21E 0, transparent 50%)', zIndex: 0 }} />
                                
                                <div style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    {/* Header & Logo */}
                                    <div style={{ textAlign: 'center', marginBottom: 30, width: '100%' }}>
                                        <div style={{ background: '#F2D21E', width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', boxShadow: '0 8px 16px rgba(242, 210, 30, 0.3)' }}>
                                            <Package size={28} color="#000" />
                                        </div>
                                        <h2 style={{ color: '#F2D21E', margin: 0, fontSize: '1.75rem', fontWeight: 900, letterSpacing: '2px', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>ASM HARDWARE</h2>
                                        <p style={{ color: 'white', margin: 0, fontSize: '0.7rem', letterSpacing: '4px', opacity: 0.7, textTransform: 'uppercase', fontWeight: 600 }}>& General Merchandise</p>
                                    </div>

                                    {/* Card Type Label */}
                                    <div style={{ background: '#F2D21E', color: '#000', padding: '8px 24px', borderRadius: '50px', fontSize: '0.85rem', fontWeight: 900, marginBottom: 30, textTransform: 'uppercase', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
                                        {qrCard.discount || 10}% DISCOUNT CARD
                                    </div>

                                    {/* QR Area */}
                                    <div style={{ padding: '18px', background: 'white', borderRadius: '24px', marginBottom: 30, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)', border: '4px solid rgba(242, 210, 30, 0.2)' }}>
                                        <QRCodeSVG
                                            value={qrCard.cardNumber}
                                            size={150}
                                            bgColor="#ffffff"
                                            fgColor="#0f172a"
                                            level="H"
                                        />
                                    </div>

                                    {/* Customer Name */}
                                    <div style={{ textAlign: 'center', width: '100%', marginBottom: 25 }}>
                                        <p style={{ color: '#94A3B8', fontSize: '0.75rem', margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700 }}>Valued Customer</p>
                                        <h3 style={{ color: 'white', margin: 0, fontSize: '1.6rem', fontWeight: 800, textTransform: 'uppercase' }}>{qrCard.customerName || 'VALUED CUSTOMER'}</h3>
                                    </div>

                                    {/* Card Details */}
                                    <div style={{ width: '100%', borderTop: '1.5px solid rgba(242, 210, 30, 0.3)', paddingTop: 25, display: 'flex', justifyContent: 'space-between' }}>
                                        <div>
                                            <p style={{ color: '#94A3B8', fontSize: '0.65rem', margin: '0 0 4px 0', textTransform: 'uppercase', fontWeight: 600 }}>Card ID</p>
                                            <p style={{ color: '#F2D21E', margin: 0, fontSize: '0.9rem', fontWeight: 800, fontFamily: 'monospace' }}>{qrCard.cardNumber}</p>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <p style={{ color: '#94A3B8', fontSize: '0.65rem', margin: '0 0 4px 0', textTransform: 'uppercase', fontWeight: 600 }}>Terms</p>
                                            <p style={{ color: 'white', margin: 0, fontSize: '0.85rem', fontWeight: 800 }}>ONE-TIME USE</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Note */}
                                <p style={{ position: 'absolute', bottom: 20, fontSize: '0.6rem', color: '#64748B', textAlign: 'center', width: '80%', fontStyle: 'italic' }}>
                                    "Your partner in building better homes."
                                </p>
                            </div>

                            {/* Modal Actions */}
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
                                <button className="btn btn-secondary" onClick={() => setQrCard(null)} style={{ color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>Close</button>
                                <button className="btn btn-primary" style={{ background: '#F2D21E', color: '#000', fontWeight: 800 }} onClick={() => {
                                    const el = document.getElementById('dc-card-printable')
                                    const win = window.open('', '', 'width=500,height=700')
                                    win.document.write('<html><head><title>Print Discount Card</title><style>body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background: #fff; }</style></head><body>')
                                    win.document.write(el.outerHTML)
                                    win.document.write('</body></html>')
                                    win.document.close()
                                    setTimeout(() => { win.print(); win.close() }, 500)
                                }}>🖨️ Print ID Card</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Edit Card Modal */}
            <AnimatePresence>
                {editCard && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.div className="modal" style={{ maxWidth: 400 }}
                            initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
                            <div className="modal-header">
                                <span className="modal-title">Edit Discount Card</span>
                                <button className="chat-icon-btn" onClick={() => setEditCard(null)}><X size={18} /></button>
                            </div>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Customer Name</label>
                                    <input type="text" className="form-input" value={editCard.customerName}
                                        onChange={e => setEditCard({ ...editCard, customerName: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Discount Percentage (%)</label>
                                    <input type="number" className="form-input" min={1} max={100} value={editCard.discount}
                                        onChange={e => setEditCard({ ...editCard, discount: e.target.value })} />
                                </div>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    Card ID: <strong style={{ fontFamily: 'monospace' }}>{editCard.cardNumber}</strong>
                                </p>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setEditCard(null)}>Cancel</button>
                                <button className="btn btn-primary" onClick={handleUpdate}>Update Card</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Confirm Revoke/Delete Modal */}
            <AnimatePresence>
                {deleteId && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.div className="modal" style={{ maxWidth: 380 }}
                            initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
                            <div className="modal-header">
                                <span className="modal-title">
                                    {deleteId.action === 'revoke' ? 'Revoke Card' : 'Delete Card'}
                                </span>
                                <button className="chat-icon-btn" onClick={() => setDeleteId(null)}><X size={18} /></button>
                            </div>
                            <div className="modal-body">
                                <p style={{ color: 'var(--text-secondary)' }}>
                                    {deleteId.action === 'revoke'
                                        ? `Revoke card for ${deleteId.card.customerName || deleteId.card.cardNumber}? It will no longer be accepted at POS.`
                                        : `Permanently delete card for ${deleteId.card.customerName || deleteId.card.cardNumber}? This cannot be undone.`
                                    }
                                </p>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
                                <button
                                    className="btn btn-danger"
                                    onClick={() => deleteId.action === 'revoke'
                                        ? handleRevoke(editCard?.id || deleteId.card.id)
                                        : handleDelete(editCard?.id || deleteId.card.id)
                                    }
                                >
                                    {deleteId.action === 'revoke' ? 'Revoke' : 'Delete'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
