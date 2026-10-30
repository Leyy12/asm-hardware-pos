import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    collection, onSnapshot, doc, runTransaction,
    serverTimestamp, query, where, orderBy
} from 'firebase/firestore'
import { db, auth } from '../../firebase'
import { formatCurrency, formatDateTime, generateExchangeReference } from '../../utils/helpers'
import { Search, RotateCcw, Check, X, History, Eye } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
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

export default function CashierRefund() {
    const [activeTab, setActiveTab] = useState('process')
    const [saleIdInput, setSaleIdInput] = useState('')
    const [foundSale, setFoundSale] = useState(null)
    const [selectedItems, setSelectedItems] = useState([])
    const [reason, setReason] = useState('')
    const [processing, setProcessing] = useState(false)
    const [sales, setSales] = useState([])
    const [products, setProducts] = useState([])
    const [replacementItems, setReplacementItems] = useState([])
    const [replacementQty, setReplacementQty] = useState(1)
    const [returnedCondition, setReturnedCondition] = useState('reusable')
    const [exchangeReference, setExchangeReference] = useState(generateExchangeReference())
    const [confirmationOpen, setConfirmationOpen] = useState(false)
    const [customerName, setCustomerName] = useState('')
    
    // History states
    const [exchanges, setExchanges] = useState([])
    const [historySearch, setHistorySearch] = useState('')
    const [selectedHistory, setSelectedHistory] = useState(null)
    const [currentHistoryPage, setCurrentHistoryPage] = useState(1)
    
    const { userProfile } = useAuth()

    // Load completed sales
    useEffect(() => {
        const unsub = onSnapshot(
            query(collection(db, 'sales'), where('status', '==', 'completed')),
            snap => setSales(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        )
        return unsub
    }, [])

    // Load products for replacement selection
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'products'), snap => setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
        return unsub
    }, [])

    // Load history of approved exchanges for current cashier
    useEffect(() => {
        const unsub = onSnapshot(
            query(collection(db, 'refundExchangeRecords'), orderBy('createdAt', 'desc')),
            snap => {
                const records = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                setExchanges(records.filter(e => e.cashierId === auth.currentUser?.uid))
            }
        )
        return unsub
    }, [])

    const handleSearch = () => {
        const id = saleIdInput.trim().toLowerCase()
        if (!id) return toast.error('Enter a Transaction ID.')
        const sale = sales.find(s => s.transactionId?.toLowerCase() === id)
        if (!sale) return toast.error('Transaction not found.')
        setFoundSale(sale)
        setSelectedItems([])
        setCustomerName(sale.rewardCardCustomer || '')
    }

    const toggleItem = (item) => {
        setSelectedItems(prev =>
            prev.find(i => i.productId === item.productId)
                ? prev.filter(i => i.productId !== item.productId)
                : [...prev, { ...item, refundAmount: item.subtotal }]
        )
    }

    const handleApproveExchange = async () => {
        if (!customerName.trim()) return toast.error('Please enter the customer name.')
        if (selectedItems.length === 0) return toast.error('Select at least one item to refund.')
        if (replacementItems.length === 0) return toast.error('Select at least one replacement item.')
        if (!reason.trim()) return toast.error('Please provide a reason for the exchange.')
        setConfirmationOpen(true)
    }

    const confirmApproveExchange = async () => {
        setProcessing(true)
        try {
            const totalRefund = selectedItems.reduce((s, i) => s + i.refundAmount, 0)
            const replacementValue = replacementItems.reduce((sum, item) => {
                const product = products.find(p => p.id === item.productId)
                return sum + ((product?.price || 0) * (item.qty || 0))
            }, 0)
            const difference = replacementValue - totalRefund
            
            await runTransaction(db, async (tx) => {
                // Deduct replacement items from stock
                for (const r of replacementItems) {
                    const pRef = doc(db, 'products', r.productId)
                    const pSnap = await tx.get(pRef)
                    if (!pSnap.exists()) throw new Error(`Product not found: ${r.name}`)
                    const current = pSnap.data().stock || 0
                    if (current < (r.qty || 0)) throw new Error(`Insufficient stock for ${r.name}`)
                    tx.update(pRef, { stock: current - (r.qty || 0), updatedAt: serverTimestamp() })
                }
                
                // Restore returned items (if reusable)
                if (returnedCondition === 'reusable') {
                    for (const item of selectedItems) {
                        const pRef = doc(db, 'products', item.productId)
                        const pSnap = await tx.get(pRef)
                        if (pSnap.exists()) {
                            tx.update(pRef, { stock: (pSnap.data().stock || 0) + (item.qty || 0), updatedAt: serverTimestamp() })
                        }
                    }
                }
                
                // Record exchange transaction
                const exchangeDoc = doc(collection(db, 'refundExchangeRecords'))
                tx.set(exchangeDoc, {
                    exchangeId: exchangeDoc.id,
                    exchangeReference,
                    originalSaleId: foundSale.transactionId,
                    originalSaleDocId: foundSale.id,
                    customerName: customerName.trim(),
                    cashierId: auth.currentUser?.uid,
                    cashierName: userProfile?.name || 'Cashier',
                    reason: reason.trim(),
                    returnedItems: selectedItems.map(i => ({
                        productId: i.productId,
                        name: i.name,
                        qty: i.qty,
                        amount: i.refundAmount
                    })),
                    replacementItems: replacementItems.map(r => {
                        const prod = products.find(p => p.id === r.productId)
                        return { productId: r.productId, name: r.name, qty: r.qty, price: prod?.price || 0 }
                    }),
                    totalRefund,
                    replacementValue,
                    additionalPayment: difference > 0 ? difference : 0,
                    exchangeCredit: difference < 0 ? Math.abs(difference) : 0,
                    returnedCondition,
                    status: 'Exchange Approved',
                    notes: `Replacement completed by ${userProfile?.name || 'Cashier'}`,
                    createdAt: serverTimestamp()
                })
            })
            
            toast.success('Exchange approved and recorded!')
            setConfirmationOpen(false)
            setFoundSale(null)
            setSaleIdInput('')
            setSelectedItems([])
            setReason('')
            setReplacementItems([])
            setReplacementQty(1)
            setReturnedCondition('reusable')
            setExchangeReference(generateExchangeReference())
            setCustomerName('')
        } catch (err) {
            toast.error(err.message || 'Failed to approve exchange.')
        } finally {
            setProcessing(false)
        }
    }

    const totalRefund = selectedItems.reduce((s, i) => s + i.refundAmount, 0)
    const replacementValue = replacementItems.reduce((sum, item) => {
        const product = products.find(p => p.id === item.productId)
        return sum + ((product?.price || 0) * (item.qty || 0))
    }, 0)
    const exchangeDifference = replacementValue - totalRefund
    const additionalPayment = exchangeDifference > 0 ? exchangeDifference : 0
    const exchangeCredit = exchangeDifference < 0 ? Math.abs(exchangeDifference) : 0
    const availableReplacementProducts = products.filter(p => p.stock > 0)

    // History calculations
    const [prevHistorySearch, setPrevHistorySearch] = useState(historySearch)
    if (historySearch !== prevHistorySearch) {
        setPrevHistorySearch(historySearch)
        setCurrentHistoryPage(1)
    }

    const filteredHistory = exchanges.filter(e =>
        e.exchangeReference?.toLowerCase().includes(historySearch.toLowerCase()) ||
        e.originalSaleId?.toLowerCase().includes(historySearch.toLowerCase()) ||
        e.customerName?.toLowerCase().includes(historySearch.toLowerCase())
    )

    const totalHistoryPages = Math.ceil(filteredHistory.length / PAGE_SIZE)
    const paginatedHistory = filteredHistory.slice((currentHistoryPage - 1) * PAGE_SIZE, currentHistoryPage * PAGE_SIZE)

    return (
        <div>
            <div className="page-header" style={{ marginBottom: 20 }}>
                <div>
                    <h1 className="page-title">{activeTab === 'process' ? 'Process Exchange' : 'Exchange History'}</h1>
                    <p className="page-subtitle">
                        {activeTab === 'process'
                            ? 'Approve exchanges directly. Inventory updates automatically.'
                            : 'Browse and view your past approved exchange transactions.'}
                    </p>
                </div>
            </div>

            {/* Tab Switcher */}
            <div style={{ display: 'flex', gap: 6, padding: 4, background: 'var(--bg-sidebar)', borderRadius: 10, width: 'fit-content', marginBottom: 20 }}>
                <button
                    onClick={() => setActiveTab('process')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 16px',
                        borderRadius: 8,
                        border: 'none',
                        background: activeTab === 'process' ? 'var(--bg-elevated)' : 'transparent',
                        color: activeTab === 'process' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: activeTab === 'process' ? 'var(--shadow)' : 'none',
                        transition: 'all 0.2s'
                    }}
                >
                    <RotateCcw size={15} />
                    Process Exchange
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 16px',
                        borderRadius: 8,
                        border: 'none',
                        background: activeTab === 'history' ? 'var(--bg-elevated)' : 'transparent',
                        color: activeTab === 'history' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: activeTab === 'history' ? 'var(--shadow)' : 'none',
                        transition: 'all 0.2s'
                    }}
                >
                    <History size={15} />
                    Exchange History
                </button>
            </div>

            {activeTab === 'process' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, alignItems: 'start' }}>

                    {/* ── LEFT PANEL: Search + Items ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                        {/* Search */}
                        <div className="glass-card" style={{ padding: 20 }}>
                            <label className="form-label" style={{ fontSize: '0.7rem', letterSpacing: '0.07em' }}>TRANSACTION ID</label>
                            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                                <input
                                    id="refund-search-input"
                                    className="form-input"
                                    placeholder="e.g. ASM-260517-0001"
                                    value={saleIdInput}
                                    onChange={e => setSaleIdInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                    style={{ flex: 1 }}
                                />
                                <button id="refund-search-btn" className="btn btn-primary" onClick={handleSearch} style={{ gap: 6, whiteSpace: 'nowrap' }}>
                                    <Search size={14} /> Search
                                </button>
                            </div>
                        </div>

                        {/* Found Sale */}
                        <AnimatePresence>
                            {foundSale ? (
                                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                                    <div className="glass-card" style={{ padding: 20 }}>
                                        {/* Sale Header */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                            <div>
                                                <p style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--accent-hover)', fontSize: '1rem', margin: 0 }}>
                                                    {foundSale.transactionId}
                                                </p>
                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, marginBottom: 0 }}>
                                                    By {foundSale.cashierName} · {formatDateTime(foundSale.createdAt)}
                                                </p>
                                            </div>
                                            <span className="badge badge-info">Select items to return</span>
                                        </div>

                                        <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 10 }}>
                                            Sale Items — click to select for return
                                        </p>

                                        {/* Items */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {foundSale.items?.map((item, i) => {
                                                const checked = !!selectedItems.find(s => s.productId === item.productId)
                                                return (
                                                    <div key={i} onClick={() => toggleItem(item)} style={{
                                                        display: 'flex', alignItems: 'center', gap: 12,
                                                        padding: '12px 16px', borderRadius: 10,
                                                        background: checked ? 'rgba(239,68,68,0.08)' : 'var(--bg-elevated)',
                                                        border: `1px solid ${checked ? 'rgba(239,68,68,0.35)' : 'var(--border)'}`,
                                                        cursor: 'pointer', transition: 'all 0.15s'
                                                    }}>
                                                        <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${checked ? 'var(--danger)' : 'var(--text-muted)'}`, background: checked ? 'var(--danger)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                            {checked && <Check size={12} color="white" />}
                                                        </div>
                                                        <span style={{ flex: 1, fontWeight: 600, fontSize: '0.88rem' }}>{item.name}</span>
                                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>×{item.qty}</span>
                                                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: checked ? 'var(--danger)' : 'var(--success)', minWidth: 80, textAlign: 'right' }}>{formatCurrency(item.subtotal)}</span>
                                                    </div>
                                                )
                                            })}
                                        </div>

                                        {selectedItems.length > 0 && (
                                            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{selectedItems.length} item(s) selected for return</span>
                                                <span style={{ fontWeight: 800, color: 'var(--danger)' }}>{formatCurrency(totalRefund)}</span>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                    <div className="glass-card" style={{ padding: 40, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, minHeight: 220, justifyContent: 'center' }}>
                                        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                                            <RotateCcw size={24} color="var(--text-muted)" />
                                        </div>
                                        <p style={{ fontWeight: 700, color: 'var(--text-secondary)', margin: 0 }}>No Transaction Found</p>
                                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, maxWidth: 300 }}>Enter a Transaction ID above and click Search to load the sale items for exchange processing.</p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* ── RIGHT PANEL: Replacement + Details + Approve ── */}
                    <div style={{
                        background: 'var(--bg-glass)',
                        backdropFilter: 'blur(16px)',
                        border: '1px solid var(--border)',
                        borderRadius: 18,
                        padding: 22,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 18,
                        position: 'sticky',
                        top: 0,
                    }}>
                        <div>
                            <p style={{ margin: 0, fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Exchange Details</p>
                            <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Fill in the replacement and reason</p>
                        </div>

                        {/* Customer Name Input */}
                        <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Customer Name *</label>
                            <input
                                className="form-input"
                                value={customerName}
                                onChange={e => setCustomerName(e.target.value)}
                                placeholder="e.g. Juan Dela Cruz"
                                style={!customerName.trim() ? { borderColor: 'rgba(239,68,68,0.4)' } : {}}
                            />
                            {!customerName.trim() && (
                                <p style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: 4 }}>Required — enter the name of the customer requesting the exchange.</p>
                            )}
                        </div>

                        {/* Replacement Items */}
                        <div>
                            <label className="form-label">Replacement Items *</label>
                            <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                                <select id="cashier-replacement-select" className="form-select" style={{ flex: 1 }}>
                                    <option value="">Select product</option>
                                    {availableReplacementProducts.map(p => <option key={p.id} value={p.id} data-name={p.name} data-stock={p.stock}>{p.name} · {p.stock} in stock</option>)}
                                </select>
                                <input id="cashier-replacement-qty" className="form-input" type="number" min="1" value={replacementQty} onChange={e => setReplacementQty(Number(e.target.value || 1))} placeholder="Qty" style={{ width: 70 }} />
                                <button className="btn btn-primary" style={{ whiteSpace: 'nowrap' }} onClick={() => {
                                    const sel = document.getElementById('cashier-replacement-select')
                                    const pid = sel.value
                                    const qty = Number(replacementQty || 0)
                                    if (!pid || qty <= 0) return toast.error('Select product and valid qty')
                                    const prod = products.find(p => p.id === pid)
                                    if (!prod) return toast.error('Product not found')
                                    if (prod.stock < qty) return toast.error('Selected replacement is out of stock for this qty')
                                    setReplacementItems(prev => {
                                        const existing = prev.find(r => r.productId === pid)
                                        if (existing) return prev.map(r => r.productId === pid ? { ...r, qty: r.qty + qty } : r)
                                        return [...prev, { productId: pid, name: prod.name, qty }]
                                    })
                                    setReplacementQty(1)
                                    sel.value = ''
                                }}>Add</button>
                            </div>

                            {replacementItems.length > 0 ? (
                                <div style={{ marginTop: 10, background: 'var(--bg-sidebar)', padding: '8px 12px', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {replacementItems.map((r, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{r.name}</span>
                                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>×{r.qty}</span>
                                                <button className="btn btn-secondary btn-sm" onClick={() => setReplacementItems(prev => prev.filter(x => x.productId !== r.productId))}>✕</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 8 }}>Select a replacement product. Out-of-stock items are hidden.</p>
                            )}
                        </div>

                        {/* Condition + Reference */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label">Returned Condition</label>
                                <select className="form-select" value={returnedCondition} onChange={e => setReturnedCondition(e.target.value)}>
                                    <option value="reusable">Reusable / Restock</option>
                                    <option value="defective">Defective / Damaged</option>
                                </select>
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label">Exchange Reference</label>
                                <input className="form-input" value={exchangeReference} disabled style={{ fontFamily: 'monospace', fontSize: '0.8rem' }} />
                            </div>
                        </div>

                        {/* Value Summary */}
                        <div style={{ background: 'var(--bg-sidebar)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Returned Value</span>
                                <span style={{ fontWeight: 800, color: 'var(--danger)' }}>{formatCurrency(totalRefund)}</span>
                            </div>
                            <div style={{ height: 1, background: 'var(--border)' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Replacement Value</span>
                                <span style={{ fontWeight: 800, color: 'var(--success)' }}>{formatCurrency(replacementValue)}</span>
                            </div>
                            {exchangeDifference !== 0 && (
                                <>
                                    <div style={{ height: 1, background: 'var(--border)' }} />
                                    <div style={{
                                        padding: '8px 12px', borderRadius: 8,
                                        background: exchangeDifference > 0 ? 'rgba(220,38,38,0.08)' : 'rgba(16,185,129,0.08)',
                                        border: `1px solid ${exchangeDifference > 0 ? 'rgba(220,38,38,0.2)' : 'rgba(16,185,129,0.2)'}`
                                    }}>
                                        <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: exchangeDifference > 0 ? 'var(--danger)' : 'var(--success)' }}>
                                            {exchangeDifference > 0 ? `⚠ Additional payment: ${formatCurrency(additionalPayment)}` : `✓ Exchange credit: ${formatCurrency(exchangeCredit)}`}
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Reason */}
                        <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Reason for Exchange *</label>
                            <textarea className="form-textarea" rows={3}
                                placeholder="e.g. Defective item, wrong product ordered…"
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                style={{ resize: 'none' }} />
                        </div>

                        {/* Approve Button */}
                        <button
                            id="submit-refund-btn"
                            className="btn btn-danger"
                            onClick={handleApproveExchange}
                            disabled={processing || selectedItems.length === 0 || replacementItems.length === 0 || !reason.trim()}
                            style={{ width: '100%', padding: '13px', fontWeight: 800, fontSize: '0.95rem', gap: 8, justifyContent: 'center', borderRadius: 12 }}
                        >
                            <RotateCcw size={16} />
                            {processing ? 'Approving…' : 'Approve Exchange'}
                        </button>

                        {(selectedItems.length === 0 || replacementItems.length === 0 || !reason.trim()) && (
                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                                {selectedItems.length === 0 ? '① Search & select items to return' : replacementItems.length === 0 ? '② Add replacement items' : '③ Enter a reason to proceed'}
                            </p>
                        )}
                    </div>
                </div>
            ) : (
                <div>
                    {/* History Search */}
                    <div className="search-bar" style={{ marginBottom: 20, maxWidth: 400 }}>
                        <Search size={15} className="search-icon" />
                        <input
                            id="history-search"
                            className="form-input"
                            placeholder="Search by Reference or Sale ID…"
                            value={historySearch}
                            onChange={e => setHistorySearch(e.target.value)}
                        />
                    </div>

                    {/* History Table */}
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th style={{ width: 44 }}>No.</th>
                                    <th style={{ whiteSpace: 'nowrap' }}>Exchange Ref</th>
                                    <th style={{ whiteSpace: 'nowrap' }}>Original Sale</th>
                                    <th style={{ whiteSpace: 'nowrap' }}>Customer</th>
                                    <th>Reason</th>
                                    <th style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>Total Value</th>
                                    <th style={{ whiteSpace: 'nowrap' }}>Date & Time</th>
                                    <th style={{ textAlign: 'center', width: 120 }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedHistory.length === 0 && (
                                    <tr>
                                        <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
                                            No exchange history found.
                                        </td>
                                    </tr>
                                )}
                                {paginatedHistory.map((e, index) => {
                                    const rowIndex = (currentHistoryPage - 1) * PAGE_SIZE + index + 1
                                    return (
                                        <tr key={e.id}>
                                            <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{rowIndex}</td>
                                            <td style={{ fontFamily: 'monospace', color: 'var(--accent-hover)', fontWeight: 700, whiteSpace: 'nowrap' }}>{e.exchangeReference}</td>
                                            <td style={{ fontFamily: 'monospace', color: 'var(--accent-hover)', fontWeight: 700, whiteSpace: 'nowrap' }}>{e.originalSaleId}</td>
                                            <td style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{e.customerName || getExampleName(e.id)}</td>
                                            <td style={{ color: 'var(--text-secondary)' }}>
                                                <div style={{ maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {e.reason || '—'}
                                                </div>
                                            </td>
                                            <td style={{ fontWeight: 700, color: 'var(--success)', whiteSpace: 'nowrap', textAlign: 'right' }}>{formatCurrency(e.replacementValue)}</td>
                                            <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>{formatDateTime(e.createdAt)}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <button
                                                    className="btn btn-sm"
                                                    onClick={() => setSelectedHistory(e)}
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
                        <Pagination
                            currentPage={currentHistoryPage}
                            totalPages={totalHistoryPages}
                            totalItems={filteredHistory.length}
                            pageSize={PAGE_SIZE}
                            onPageChange={setCurrentHistoryPage}
                        />
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            <AnimatePresence>
                {confirmationOpen && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.div className="modal" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
                            <div className="modal-header">
                                <span className="modal-title">Confirm Exchange Approval</span>
                                <button className="chat-icon-btn" onClick={() => setConfirmationOpen(false)} disabled={processing}><X size={18} /></button>
                            </div>
                            <div className="modal-body">
                                <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>This exchange will be approved immediately. Inventory will update automatically and the record will be saved for admin auditing.</p>
                                <div style={{ display: 'grid', gap: 12 }}>
                                    <div style={{ padding: 12, borderRadius: 10, background: 'var(--bg-sidebar)' }}>
                                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem' }}>Refund reference</p>
                                        <p style={{ margin: '6px 0 0', fontWeight: 700 }}>{exchangeReference}</p>
                                    </div>
                                    <div style={{ padding: 12, borderRadius: 10, background: 'var(--bg-sidebar)' }}>
                                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem' }}>Replacement value</p>
                                        <p style={{ margin: '6px 0 0', fontWeight: 700 }}>{formatCurrency(replacementValue)}</p>
                                    </div>
                                    <div style={{ padding: 12, borderRadius: 10, background: 'var(--bg-sidebar)' }}>
                                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem' }}>Returned value</p>
                                        <p style={{ margin: '6px 0 0', fontWeight: 700 }}>{formatCurrency(totalRefund)}</p>
                                    </div>
                                    {exchangeDifference !== 0 && (
                                        <div style={{ padding: 12, borderRadius: 10, background: exchangeDifference > 0 ? 'rgba(220, 38, 38, 0.08)' : 'rgba(16, 185, 129, 0.08)', border: `1px solid ${exchangeDifference > 0 ? 'rgba(220, 38, 38, 0.2)' : 'rgba(16, 185, 129, 0.2)'}` }}>
                                            <p style={{ margin: 0, fontWeight: 700, color: exchangeDifference > 0 ? 'var(--danger)' : 'var(--success)' }}>
                                                {exchangeDifference > 0 ? `Additional payment required: ${formatCurrency(additionalPayment)}` : `Exchange credit available: ${formatCurrency(exchangeCredit)}`}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                                <button className="btn btn-secondary" onClick={() => setConfirmationOpen(false)} disabled={processing}>Cancel</button>
                                <button className="btn btn-success" onClick={confirmApproveExchange} disabled={processing}>Confirm Exchange</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* History Details Modal */}
            <AnimatePresence>
                {selectedHistory && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.div className="modal" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
                            <div className="modal-header">
                                <span className="modal-title">Exchange Record Details</span>
                                <button className="chat-icon-btn" onClick={() => setSelectedHistory(null)}><X size={18} /></button>
                            </div>
                            <div className="modal-body" style={{ padding: 24 }}>
                                <div style={{ background: 'var(--bg-elevated)', borderRadius: 12, padding: 20, marginBottom: 20, border: '1px solid var(--border)' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                                        <div>
                                            <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 800, marginBottom: 4 }}>Exchange Reference</p>
                                            <p style={{ fontSize: '1.1rem', fontFamily: 'monospace', fontWeight: 800, color: 'var(--accent-hover)' }}>{selectedHistory.exchangeReference}</p>
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 800, marginBottom: 4 }}>Original Sale</p>
                                            <p style={{ fontSize: '1.1rem', fontFamily: 'monospace', fontWeight: 800, color: 'var(--accent-hover)' }}>{selectedHistory.originalSaleId}</p>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 20 }}>
                                        <div>
                                            <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 800, marginBottom: 4 }}>Customer Name</p>
                                            <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>{selectedHistory.customerName || getExampleName(selectedHistory.id)}</p>
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 800, marginBottom: 4 }}>Processed By</p>
                                            <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>{selectedHistory.cashierName}</p>
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 800, marginBottom: 4 }}>Date & Time</p>
                                            <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{formatDateTime(selectedHistory.createdAt)}</p>
                                        </div>
                                    </div>

                                    <div style={{ background: 'var(--bg-sidebar)', padding: 14, borderRadius: 8, borderLeft: '4px solid var(--accent)' }}>
                                        <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 800, marginBottom: 6 }}>Reason for Exchange</p>
                                        <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>"{selectedHistory.reason}"</p>
                                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                <strong>Returned Condition:</strong> {selectedHistory.returnedCondition === 'reusable' ? '✓ Reusable (Inventory Restored)' : '✗ Defective (Not Restocked)'}
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
                                            {selectedHistory.returnedItems?.map((item, i) => (
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
                                            {selectedHistory.replacementItems?.map((item, i) => (
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
                                            <p style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--danger)' }}>{formatCurrency(selectedHistory.totalRefund)}</p>
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 800, marginBottom: 6 }}>Replacement Value</p>
                                            <p style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--success)' }}>{formatCurrency(selectedHistory.replacementValue)}</p>
                                        </div>
                                    </div>
                                    {selectedHistory.additionalPayment > 0 && (
                                        <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                <strong>Additional Payment:</strong> {formatCurrency(selectedHistory.additionalPayment)} (Customer paid this amount)
                                            </p>
                                        </div>
                                    )}
                                    {selectedHistory.exchangeCredit > 0 && (
                                        <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                <strong>Store Credit:</strong> {formatCurrency(selectedHistory.exchangeCredit)} (Customer received this as credit/balance)
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {selectedHistory.notes && (
                                    <div style={{ background: 'rgba(76, 175, 80, 0.1)', borderRadius: 12, padding: 16, marginTop: 20, border: '1px solid rgba(76, 175, 80, 0.3)', borderLeft: '4px solid var(--success)' }}>
                                        <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--success)', fontWeight: 800, marginBottom: 6 }}>Notes</p>
                                        <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{selectedHistory.notes}</p>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                                <button className="btn btn-secondary" onClick={() => setSelectedHistory(null)}>Close</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
