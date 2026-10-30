import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    collection, onSnapshot, doc, runTransaction,
    serverTimestamp, query, where, getDocs, addDoc
} from 'firebase/firestore'
import { db, auth } from '../../firebase'
import { formatCurrency, generateTransactionId } from '../../utils/helpers'
import {
    Search, Trash2, ShoppingCart, Camera, Keyboard,
    Calendar, Receipt, Package, Printer, Check, History, X, AlertTriangle, Lightbulb
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import QRScanner from '../../components/pos/QRScanner'
import toast from 'react-hot-toast'
import '../../styles/pos.css'

const getNow = () => Date.now()

export default function POS() {
    const [products, setProducts] = useState([])
    const [cart, setCart] = useState([])
    const [inputMode, setInputMode] = useState('manual') // 'scanner' | 'manual'
    const [skuInput, setSkuInput] = useState('')
    const [scannerActive, setScannerActive] = useState(false)
    const [tendered, setTendered] = useState('')
    const [processing, setProcessing] = useState(false)
    const [receipt, setReceipt] = useState(null)
    const [todaySales, setTodaySales] = useState(0)
    const [todayTransactions, setTodayTransactions] = useState(0)
    const [todayItems, setTodayItems] = useState(0)
    const [recentSalesList, setRecentSalesList] = useState([])
    const [showRecentModal, setShowRecentModal] = useState(false)
    
    // Intelligent Product Acquisition State
    const [recoBarcode, setRecoBarcode] = useState(null)
    const [suggestedName, setSuggestedName] = useState('')
    const [submittingReco, setSubmittingReco] = useState(false)

    const rewardCard = ''
    const cardValidated = null
    const validatingCard = false

    const skuRef = useRef(null)
    const { userProfile, settings } = useAuth()

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
        if (!sku) return toast.error('Enter barcode number, SKU, or product name.')
        
        try {
            // Fetch from DaaS API first (Simulating SME consuming the API)
            const res = await fetch(`http://localhost:5000/api/v1/products/barcode/${sku}`)
            if (res.status === 404) {
                const errorData = await res.json()
                if (/^\d+$/.test(sku)) {
                    setRecoBarcode(sku)
                    setSuggestedName(`Unregistered Item (${sku})`)
                    toast.error(errorData.message || 'Product not found.')
                } else {
                    toast.error('Product not found.')
                }
                return
            }
            if (!res.ok) throw new Error('API Error')
            
            const { product } = await res.json()
            if (product.stock <= 0) return toast.error('Out of stock!')
            addToCart(product)
            setSkuInput('')
            skuRef.current?.focus()
        } catch (err) {
            // Fallback to local search if API connection fails (e.g. searching by name instead of barcode)
            const found = products.find(p => p.barcodeNumber === sku)
                || products.find(p => p.id.toLowerCase() === sku.toLowerCase())
                || products.find(p => p.sku?.toLowerCase() === sku.toLowerCase())
                || products.find(p => p.name?.toLowerCase().includes(sku.toLowerCase()))
                
            if (!found) {
                if (/^\d+$/.test(sku)) {
                    setRecoBarcode(sku)
                    setSuggestedName(`Unregistered Item (${sku})`)
                } else {
                    toast.error('Product not found.')
                }
                return
            }
            if (found.stock <= 0) return toast.error('Out of stock!')
            addToCart(found)
            setSkuInput('')
            skuRef.current?.focus()
        }
    }

    const handleBarcodeScan = async (decoded) => {
        const now = getNow()
        if (lastScanRef.current.text === decoded && (now - lastScanRef.current.time) < 1500) return
        lastScanRef.current = { text: decoded, time: now }

        const trimmed = decoded.trim()

        try {
            // Query the DaaS API explicitly to demonstrate API usage to the panel
            const res = await fetch(`http://localhost:5000/api/v1/products/barcode/${trimmed}`)
            
            if (res.status === 404) {
                const errorData = await res.json()
                // Unregistered barcode scanned: Trigger Intelligent Acquisition modal
                setScannerActive(false)
                setRecoBarcode(trimmed)
                setSuggestedName(`Unregistered Barcode Item (${trimmed})`)
                
                // Show the specific message from the API DaaS fallback logic
                toast.error(errorData.message || `Barcode ${trimmed} not found. Launching Intelligent Recommendation Engine...`, { id: 'barcode-err' })
                return
            }
            
            if (!res.ok) throw new Error('API Error')
            
            const { product } = await res.json()
            if (product.stock <= 0) {
                toast.error(`${product.name} is out of stock!`, { id: 'barcode-stock' })
                return
            }
            addToCart(product)
        } catch (err) {
            toast.error("Failed to connect to DaaS API. " + err.message)
        }
    }

    const handleSendRecommendation = async () => {
        if (!recoBarcode) return
        setSubmittingReco(true)
        try {
            await addDoc(collection(db, 'recommendations'), {
                barcode: recoBarcode,
                suggestedName: suggestedName || `New Scanned Item (${recoBarcode})`,
                businessType: settings?.businessType || 'hardware',
                status: 'pending',
                submittedBy: userProfile?.name || 'Cashier Terminal',
                createdAt: serverTimestamp()
            })
            toast.success('Acquisition recommendation uploaded! Admin has been notified.')
            setRecoBarcode(null)
            setSuggestedName('')
        } catch (err) {
            toast.error('Failed to upload recommendation.')
        } finally {
            setSubmittingReco(false)
        }
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

    const subtotal = cart.reduce((s, i) => s + i.subtotal, 0)
    const hasRewardCard = !!cardValidated
    const conversionRate = (settings.defaultDiscount ?? 10) / 100
    const pointsToEarn = Math.floor(subtotal * conversionRate)
    const total = subtotal
    const change = Number(tendered) - total

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
                    const currentStock = Number(pSnap.data().stock) || 0
                    if (currentStock < item.qty) throw new Error(`Insufficient stock for ${item.name}.`)
                    tx.update(pRef, { stock: currentStock - item.qty, updatedAt: serverTimestamp() })
                }
                
                const saleRef = doc(collection(db, 'sales'))
                tx.set(saleRef, {
                    transactionId,
                    cashierId: auth.currentUser?.uid,
                    cashierName: userProfile?.name || 'Cashier',
                    items: cart.map(i => ({ productId: i.id, name: i.name, qty: i.qty, price: i.price, subtotal: i.subtotal })),
                    subtotal,
                    pointsEarned: hasRewardCard ? pointsToEarn : 0,
                    rewardCardNumber: rewardCard || '',
                    rewardCardCustomer: cardValidated?.customerName || '',
                    total,
                    tendered: Number(tendered),
                    change: Number(tendered) - total,
                    paymentMethod: 'cash',
                    status: 'completed',
                    businessType: settings?.businessType || 'hardware', // Sync segment
                    createdAt: serverTimestamp()
                })
            })
            setReceipt({
                transactionId, items: [...cart],
                subtotal, pointsEarned: hasRewardCard ? pointsToEarn : 0,
                total, tendered: Number(tendered), change,
                cashierName: userProfile?.name || 'Cashier',
                rewardCardUsed: cardValidated?.customerName || '',
                date: new Date()
            })
            setCart([])
            setTendered('')
            toast.success('Transaction complete!')
        } catch (err) {
            toast.error(err.message || 'Transaction failed.')
        } finally {
            setProcessing(false)
        }
    }

    const handlePrint = () => window.print()

    if (receipt) {
        return (
            <div className="pos-receipt-root">
                <div className="pos-receipt-card" id="printable-receipt">
                    <div className="receipt-store-header">
                        <Package size={28} style={{ marginBottom: 6, opacity: 0.8 }} />
                        <h2 style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}>{settings?.storeName || 'ASM HARDWARE'}</h2>
                        <p style={{ letterSpacing: '0.05em' }}>OFFICIAL TERMINAL RECEIPT</p>
                        <p style={{ fontSize: '0.65rem', marginTop: 6, fontWeight: 600 }}>OFFICIAL RECEIPT</p>
                    </div>
                    <div className="receipt-divider dashed" />
                    <div className="receipt-meta">
                        <span>TXN: {receipt.transactionId}</span>
                        <span>{receipt.date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="receipt-divider dashed" />
                    
                    <div className="receipt-items-header">
                        <span>ITEM</span>
                        <span>QTY</span>
                        <span>AMT</span>
                    </div>

                    <div className="receipt-items">
                        {receipt.items.map((item, i) => (
                            <div key={i} className="receipt-item-row">
                                <div className="receipt-item-details">
                                    <span className="receipt-item-name">
                                        {item.name} {item.size ? `(${item.size})` : ''}
                                    </span>
                                    <span className="receipt-item-price-calc">{item.qty} x {item.price.toFixed(2)}</span>
                                </div>
                                <span className="receipt-item-total">{item.subtotal.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="receipt-divider dashed" />
                    
                    <div className="receipt-totals">
                        <div className="receipt-total-row">
                            <span>SUBTOTAL</span>
                            <span>{receipt.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="receipt-grand-total-block">
                            <span>TOTAL</span>
                            <span>₱{receipt.total.toFixed(2)}</span>
                        </div>
                        <div className="receipt-total-row">
                            <span>CASH TENDERED</span>
                            <span>{receipt.tendered.toFixed(2)}</span>
                        </div>
                        <div className="receipt-total-row">
                            <span>CHANGE</span>
                            <span>{receipt.change.toFixed(2)}</span>
                        </div>
                    </div>
                    
                    <div className="receipt-divider dashed" />
                    
                    <div className="receipt-footer">
                        <p>SERVED BY: {receipt.cashierName.toUpperCase()}</p>
                        <div className="receipt-barcode">
                            || ||| | ||| || || | ||| ||| |
                            <span className="receipt-barcode-text">{receipt.transactionId}</span>
                        </div>
                        <p style={{ marginTop: 16 }}>{settings?.receiptFooter || 'THANK YOU FOR SHOPPING!'}</p>
                        <p style={{ fontSize: '0.65rem' }}>THIS RECEIPT IS YOUR PROOF OF PURCHASE.</p>
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

    return (
        <div className="pos-v2-root">
            {/* KPI Cards */}
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

            {/* Main Panel */}
            <div className="pos-v2-panel">
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
                                        onScan={(decoded) => { handleBarcodeScan(decoded) }}
                                        onError={() => {
                                            setScannerActive(false)
                                            toast.error('Camera unavailable. Please allow camera access.', { duration: 5000 })
                                        }}
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
                                placeholder="Enter SKU or barcode number..."
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
                                        <span className="pos-cart-item-name" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                            {item.name}
                                            {item.size && (
                                                <span style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600 }}>({item.size})</span>
                                            )}
                                        </span>
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

                <div className="pos-v2-right">
                    <h3 className="pos-summary-title">Transaction Summary</h3>

                    <div className="pos-summary-rows">
                        <div className="pos-summary-row">
                            <span>Subtotal:</span>
                            <span>{formatCurrency(subtotal)}</span>
                        </div>
                        <div className="pos-summary-divider" />
                        <div className="pos-summary-row pos-summary-total">
                            <span>Total:</span>
                            <span>{formatCurrency(total)}</span>
                        </div>
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

            {/* Intelligent Product Acquisition Suggestion Modal */}
            <AnimatePresence>
                {recoBarcode && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.div className="modal" style={{ maxWidth: 450, padding: 24, border: '1px solid rgba(99, 102, 241, 0.3)' }}
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366F1' }}>
                                    <Lightbulb size={22} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Intelligent Product Suggestion</h3>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>DaaS Acquisition Engine Recommendation</p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                    The scanned barcode <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{recoBarcode}</strong> was not found in the DaaS product database.
                                    Would you like to send an acquisition recommendation or add it to the database directly?
                                </p>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">Suggested Product Name (Optional)</label>
                                    <input 
                                        className="form-input" 
                                        value={suggestedName} 
                                        onChange={e => setSuggestedName(e.target.value)} 
                                        placeholder="e.g. Davies Paint, Paracetamol Brand" 
                                    />
                                </div>
                            </div>

                            <div className="modal-footer" style={{ border: 'none', padding: 0, gap: 10, flexWrap: 'wrap' }}>
                                <button className="btn btn-secondary" onClick={() => { setRecoBarcode(null); setSuggestedName('') }} disabled={submittingReco}>
                                    Dismiss
                                </button>
                                <button className="btn btn-outline" style={{ borderColor: '#10B981', color: '#10B981' }} onClick={() => window.open(`http://localhost:5000/add-product?barcode=${recoBarcode}`, '_blank')}>
                                    + Add New Product
                                </button>
                                <button className="btn btn-primary" style={{ background: '#6366F1' }} onClick={handleSendRecommendation} disabled={submittingReco}>
                                    {submittingReco ? 'Sending...' : '✔ Send Request'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

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
                                                                    pointsEarned: data.pointsEarned || 0,
                                                                    rewardCardUsed: data.rewardCardCustomer || '',
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
