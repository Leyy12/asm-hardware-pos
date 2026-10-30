// Reward Cards Management Page for ASM Hardware
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    collection, onSnapshot, addDoc, updateDoc, deleteDoc,
    doc, serverTimestamp, query, orderBy, getDoc
} from 'firebase/firestore'
import { db } from '../../firebase'
import Barcode from '../../components/common/Barcode'
import { Plus, Trash2, X, CreditCard, Barcode as BarcodeIcon, Copy, RefreshCw, Package, Archive, Printer, Download } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import Pagination from '../../components/common/Pagination'

const PAGE_SIZE = 10

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
    const { settings } = useAuth()
    const [cards, setCards] = useState([])
    const [qrCard, setQrCard] = useState(null)
    const [editCard, setEditCard] = useState(null)
    const [redeemCard, setRedeemCard] = useState(null)
    const [redeemAmount, setRedeemAmount] = useState(0)
    const [redeemNote, setRedeemNote] = useState('')
    const [deleteId, setDeleteId] = useState(null)
    const [generating, setGenerating] = useState(false)
    const [count, setCount] = useState(1)
    const [customerName, setCustomerName] = useState('')
    const [filterStatus, setFilterStatus] = useState('all')
    const [archiveId, setArchiveId] = useState(null)
    const [showArchived, setShowArchived] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)

    useEffect(() => {
        const unsub = onSnapshot(
            query(collection(db, 'rewardCards'), orderBy('createdAt', 'desc')),
            snap => setCards(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        )
        return unsub
    }, [])

    const [prevFilterStatus, setPrevFilterStatus] = useState(filterStatus)
    if (filterStatus !== prevFilterStatus) {
        setPrevFilterStatus(filterStatus)
        setCurrentPage(1)
    }

    const handleGenerate = async () => {
        if (!customerName && count === 1) return toast.error('Please enter a customer name for single card generation.')
        setGenerating(true)
        try {
            const batch = Array.from({ length: Number(count) }, (_, i) => ({
                cardNumber: generateCardNumber(),
                customerName: count === 1 ? customerName : `Customer ${i + 1}`,
                status: 'active',
                currentPoints: 0,
                pointsToday: 0,
                totalPointsEarned: 0,
                pointsRedeemed: 0,
                lastActivityAt: null,
                createdAt: serverTimestamp(),
                isArchived: false
            }))
            for (const card of batch) {
                await addDoc(collection(db, 'rewardCards'), card)
            }
            toast.success(`Generated ${count} reward card${count > 1 ? 's' : ''}!`)
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
            await updateDoc(doc(db, 'rewardCards', editCard.id), {
                customerName: editCard.customerName
            })
            toast.success('Card updated!')
            setEditCard(null)
        } catch (err) {
            toast.error('Failed to update card.')
        }
    }

    const handleRedeem = async () => {
        if (!redeemCard) return toast.error('Select a reward card to redeem points.')
        const redeemValue = Number(redeemAmount)
        if (!redeemValue || redeemValue <= 0) return toast.error('Enter a valid points amount to redeem.')
        if ((redeemCard.currentPoints || 0) < redeemValue) return toast.error('Not enough points available.')
        try {
            const redemptionRate = settings.pointsRedemptionValue || 0.20
            const pesoValue = redeemValue * redemptionRate
            await updateDoc(doc(db, 'rewardCards', redeemCard.id), {
                currentPoints: (redeemCard.currentPoints || 0) - redeemValue,
                pointsRedeemed: (redeemCard.pointsRedeemed || 0) + redeemValue,
                lastActivityAt: serverTimestamp()
            })
            toast.success(`Redeemed ${redeemValue} points (₱${pesoValue.toFixed(2)}) from ${redeemCard.customerName || 'card'}.`)
            setRedeemCard(null)
            setRedeemAmount(0)
            setRedeemNote('')
        } catch (err) {
            toast.error('Failed to redeem points.')
        }
    }

    const handleRevoke = async (id) => {
        if (!id) return
        await updateDoc(doc(db, 'rewardCards', id), { status: 'revoked' })
        toast.success('Card revoked.')
        setDeleteId(null)
    }

    const handleDelete = async (id) => {
        if (!id) return
        await deleteDoc(doc(db, 'rewardCards', id))
        toast.success('Card deleted.')
        setDeleteId(null)
    }

    const handleArchive = async () => {
        if (!archiveId) return
        try {
            await updateDoc(doc(db, 'rewardCards', archiveId.id), { isArchived: !archiveId.isArchived })
            toast.success(archiveId.isArchived ? 'Reward Card restored.' : 'Reward Card archived.')
            setArchiveId(null)
        } catch {
            toast.error('Failed to update archive status.')
        }
    }

    const copyCard = (num) => {
        navigator.clipboard.writeText(num)
        toast.success('Card number copied!')
    }

    const normalizeStatus = (status) => status === 'used' ? 'active' : status
    const filtered = (showArchived ? cards : cards.filter(c => !c.isArchived)).filter(c => filterStatus === 'all' || normalizeStatus(c.status) === filterStatus)
    const stats = {
        total: cards.filter(c => showArchived || !c.isArchived).length,
        active: cards.filter(c => (showArchived || !c.isArchived) && normalizeStatus(c.status) === 'active').length,
        revoked: cards.filter(c => (showArchived || !c.isArchived) && c.status === 'revoked').length,
        archived: cards.filter(c => c.isArchived).length,
        totalPoints: cards.filter(c => showArchived || !c.isArchived).reduce((sum, c) => sum + (c.currentPoints || 0), 0),
        redeemedPoints: cards.filter(c => showArchived || !c.isArchived).reduce((sum, c) => sum + (c.pointsRedeemed || 0), 0)
    }
    const recentActivity = [...cards]
        .filter(c => c.lastActivityAt)
        .sort((a, b) => b.lastActivityAt?.toMillis?.() - a.lastActivityAt?.toMillis?.())
        .slice(0, 4)
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
    const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Reward Cards</h1>
                    <p className="page-subtitle">Manage customer loyalty accounts, points balances, and reward redemptions.</p>
                </div>
            </div>

            {/* Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
                {[
                    { label: 'Total Accounts', value: stats.total, color: 'var(--text-primary)', bg: 'rgba(255,255,255,0.05)' },
                    { label: 'Active Rewards', value: stats.active, color: 'var(--success)', bg: 'var(--success-bg)' },
                    { label: 'Total Points', value: stats.totalPoints, color: 'var(--cyan)', bg: 'rgba(6, 182, 212, 0.08)' },
                    { label: 'Redeemed', value: stats.redeemedPoints, color: 'var(--warning)', bg: 'var(--warning-bg)' },
                ].map(({ label, value, color, bg }) => (
                    <div key={label} className="glass-card" style={{ padding: '18px 22px', background: bg }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
                        <p style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 900, color, margin: 0 }}>{value}</p>
                    </div>
                ))}
            </div>

            {/* Recent Rewards Activity */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
                <div className="glass-card" style={{ padding: 22, minHeight: 180 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div>
                            <p style={{ margin: 0, fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Recent Loyalty Activity</p>
                            <h3 style={{ margin: '8px 0 0', fontSize: '1.1rem', fontWeight: 700 }}>Latest Reward Card Updates</h3>
                        </div>
                        <span style={{ padding: '8px 12px', borderRadius: 9999, background: 'rgba(59,130,246,0.12)', color: '#3b82f6', fontWeight: 700, fontSize: '0.8rem' }}>
                            {recentActivity.length} updates
                        </span>
                    </div>
                    {recentActivity.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', margin: 0 }}>No reward activity captured yet. Create cards and redeem points to populate history.</p>
                    ) : (
                        <div style={{ display: 'grid', gap: 12 }}>
                            {recentActivity.map(card => (
                                <div key={card.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 16px', background: 'rgba(15, 23, 42, 0.9)', borderRadius: 16, border: '1px solid rgba(148,163,184,0.12)' }}>
                                    <div>
                                        <p style={{ margin: 0, fontWeight: 700, color: '#ffffff' }}>{card.customerName || 'Unnamed customer'}</p>
                                        <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{card.cardNumber}</p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ margin: 0, fontWeight: 700, color: '#22d3ee' }}>{card.currentPoints ?? 0} pts</p>
                                        <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{card.lastActivityAt?.toDate?.()?.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) || 'No activity'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="glass-card" style={{ padding: 22, minHeight: 180, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                        <p style={{ margin: 0, fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Rewards Progress</p>
                        <h3 style={{ margin: '10px 0 0', fontSize: '1.1rem', fontWeight: 700 }}>Points Loyalty Dashboard</h3>
                    </div>
                    <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
                        <div style={{ padding: '16px', borderRadius: 16, background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(148,163,184,0.12)' }}>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Average Points per Account</p>
                            <p style={{ margin: '8px 0 0', fontSize: '1.5rem', fontWeight: 800, color: '#7dd3fc' }}>{stats.total ? Math.round(stats.totalPoints / stats.total) : 0} pts</p>
                        </div>
                        <div style={{ padding: '16px', borderRadius: 16, background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(148,163,184,0.12)' }}>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Points Redeemed</p>
                            <p style={{ margin: '8px 0 0', fontSize: '1.5rem', fontWeight: 800, color: '#fde047' }}>{stats.redeemedPoints} pts</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Generate Panel */}
            <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CreditCard size={18} style={{ color: 'var(--accent-hover)' }} />
                    Create Reward Cards
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
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                    {['all', 'active', 'revoked'].map(s => (
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
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', color: 'var(--text-secondary)', cursor: 'pointer', marginLeft: 'auto' }}>
                    <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} style={{ width: 16, height: 16 }} />
                    Show Archived
                </label>
            </div>

            {/* Cards Table */}
            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th style={{ width: 50 }}>No.</th>
                            <th>Customer Name</th>
                            <th>Card Number</th>
                            <th>Points</th>
                            <th>Today</th>
                            <th>Status</th>
                            <th>Created</th>
                            <th style={{ width: 220, textAlign: 'right', paddingRight: 24 }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginated.length === 0 && (
                            <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
                                No cards found. Generate some above!
                            </td></tr>
                        )}
                        {paginated.map((card, index) => {
                            const rowIndex = (currentPage - 1) * PAGE_SIZE + index + 1
                            return (
                                <tr key={card.id} style={{ opacity: card.isArchived ? 0.6 : 1 }}>
                                    <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{rowIndex}</td>
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
                                <td><span style={{ fontWeight: 800, color: 'var(--cyan)' }}>{card.currentPoints ?? 0}</span></td>
                                <td><span style={{ fontWeight: 700, color: 'var(--accent)' }}>{card.pointsToday ?? 0}</span></td>
                                <td>
                                    <span className={`badge badge-${STATUS_COLORS[normalizeStatus(card.status)] || 'secondary'}`}>
                                        {normalizeStatus(card.status)}
                                    </span>
                                </td>
                                <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    {card.createdAt?.toDate?.()?.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) || '—'}
                                </td>
                                <td style={{ textAlign: 'right', padding: '16px 24px' }}>
                                    <div style={{ display: 'inline-flex', gap: 8 }}>
                                        <button onClick={() => setQrCard(card)} title="View & Print Barcode ID" style={{ 
                                            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                            background: 'linear-gradient(145deg, #1d4ed8 0%, #1e40af 100%)', border: '1px solid #3b82f6', color: '#ffffff', borderRadius: 6,
                                            boxShadow: '0 2px 8px rgba(29,78,216,0.3)', transition: 'transform 0.15s'
                                        }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                                            <BarcodeIcon size={15} />
                                        </button>
                                        
                                        <button onClick={() => setEditCard(card)} title="Edit Card Info" style={{ 
                                            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                            background: '#064e3b', border: '1px solid #65a30d', color: '#bef264', borderRadius: 6,
                                            boxShadow: '0 2px 8px rgba(6,78,59,0.3)', transition: 'transform 0.15s'
                                        }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                                            <RefreshCw size={15} />
                                        </button>
                                        
                                        {(card.currentPoints || 0) > 0 && card.status !== 'revoked' && !card.isArchived && (
                                            <button onClick={() => setRedeemCard(card)} title="Redeem Points" style={{
                                                height: 32, padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                                background: '#0f172a', border: '1px solid #22d3ee', color: '#22d3ee', borderRadius: 6,
                                                boxShadow: '0 2px 8px rgba(34, 211, 238, 0.2)', transition: 'transform 0.15s', fontWeight: 600, fontSize: '0.75rem'
                                            }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                                                Redeem
                                            </button>
                                        )}
                                        
                                        {card.status === 'active' && (
                                            <button onClick={() => setDeleteId({ action: 'revoke', card })} title="Revoke" style={{ 
                                                height: 32, padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                                background: '#78350f', border: '1px solid #d97706', color: '#fcd34d', borderRadius: 6,
                                                boxShadow: '0 2px 8px rgba(120,53,15,0.3)', transition: 'transform 0.15s', fontWeight: 600, fontSize: '0.75rem'
                                            }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                                                Revoke
                                            </button>
                                        )}
                                        
                                        <button onClick={() => {
                                            if (card.isArchived) {
                                                setArchiveId(card)
                                                setTimeout(() => document.getElementById('btn-confirm-archive')?.click(), 10)
                                            } else {
                                                setArchiveId(card)
                                            }
                                        }} title={card.isArchived ? "Restore" : "Archive"} style={{ 
                                            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                            background: '#1e293b', border: '1px solid #475569', color: '#cbd5e1', borderRadius: 6,
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)', transition: 'transform 0.15s'
                                        }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                                            {card.isArchived ? <RefreshCw size={15} /> : <Archive size={15} />}
                                        </button>
                                        
                                        <button onClick={() => setDeleteId({ action: 'delete', card })} title="Delete" style={{ 
                                            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                            background: '#7f1d1d', border: '1px solid #dc2626', color: '#fca5a5', borderRadius: 6,
                                            boxShadow: '0 2px 8px rgba(127,29,29,0.3)', transition: 'transform 0.15s'
                                        }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                            )
                        })}
                    </tbody>
                </table>
                <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />
            </div>

            {/* QR Code / ID Card Modal */}
            <AnimatePresence>
                {qrCard && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setQrCard(null)}>
                        <motion.div className="modal" style={{ maxWidth: 600, width: '100%', padding: 0, background: 'transparent', boxShadow: 'none', border: 'none' }}
                            initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }}
                            onClick={e => e.stopPropagation()}>
                            
                            {/* The Premium ID Card Design */}
                            <div id="dc-card-printable" style={{ 
                                width: '540px', 
                                height: '320px', 
                                background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)', 
                                borderRadius: '24px', 
                                padding: '30px', 
                                display: 'flex', 
                                flexDirection: 'row', 
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                position: 'relative',
                                overflow: 'hidden',
                                margin: '0 auto',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
                            }}>
                                {/* Silver Line Art Geometry Overlay */}
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.2, backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 20px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 20px)', zIndex: 0 }} />
                                
                                {/* LEFT SIDE: Info */}
                                <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', flex: 1, paddingRight: '20px' }}>
                                    
                                    {/* Logo & Title */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ background: '#ffffff', width: 40, height: 40, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(255, 255, 255, 0.1)' }}>
                                            <Package size={24} color="#1e3a8a" />
                                        </div>
                                        <div>
                                            <h2 style={{ color: '#ffffff', margin: 0, fontSize: '1.4rem', fontWeight: 800, letterSpacing: '1px', fontFamily: 'sans-serif' }}>ASM HARDWARE</h2>
                                            <p style={{ color: '#cbd5e1', margin: 0, fontSize: '0.65rem', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 600 }}>& General Merchandise</p>
                                        </div>
                                    </div>

                                    {/* Reward Badge */}
                                    <div style={{ marginTop: '16px' }}>
                                        <span style={{ background: '#cbd5e1', color: '#0f172a', padding: '6px 16px', borderRadius: '50px', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', boxShadow: '0 4px 10px rgba(0,0,0,0.2)', display: 'inline-block' }}>
                                            REWARD CARD
                                        </span>
                                    </div>

                                    {/* Customer & Details */}
                                    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <div>
                                            <p style={{ color: '#94a3b8', fontSize: '0.65rem', margin: '0 0 2px 0', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Valued Customer</p>
                                            <h3 style={{ color: '#ffffff', margin: 0, fontSize: '1.2rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>{qrCard.customerName || 'VALUED CUSTOMER'}</h3>
                                        </div>
                                        
                                        <div style={{ display: 'flex', gap: '30px' }}>
                                            <div>
                                                <p style={{ color: '#94a3b8', fontSize: '0.6rem', margin: '0 0 2px 0', textTransform: 'uppercase', fontWeight: 600 }}>Card ID</p>
                                                <p style={{ color: '#e2e8f0', margin: 0, fontSize: '0.8rem', fontWeight: 600, fontFamily: 'monospace' }}>{qrCard.cardNumber}</p>
                                            </div>
                                            <div>
                                                <p style={{ color: '#94a3b8', fontSize: '0.6rem', margin: '0 0 2px 0', textTransform: 'uppercase', fontWeight: 600 }}>Status</p>
                                                <p style={{ color: '#e2e8f0', margin: 0, fontSize: '0.8rem', fontWeight: 600 }}>Loyalty Active</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* RIGHT SIDE: Barcode */}
                                <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: '190px' }}>
                                    <div style={{ padding: '12px 14px', background: '#ffffff', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: '90px' }}>
                                        <Barcode
                                            value={qrCard.cardNumber}
                                            options={{
                                                width: 1.5,
                                                height: 50,
                                                margin: 4
                                            }}
                                        />
                                    </div>
                                    <p style={{ color: '#94a3b8', margin: '12px 0 0 0', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Scan at POS</p>
                                </div>
                            </div>

                            {/* Modal Actions */}
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
                                <button className="btn btn-secondary" style={{ 
                                    background: 'rgba(255,255,255,0.1)', 
                                    color: '#ffffff', 
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    borderRadius: '8px',
                                    padding: '10px 16px'
                                }} onClick={() => {
                                    const el = document.getElementById('dc-card-printable')
                                    const win = window.open('', '', 'width=600,height=400')
                                    win.document.write('<html><head><title>Print Reward Card</title><style>@media print { * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; } } body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background: #fff; }</style></head><body>')
                                    win.document.write(el.outerHTML)
                                    win.document.write('</body></html>')
                                    win.document.close()
                                    setTimeout(() => { win.print(); win.close() }, 500)
                                }}>
                                    <Printer size={16} /> Print Card
                                </button>
                                <button className="btn btn-primary" style={{ 
                                    background: 'linear-gradient(135deg, #4f46e5 0%, #0ea5e9 100%)',
                                    border: 'none',
                                    color: '#ffffff',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    borderRadius: '8px',
                                    padding: '10px 16px',
                                    boxShadow: '0 4px 12px rgba(14, 165, 233, 0.4)'
                                }} onClick={() => {
                                    toast.success('Downloading card design...')
                                    setTimeout(() => {
                                        const svgEl = document.querySelector('#dc-card-printable svg')
                                        if (!svgEl) return toast.error('Could not generate card image.')
                                        const canvas = document.createElement('canvas')
                                        canvas.width = 540; canvas.height = 320
                                        const ctx = canvas.getContext('2d')

                                        // 1. Draw gradient background
                                        const grad = ctx.createLinearGradient(0, 0, 540, 320)
                                        grad.addColorStop(0, '#1e3a8a')
                                        grad.addColorStop(1, '#0f172a')
                                        ctx.fillStyle = grad
                                        ctx.fillRect(0, 0, 540, 320)

                                        // 2. Draw silver geometric lines pattern (simulated)
                                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)'
                                        ctx.lineWidth = 1
                                        for (let i = -320; i < 540; i += 25) {
                                            ctx.beginPath()
                                            ctx.moveTo(i, 0)
                                            ctx.lineTo(i + 320, 320)
                                            ctx.stroke()
                                            
                                            ctx.beginPath()
                                            ctx.moveTo(i + 320, 0)
                                            ctx.lineTo(i, 320)
                                            ctx.stroke()
                                        }

                                        // 3. Draw Store Logo and Name
                                        ctx.fillStyle = '#ffffff'
                                        ctx.beginPath()
                                        ctx.roundRect ? ctx.roundRect(30, 30, 40, 40, 8) : ctx.rect(30, 30, 40, 40)
                                        ctx.fill()

                                        // Draw package icon inside box
                                        ctx.fillStyle = '#1e3a8a'
                                        ctx.fillRect(45, 42, 10, 16)
                                        ctx.fillRect(41, 46, 18, 12)

                                        ctx.fillStyle = '#ffffff'
                                        ctx.font = 'bold 18px sans-serif'
                                        ctx.textAlign = 'left'
                                        ctx.fillText('ASM HARDWARE', 82, 48)

                                        ctx.font = 'bold 8px sans-serif'
                                        ctx.fillStyle = '#cbd5e1'
                                        ctx.fillText('& GENERAL MERCHANDISE', 82, 60)

                                        // 4. Draw REWARD CARD Badge
                                        ctx.fillStyle = '#cbd5e1'
                                        ctx.beginPath()
                                        ctx.roundRect ? ctx.roundRect(30, 95, 110, 26, 13) : ctx.rect(30, 95, 110, 26)
                                        ctx.fill()
                                        ctx.fillStyle = '#0f172a'
                                        ctx.font = 'bold 10px sans-serif'
                                        ctx.textAlign = 'center'
                                        ctx.fillText('REWARD CARD', 85, 111)

                                        // 5. Draw Valued Customer and Name
                                        ctx.fillStyle = '#94a3b8'
                                        ctx.font = 'bold 8px sans-serif'
                                        ctx.textAlign = 'left'
                                        ctx.fillText('VALUED CUSTOMER', 30, 205)

                                        ctx.fillStyle = '#ffffff'
                                        ctx.font = 'bold 16px sans-serif'
                                        ctx.fillText((qrCard.customerName || 'VALUED CUSTOMER').toUpperCase(), 30, 228)

                                        // 6. Draw Card Details
                                        ctx.fillStyle = '#94a3b8'
                                        ctx.font = 'bold 8px sans-serif'
                                        ctx.fillText('CARD ID', 30, 265)
                                        ctx.fillStyle = '#e2e8f0'
                                        ctx.font = 'bold 11px monospace'
                                        ctx.fillText(qrCard.cardNumber, 30, 282)

                                        ctx.fillStyle = '#94a3b8'
                                        ctx.font = 'bold 8px sans-serif'
                                        ctx.fillText('STATUS', 180, 265)
                                        ctx.fillStyle = '#e2e8f0'
                                        ctx.font = 'bold 11px sans-serif'
                                        ctx.fillText('LOYALTY ACTIVE', 180, 282)

                                        // 7. Draw Barcode SVG Image on Right Side
                                        const svgStr = new XMLSerializer().serializeToString(svgEl)
                                        const img = new Image()
                                        img.onload = () => {
                                            ctx.fillStyle = '#ffffff'
                                            ctx.beginPath()
                                            ctx.roundRect ? ctx.roundRect(325, 95, 185, 90, 16) : ctx.rect(325, 95, 185, 90)
                                            ctx.fill()
                                            
                                            ctx.drawImage(img, 335, 100, 165, 55)

                                            // Draw card number in large bold monospace below barcode
                                            ctx.fillStyle = '#000000'
                                            ctx.font = 'bold 11px "Courier New", monospace'
                                            ctx.textAlign = 'center'
                                            ctx.fillText(qrCard.cardNumber, 417, 172)

                                            ctx.fillStyle = '#94a3b8'
                                            ctx.font = 'bold 7px sans-serif'
                                            ctx.fillText('SCAN AT POS', 417, 188)
                                            
                                            const a = document.createElement('a')
                                            a.download = `reward-card-${qrCard.cardNumber}.png`
                                            a.href = canvas.toDataURL('image/png')
                                            a.click()
                                        }
                                        img.src = 'data:image/svg+xml;base64,' + btoa(svgStr)
                                    }, 500)
                                }}>
                                    <Download size={16} /> Download PNG
                                </button>
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
                                <span className="modal-title">Edit Reward Card</span>
                                <button className="chat-icon-btn" onClick={() => setEditCard(null)}><X size={18} /></button>
                            </div>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Customer Name</label>
                                    <input type="text" className="form-input" value={editCard.customerName}
                                        onChange={e => setEditCard({ ...editCard, customerName: e.target.value })} />
                                </div>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 12 }}>
                                    Card ID: <strong style={{ fontFamily: 'monospace' }}>{editCard.cardNumber}</strong>
                                </p>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>
                                    Current Points: <strong style={{ color: 'var(--cyan)' }}>{editCard.currentPoints ?? 0}</strong>
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

            {/* Redeem Points Modal */}
            <AnimatePresence>
                {redeemCard && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.div className="modal" style={{ maxWidth: 450 }}
                            initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
                            <div className="modal-header">
                                <span className="modal-title">Redeem Reward Points</span>
                                <button className="chat-icon-btn" onClick={() => { setRedeemCard(null); setRedeemAmount(0); setRedeemNote('') }}><X size={18} /></button>
                            </div>
                            <div className="modal-body">
                                <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>{redeemCard.customerName}</p>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: 16 }}>{redeemCard.cardNumber}</p>
                                
                                <div style={{ padding: '16px 20px', background: 'rgba(34,211,238,0.08)', borderRadius: 12, border: '1px solid rgba(34,211,238,0.2)', marginBottom: 20 }}>
                                    <p style={{ margin: '0 0 6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Available Points</p>
                                    <p style={{ margin: 0, fontSize: '2.2rem', fontWeight: 900, color: '#22d3ee', fontFamily: 'var(--font-display)' }}>{redeemCard.currentPoints ?? 0}</p>
                                </div>

                                <div className="form-group" style={{ marginBottom: 16 }}>
                                    <label className="form-label">Points to Redeem</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        min="1"
                                        max={redeemCard.currentPoints || 0}
                                        value={redeemAmount}
                                        onChange={e => setRedeemAmount(e.target.value)}
                                        placeholder="Enter amount"
                                    />
                                    <small style={{ display: 'block', marginTop: 8, color: 'var(--text-muted)' }}>You can redeem up to {redeemCard.currentPoints ?? 0} points</small>
                                    {redeemAmount > 0 && (
                                        <small style={{ display: 'block', marginTop: 6, color: '#22d3ee', fontWeight: 600 }}>
                                            {redeemAmount} pts = ₱{(redeemAmount * (settings.pointsRedemptionValue || 0.20)).toFixed(2)}
                                        </small>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Redemption Notes (Optional)</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={redeemNote}
                                        onChange={e => setRedeemNote(e.target.value)}
                                        placeholder="e.g. Redeemed for discount, free item, etc."
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => { setRedeemCard(null); setRedeemAmount(0); setRedeemNote('') }}>Cancel</button>
                                <button 
                                    className="btn btn-primary" 
                                    onClick={handleRedeem}
                                    style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)' }}
                                >
                                    Redeem {redeemAmount || 0} Points {redeemAmount > 0 && `(₱${(redeemAmount * (settings.pointsRedemptionValue || 0.20)).toFixed(2)})`}
                                </button>
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

            {/* Archive confirm */}
            <AnimatePresence>
                {archiveId && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.div className="modal" style={{ maxWidth: 400 }} initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
                            <div className="modal-header">
                                <span className="modal-title">{archiveId.isArchived ? 'Restore Reward Card' : 'Archive Reward Card'}</span>
                                <button className="chat-icon-btn" onClick={() => setArchiveId(null)}><X size={18} /></button>
                            </div>
                            <div className="modal-body">
                                <p style={{ color: 'var(--text-secondary)' }}>
                                    {archiveId.isArchived 
                                        ? "Are you sure you want to restore this reward card?" 
                                        : "Are you sure you want to archive this reward card?"}
                                </p>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setArchiveId(null)}>Cancel</button>
                                <button id="btn-confirm-archive" className="btn btn-warning" onClick={handleArchive}>
                                    {archiveId.isArchived ? 'Yes, Restore' : 'Yes, Archive'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
