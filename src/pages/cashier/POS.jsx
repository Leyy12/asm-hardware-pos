import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    collection, onSnapshot, doc, runTransaction,
    serverTimestamp, query, where, getDocs, updateDoc
} from 'firebase/firestore'
import { db, auth } from '../../firebase'
import { formatCurrency, generateTransactionId } from '../../utils/helpers'
import {
    Search, Trash2, ShoppingCart, Camera, Keyboard,
    RotateCcw, Calendar, Receipt, Package, Printer, Check, History, X
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import QRScanner from '../../components/pos/QRScanner'
import toast from 'react-hot-toast'
import '../../styles/pos.css'

export default function POS() {
    const [products, setProducts] = useState([])
    const [cart, setCart] = useState([])
    const [inputMode, setInputMode] = useState('manual') // 'scanner' | 'manual'
    const [skuInput, setSkuInput] = useState('')
    const [scannerActive, setScannerActive] = useState(false)
    const [tendered, setTendered] = useState('')
    const [discountCard, setDiscountCard] = useState('')
    const [cardValidated, setCardValidated] = useState(null) // { id, cardNumber, discount }
    const [validatingCard, setValidatingCard] = useState(false)
    const [processing, setProcessing] = useState(false)
    const [receipt, setReceipt] = useState(null)
    const [todaySales, setTodaySales] = useState(0)
    const [todayTransactions, setTodayTransactions] = useState(0)
    const [todayItems, setTodayItems] = useState(0)
    const [recentSalesList, setRecentSalesList] = useState([])
    const [showRecentModal, setShowRecentModal] = useState(false)
    const skuRef = useRef(null)
    const { userProfile } = useAuth()
    const navigate = useNavigate()

    // Load products
    useEffect(() => {
        const unsub = onSnapshot(
            query(collection(db, 'products'), where('isActive', '!=', false)),
            snap => setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        )
        return unsub
    }, [])

    // Load today's stats
    useEffect(() => {
        const startOfDay = new Date()
        startOfDay.setHours(0, 0, 0, 0)

        const unsub = onSnapshot(
            query(
                collection(db, 'sales'),
                where('cashierId', '==', auth.currentUser?.uid || ''),
                where('status', '==', 'completed')
            ),
            snap => {
                const todayDocs = snap.docs.filter(d => {
                    const ts = d.data().createdAt?.toDate?.()
                    return ts && ts >= startOfDay
                })
                setTodayTransactions(todayDocs.length)
                setTodaySales(todayDocs.reduce((s, d) => s + (d.data().total || 0), 0))
                setTodayItems(todayDocs.reduce((s, d) => {
                    return s + (d.data().items?.reduce((a, i) => a + (i.qty || 0), 0) || 0)
                }, 0))
                setRecentSalesList(todayDocs.sort((a, b) => (b.data().createdAt?.toDate() || 0) - (a.data().createdAt?.toDate() || 0)))
            }
        )
        return unsub
    }, [])

    // SKU search handler
    const handleSKUSearch = async () => {
        const sku = skuInput.trim()
        if (!sku) return toast.error('Enter SKU or product name.')
        const found = products.find(p =>
            p.sku?.toLowerCase() === sku.toLowerCase() ||
            p.name?.toLowerCase().includes(sku.toLowerCase())
        )
        if (!found) return toast.error('Product not found.')
        if (found.stock <= 0) return toast.error('Out of stock!')
        addToCart(found)
        setSkuInput('')
        skuRef.current?.focus()
    }

    // QR scan handler - keeping a cache of last scanned to prevent rapid dupe scans
    const lastScanRef = useRef({ text: '', time: 0 })

    const handleQRScan = (decoded) => {
        // Prevent rapid duplicate scans within 1.5 seconds
        const now = Date.now()
        if (lastScanRef.current.text === decoded && (now - lastScanRef.current.time) < 1500) return
        lastScanRef.current = { text: decoded, time: now }

        const found = products.find(p => {
            const skuValid = p.sku && p.sku.trim() !== ''
            return (skuValid && (p.sku === decoded || decoded.includes(p.sku))) ||
                p.id === decoded || decoded.includes(p.id)
        })

        if (!found) {
            toast.error(`No product for scanned code`, { id: 'qr-err' })
            return
        }
        if (found.stock <= 0) {
            toast.error(`${found.name} is out of stock!`, { id: 'qr-stock' })
            return
        }
        addToCart(found)
    }

    const addToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === product.id)
            if (existing) {
                if (existing.qty >= product.stock) { toast.error('Not enough stock!'); return prev }
                return prev.map(i => i.id === product.id
                    ? { ...i, qty: i.qty + 1, subtotal: (i.qty + 1) * i.price }
                    : i
                )
            }
            return [...prev, { ...product, qty: 1, subtotal: product.price }]
        })
        toast.success(`${product.name} added!`, { duration: 1000 })
    }

    const updateQty = (id, qty) => {
        if (qty <= 0) return removeItem(id)
        const product = products.find(p => p.id === id)
        if (product && qty > product.stock) return toast.error('Not enough stock!')
        setCart(prev => prev.map(i => i.id === id ? { ...i, qty, subtotal: qty * i.price } : i))
    }

    const removeItem = (id) => setCart(prev => prev.filter(i => i.id !== id))

    // Calculate totals
    const subtotal = cart.reduce((s, i) => s + i.subtotal, 0)
    const hasDiscount = !!cardValidated
    const discountPct = cardValidated ? (cardValidated.discount / 100) : 0
    const discountAmt = subtotal * discountPct
    const total = subtotal - discountAmt
    const change = Number(tendered) - total

    // Verify discount card against Firestore
    const handleVerifyCard = async () => {
        const num = discountCard.trim().toUpperCase()
        if (!num) return toast.error('Enter a card number.')
        setValidatingCard(true)
        try {
            const snap = await getDocs(
                query(collection(db, 'discountCards'),
                    where('cardNumber', '==', num),
                    where('status', '==', 'active'))
            )
            if (snap.empty) {
                setCardValidated(null)
                toast.error('Invalid or already used card.')
            } else {
                const card = { id: snap.docs[0].id, ...snap.docs[0].data() }
                setCardValidated(card)
                toast.success(`✅ Card valid! Applied to ${card.customerName || 'Customer'}.`)
            }
        } catch {
            toast.error('Could not verify card.')
        } finally {
            setValidatingCard(false)
        }
    }

    const handleCheckout = async () => {
        if (cart.length === 0) return toast.error('Cart is empty.')
        if (!tendered || Number(tendered) < total) return toast.error('Insufficient payment amount.')
        setProcessing(true)
        const transactionId = generateTransactionId()
        try {
            await runTransaction(db, async (tx) => {
                for (const item of cart) {
                    const pRef = doc(db, 'products', item.id)
                    const pSnap = await tx.get(pRef)
                    if (!pSnap.exists()) throw new Error(`Product ${item.name} not found.`)
                    const currentStock = pSnap.data().stock
                    if (currentStock < item.qty) throw new Error(`Insufficient stock for ${item.name}.`)
                    tx.update(pRef, { stock: currentStock - item.qty, updatedAt: serverTimestamp() })
                }
                // If a discount card is used, mark it as 'used'
                if (cardValidated) {
                    const cardRef = doc(db, 'discountCards', cardValidated.id)
                    const cardSnap = await tx.get(cardRef)
                    if (!cardSnap.exists() || cardSnap.data().status !== 'active') {
                        throw new Error('Discount card is no longer valid.')
                    }
                    tx.update(cardRef, {
                        status: 'used',
                        usedAt: serverTimestamp(),
                        transactionId,
                        usedBy: userProfile?.name || 'Cashier'
                    })
                }
                const saleRef = doc(collection(db, 'sales'))
                tx.set(saleRef, {
                    transactionId,
                    cashierId: auth.currentUser?.uid,
                    cashierName: userProfile?.name || 'Cashier',
                    items: cart.map(i => ({ productId: i.id, name: i.name, qty: i.qty, price: i.price, subtotal: i.subtotal })),
                    subtotal,
                    discount: discountAmt,
                    discountCard: discountCard || '',
                    total,
                    tendered: Number(tendered),
                    change: Number(tendered) - total,
                    paymentMethod: 'cash',
                    status: 'completed',
                    createdAt: serverTimestamp()
                })
            })
            setReceipt({
                transactionId, items: [...cart],
                subtotal, discountAmt, discountPct,
                total, tendered: Number(tendered), change,
                cashierName: userProfile?.name || 'Cashier',
                date: new Date()
            })
            setCart([])
            setTendered('')
            setDiscountCard('')
            setCardValidated(null)
            toast.success('Transaction complete!')
        } catch (err) {
            toast.error(err.message || 'Transaction failed.')
        } finally {
            setProcessing(false)
        }
    }

    const handlePrint = () => window.print()

    // ---- Receipt View ----
    if (receipt) {
        return (
            <div className="pos-receipt-root">
                <div className="pos-receipt-card" id="printable-receipt">
                    <div className="receipt-store-header">
                        <Package size={32} style={{ color: '#10B981' }} />
                        <h2>ASM Hardware</h2>
                        <p>& General Merchandise</p>
                        <p style={{ fontSize: '0.7rem', color: '#666', marginTop: 4 }}>Official Receipt</p>
                    </div>
                    <div className="receipt-divider" />
                    <div className="receipt-meta">
                        <span>TXN: <strong style={{ fontFamily: 'monospace' }}>{receipt.transactionId}</strong></span>
                        <span>{receipt.date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        <span>Cashier: {receipt.cashierName}</span>
                    </div>
                    <div className="receipt-divider" />
                    <div className="receipt-items">
                        {receipt.items.map((item, i) => (
                            <div key={i} className="receipt-item-row">
                                <div>
                                    <span className="receipt-item-name">{item.name}</span>
                                    <span className="receipt-item-sub">x{item.qty} @ {formatCurrency(item.price)}</span>
                                </div>
                                <span className="receipt-item-total">{formatCurrency(item.subtotal)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="receipt-divider" />
                    <div className="receipt-totals">
                        <div className="receipt-total-row">
                            <span>Subtotal</span>
                            <span>{formatCurrency(receipt.subtotal)}</span>
                        </div>
                        {receipt.discountAmt > 0 && (
                            <div className="receipt-total-row" style={{ color: '#388E3C' }}>
                                <span>Discount (10%)</span>
                                <span>-{formatCurrency(receipt.discountAmt)}</span>
                            </div>
                        )}
                        <div className="receipt-total-row receipt-grand-total">
                            <span>TOTAL</span>
                            <span>{formatCurrency(receipt.total)}</span>
                        </div>
                        <div className="receipt-total-row">
                            <span>Cash Tendered</span>
                            <span>{formatCurrency(receipt.tendered)}</span>
                        </div>
                        <div className="receipt-total-row" style={{ color: '#388E3C', fontWeight: 700 }}>
                            <span>Change</span>
                            <span>{formatCurrency(receipt.change)}</span>
                        </div>
                    </div>
                    <div className="receipt-divider" />
                    <div className="receipt-footer">
                        <p>Thank you for shopping!</p>
                        <p style={{ fontSize: '0.7rem', color: '#999' }}>This receipt is your proof of purchase.</p>
                    </div>
                </div>
                <div className="pos-receipt-actions no-print">
                    <button className="btn btn-primary" style={{ gap: 8 }} onClick={handlePrint}>
                        <Printer size={18} /> Print Receipt
                    </button>
                    <button className="btn btn-secondary" onClick={() => setReceipt(null)}>
                        <ShoppingCart size={16} /> New Transaction
                    </button>
                </div>
            </div>
        )
    }

    // ---- Main POS View ----
    return (
        <div className="pos-v2-root">
            {/* ---- KPI Cards ---- */}
            <div className="pos-kpi-row">
                <div className="pos-kpi-card">
                    <div>
                        <p className="pos-kpi-label">Date</p>
                        <p className="pos-kpi-value">{new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                    <Calendar size={36} className="pos-kpi-icon" />
                </div>
                <div className="pos-kpi-card">
                    <div>
                        <p className="pos-kpi-label">Today Sales</p>
                        <p className="pos-kpi-value">{formatCurrency(todaySales)}</p>
                    </div>
                    <Receipt size={36} className="pos-kpi-icon" />
                </div>
                <div className="pos-kpi-card">
                    <div>
                        <p className="pos-kpi-label">Total Transaction</p>
                        <p className="pos-kpi-value">{todayTransactions}</p>
                    </div>
                    <ShoppingCart size={36} className="pos-kpi-icon" />
                </div>
                <div className="pos-kpi-card">
                    <div>
                        <p className="pos-kpi-label">Total Items Sold</p>
                        <p className="pos-kpi-value">{todayItems}</p>
                    </div>
                    <Package size={36} className="pos-kpi-icon" />
                </div>
            </div>

            {/* ---- Action Buttons ---- */}
            <div style={{ marginBottom: 20, display: 'flex', gap: 12 }}>
                <button className="btn btn-secondary" onClick={() => navigate('/cashier/refund')}
                    style={{ gap: 8, borderRadius: 12, border: '2px solid var(--text-primary)', fontWeight: 700 }}>
                    <RotateCcw size={16} /> Request Refund
                </button>
                <button className="btn btn-secondary" onClick={() => setShowRecentModal(true)}
                    style={{ gap: 8, borderRadius: 12, border: '2px solid var(--border)', fontWeight: 700 }}>
                    <History size={16} /> Recent Transactions
                </button>
            </div>

            {/* ---- Main Panel ---- */}
            <div className="pos-v2-panel">
                {/* LEFT: Scanner/Input */}
                <div className="pos-v2-left">
                    {/* Mode Tabs */}
                    <div className="pos-mode-tabs">
                        <button
                            className={`pos-mode-tab ${inputMode === 'scanner' ? 'active' : ''}`}
                            onClick={() => { setInputMode('scanner'); setScannerActive(false) }}
                        >
                            <Camera size={15} /> Camera Scanner
                        </button>
                        <button
                            className={`pos-mode-tab ${inputMode === 'manual' ? 'active' : ''}`}
                            onClick={() => { setInputMode('manual'); setScannerActive(false); setTimeout(() => skuRef.current?.focus(), 100) }}
                        >
                            <Keyboard size={15} /> Manual Input
                        </button>
                    </div>

                    {/* Input */}
                    {inputMode === 'scanner' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {!scannerActive ? (
                                <div className="pos-scanner-placeholder">
                                    <Camera size={48} style={{ opacity: 0.25 }} />
                                    <p style={{ margin: '8px 0 0', fontSize: '0.875rem' }}>Tap to start camera</p>
                                    <button className="btn btn-primary" style={{ marginTop: 12 }}
                                        onClick={() => setScannerActive(true)}>
                                        📷 Start Camera Scanner
                                    </button>
                                </div>
                            ) : (
                                <div style={{ position: 'relative' }}>
                                    <QRScanner
                                        active={scannerActive}
                                        onScan={(decoded) => { handleQRScan(decoded) }}
                                        onError={() => { setScannerActive(false); toast.error('Camera access denied or unavailable.') }}
                                    />
                                    <button className="btn btn-secondary" style={{ marginTop: 8, width: '100%' }}
                                        onClick={() => setScannerActive(false)}>
                                        ■ Stop Scanner
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="pos-sku-row">
                            <input
                                ref={skuRef}
                                id="sku-input"
                                className="form-input"
                                placeholder="Enter SKU or product name…"
                                value={skuInput}
                                onChange={e => setSkuInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSKUSearch()}
                                autoFocus
                            />
                            <button className="btn btn-primary" onClick={handleSKUSearch} style={{ flexShrink: 0 }}>
                                <Search size={16} /> Search
                            </button>
                        </div>
                    )}

                    {/* Cart Items */}
                    <div className="pos-cart-items-v2">
                        {cart.length === 0 ? (
                            <div className="pos-cart-empty">
                                <ShoppingCart size={40} style={{ opacity: 0.2 }} />
                                <p>No items yet. Search a product above.</p>
                            </div>
                        ) : (
                            cart.map(item => (
                                <motion.div
                                    key={item.id}
                                    className="pos-cart-item-v2"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                >
                                    <div className="pos-cart-item-info">
                                        <span className="pos-cart-item-name">{item.name}</span>
                                        <span className="pos-cart-item-price">{formatCurrency(item.price)}</span>
                                    </div>
                                    <div className="pos-cart-item-controls">
                                        <button className="pos-qty-btn" onClick={() => updateQty(item.id, item.qty - 1)}>−</button>
                                        <input
                                            type="number"
                                            className="pos-qty-input"
                                            value={item.qty}
                                            min={1}
                                            onChange={e => updateQty(item.id, parseInt(e.target.value) || 1)}
                                        />
                                        <button className="pos-qty-btn" onClick={() => updateQty(item.id, item.qty + 1)}>+</button>
                                        <button className="pos-qty-btn danger" onClick={() => removeItem(item.id)}>
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                    <span className="pos-cart-item-sub">{formatCurrency(item.subtotal)}</span>
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>

                {/* RIGHT: Transaction Summary */}
                <div className="pos-v2-right">
                    <h3 className="pos-summary-title">Transaction Summary</h3>

                    <div className="pos-summary-rows">
                        <div className="pos-summary-row">
                            <span>Subtotal:</span>
                            <span>{formatCurrency(subtotal)}</span>
                        </div>
                        <div className="pos-summary-row" style={{ color: '#388E3C' }}>
                            <span>Discount ({Math.round(discountPct * 100)}%):</span>
                            <span>-{formatCurrency(discountAmt)}</span>
                        </div>
                        <div className="pos-summary-divider" />
                        <div className="pos-summary-row pos-summary-total">
                            <span>Total:</span>
                            <span>{formatCurrency(total)}</span>
                        </div>
                        {hasDiscount && (
                            <div className="pos-summary-row" style={{ color: '#388E3C', fontSize: '0.8rem' }}>
                                <span>You Saved:</span>
                                <span>{formatCurrency(discountAmt)}</span>
                            </div>
                        )}
                    </div>

                    <div className="pos-summary-field">
                        <label className="pos-summary-label">Discount Card</label>
                        {cardValidated ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 10 }}>
                                <Check size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8rem', color: '#16a34a', margin: 0 }}>
                                        {cardValidated.cardNumber}
                                    </p>
                                    <p style={{ fontSize: '0.7rem', color: '#15803d', margin: 0 }}>
                                        {cardValidated.discount}% discount applied!
                                    </p>
                                </div>
                                <button
                                    onClick={() => { setCardValidated(null); setDiscountCard('') }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '0.75rem', fontWeight: 600 }}
                                >
                                    Remove
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input
                                    className="form-input"
                                    placeholder="Enter card number (ASM-XXXX-XXXX-XXXX)…"
                                    value={discountCard}
                                    onChange={e => { setDiscountCard(e.target.value.toUpperCase()); setCardValidated(null) }}
                                    onKeyDown={e => e.key === 'Enter' && handleVerifyCard()}
                                    style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                                />
                                <button
                                    className="btn btn-secondary"
                                    onClick={handleVerifyCard}
                                    disabled={validatingCard}
                                    style={{ flexShrink: 0, fontSize: '0.8rem' }}
                                >
                                    {validatingCard ? '…' : 'Verify'}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="pos-summary-field">
                        <label className="pos-summary-label">Payment Amount</label>
                        <input
                            id="tendered-input"
                            type="number"
                            className="form-input"
                            placeholder="Enter payment…"
                            value={tendered}
                            onChange={e => setTendered(e.target.value)}
                        />
                    </div>

                    <div className="pos-summary-row" style={{ fontSize: '0.9rem', padding: '4px 0' }}>
                        <span>Change:</span>
                        <span style={{ fontWeight: 700 }}>
                            {tendered && Number(tendered) >= total
                                ? formatCurrency(change)
                                : '₱0.00'}
                        </span>
                    </div>

                    <button
                        id="checkout-btn"
                        className="pos-checkout-btn"
                        onClick={handleCheckout}
                        disabled={processing || cart.length === 0 || !tendered || Number(tendered) < total}
                    >
                        {processing ? 'Processing…' : 'Process Payment'}
                    </button>

                    {cart.length > 0 && (
                        <button
                            className="btn btn-secondary"
                            style={{ width: '100%', marginTop: 8 }}
                            onClick={() => setCart([])}
                        >
                            Clear Cart
                        </button>
                    )}
                </div>
            </div>

            {/* Recent Transactions Modal */}
            <AnimatePresence>
                {showRecentModal && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.div className="modal" style={{ maxWidth: 600, width: '95%' }}
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
                            <div className="modal-header">
                                <span className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><History size={20} /> Today's Transactions</span>
                                <button className="chat-icon-btn" onClick={() => setShowRecentModal(false)}><X size={18} /></button>
                            </div>
                            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto', padding: 0 }}>
                                {recentSalesList.length === 0 ? (
                                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No transactions today yet.</div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        {recentSalesList.map(sale => {
                                            const data = sale.data()
                                            const ts = data.createdAt?.toDate?.()
                                            return (
                                                <div key={sale.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                                                    <div>
                                                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>TXN: {data.transactionId}</div>
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{ts ? ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown time'} • {data.items?.length || 0} items</div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                                        <div style={{ fontWeight: 800, color: 'var(--accent)', fontSize: '1.05rem' }}>{formatCurrency(data.total)}</div>
                                                        <button 
                                                            className="btn btn-secondary btn-sm"
                                                            onClick={() => {
                                                                setReceipt({
                                                                    transactionId: data.transactionId,
                                                                    items: data.items || [],
                                                                    subtotal: data.subtotal,
                                                                    discountAmt: data.discount || 0,
                                                                    discountPct: data.discount ? (data.discount / data.subtotal) : 0,
                                                                    total: data.total,
                                                                    tendered: data.tendered,
                                                                    change: data.change,
                                                                    cashierName: data.cashierName,
                                                                    date: ts || new Date()
                                                                })
                                                                setShowRecentModal(false)
                                                            }}
                                                        >
                                                            View Receipt
                                                        </button>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
