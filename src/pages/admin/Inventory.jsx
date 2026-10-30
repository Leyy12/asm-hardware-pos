import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    collection, onSnapshot, addDoc, updateDoc, deleteDoc,
    doc, serverTimestamp, getDocs
} from 'firebase/firestore'
import { db } from '../../firebase'
import { formatCurrency, getStockStatus, generateBarcodeNumber } from '../../utils/helpers'
import { useAuth } from '../../context/AuthContext'
import { fetchInventaProducts } from '../../services/inventaApi'
import Barcode from '../../components/common/Barcode'
import { Plus, Search, Edit2, Trash2, X, Package, Barcode as BarcodeIcon, Archive, RefreshCw, Printer, Download, Upload, Lightbulb, CheckCircle, Database } from 'lucide-react'
import toast from 'react-hot-toast'
import Pagination from '../../components/common/Pagination'
import { useLocation } from 'react-router-dom'

const emptyProduct = {
    name: '', sku: '', categoryId: '', price: '', cost: '',
    stock: '', lowStockThreshold: '', unit: 'pcs', size: '', capacity: '', description: '', isActive: true,
    supplierId: '', supplierName: '', barcodeNumber: ''
}

const PAGE_SIZE = 10

export default function Inventory() {
    const { settings } = useAuth()
    const defaultThreshold = settings?.lowStockAlert ?? 5
    const businessType = settings?.businessType || 'hardware'

    const [products, setProducts] = useState([])
    const [inventaProducts, setInventaProducts] = useState([])
    const [inventaLoading, setInventaLoading] = useState(true)
    const [inventaError, setInventaError] = useState(null)
    const [categories, setCategories] = useState([])
    const [suppliers, setSuppliers] = useState([])
    const [recommendations, setRecommendations] = useState([]) // New Intelligent Acquisition Recommendations
    
    const [search, setSearch] = useState('')
    const [filterCat, setFilterCat] = useState('all')
    const [viewMode, setViewMode] = useState('all') // 'all', 'local', 'inventa'
    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState(null)
    const [form, setForm] = useState(emptyProduct)
    const [saving, setSaving] = useState(false)
    const [deleteId, setDeleteId] = useState(null)
    const [archiveId, setArchiveId] = useState(null)
    const [qrProduct, setQrProduct] = useState(null)
    const [barcodeLoading, setBarcodeLoading] = useState(false)
    const [showArchived, setShowArchived] = useState(false)
    const [showRecommendations, setShowRecommendations] = useState(false) // Toggle viewing scanner recommendations
    const [currentPage, setCurrentPage] = useState(1)
    const [highlightId, setHighlightId] = useState(null)
    
    // Active recommendation being resolved
    const [activeRecoId, setActiveRecoId] = useState(null)

    const location = useLocation()
    const highlightedRowRef = useRef(null)
    const highlightProcessed = useRef(false)

    const openAdd = () => {
        setEditing(null)
        setActiveRecoId(null)
        setForm(emptyProduct)
        setModalOpen(true)
    }

    const openBarcodeModal = async (p) => {
        if (p.barcodeNumber) {
            setQrProduct(p)
            return
        }
        setBarcodeLoading(true)
        try {
            const newBarcode = generateBarcodeNumber()
            await updateDoc(doc(db, 'products', p.id), { barcodeNumber: newBarcode })
            const updated = { ...p, barcodeNumber: newBarcode }
            setQrProduct(updated)
        } catch (err) {
            toast.error('Failed to assign barcode number.')
            setQrProduct(p)
        } finally {
            setBarcodeLoading(false)
        }
    }

    const openEdit = (p) => {
        setEditing(p)
        setActiveRecoId(null)
        setForm({ ...p })
        setModalOpen(true)
    }

    // Load InventaAPI products
    const loadInventaProducts = async () => {
        setInventaLoading(true)
        setInventaError(null)
        const { ok, data, error } = await fetchInventaProducts()
        if (!ok) {
            setInventaError(error)
            setInventaProducts([])
        } else {
            setInventaProducts(data)
        }
        setInventaLoading(false)
    }

    // Load main collections
    useEffect(() => {
        const unsub1 = onSnapshot(collection(db, 'products'), snap =>
            setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        )
        const unsub2 = onSnapshot(collection(db, 'categories'), snap =>
            setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        )
        const unsub3 = onSnapshot(collection(db, 'suppliers'), snap =>
            setSuppliers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        )
        const unsub4 = onSnapshot(collection(db, 'recommendations'), snap =>
            setRecommendations(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        )
        
        // Load InventaAPI products on mount
        loadInventaProducts()
        
        return () => { unsub1(); unsub2(); unsub3(); unsub4() }
    }, [])

    // Enroll a recommended product from the scanner
    const handleEnrollRecommendation = (reco) => {
        setEditing(null)
        setActiveRecoId(reco.id)
        setForm({
            ...emptyProduct,
            barcodeNumber: reco.barcode,
            name: reco.suggestedName || '',
            size: reco.size || '',
            capacity: reco.capacity || ''
        })
        setModalOpen(true)
    }

    // Reject a recommendation
    const handleRejectRecommendation = async (recoId) => {
        try {
            await updateDoc(doc(db, 'recommendations', recoId), { status: 'ignored' })
            toast.success('Acquisition request ignored.')
        } catch {
            toast.error('Failed to ignore request.')
        }
    }

    // Auto-highlight logic from location state
    useEffect(() => {
        const incomingId = location.state?.highlightId
        if (!incomingId || products.length === 0 || highlightProcessed.current) return

        const target = products.find(p => p.id === incomingId)
        if (!target) return

        highlightProcessed.current = true
        setHighlightId(incomingId)
        setSearch(target.name)
        setCurrentPage(1)
        openEdit(target)

        setTimeout(() => {
            highlightedRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 400)
    }, [location.state, products])

    // Reset page on filter changes
    const [prevSearch, setPrevSearch] = useState(search)
    const [prevFilterCat, setPrevFilterCat] = useState(filterCat)
    if (search !== prevSearch || filterCat !== prevFilterCat) {
        setPrevSearch(search)
        setPrevFilterCat(filterCat)
        setCurrentPage(1)
    }

    const filtered = products.filter(p => {
        const matchSearch = p.name?.toLowerCase().includes(search.toLowerCase()) ||
            p.sku?.toLowerCase().includes(search.toLowerCase()) ||
            p.barcodeNumber?.includes(search)
        const matchCat = filterCat === 'all' || p.categoryId === filterCat
        const matchArchive = showArchived ? p.isArchived : !p.isArchived
        return matchSearch && matchCat && matchArchive
    })

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
    const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

    const handleSave = async () => {
        if (!form.name || !form.price || !form.stock) {
            return toast.error('Name, price, and stock are required.')
        }
        setSaving(true)
        try {
            const imageUrl = form.imageUrl || ''
            let finalSupplierId = form.supplierId || ''
            let finalSupplierName = form.supplierName || ''

            if (form.supplierId === 'new') {
                const trimmedNewName = form.newSupplierName?.trim()
                if (!trimmedNewName) {
                    setSaving(false)
                    return toast.error('Please enter the new supplier name.')
                }
                const existing = suppliers.find(s => s.name?.toLowerCase().trim() === trimmedNewName.toLowerCase())
                if (existing) {
                    finalSupplierId = existing.id
                    finalSupplierName = existing.name
                } else {
                    const supplierData = {
                        name: trimmedNewName,
                        contactPerson: 'N/A', phone: '', email: '', address: '',
                        isActive: true, isArchived: false,
                        createdAt: serverTimestamp(), updatedAt: serverTimestamp()
                    }
                    const docRef = await addDoc(collection(db, 'suppliers'), supplierData)
                    finalSupplierId = docRef.id
                    finalSupplierName = trimmedNewName
                }
            }

            const { newSupplierName, ...cleanForm } = form
            const enteredThreshold = Number(cleanForm.lowStockThreshold)
            const data = {
                ...cleanForm,
                supplierId: finalSupplierId,
                supplierName: finalSupplierName,
                price: Number(cleanForm.price),
                cost: Number(cleanForm.cost) || 0,
                stock: Number(cleanForm.stock),
                lowStockThreshold: Number.isFinite(enteredThreshold) ? enteredThreshold : defaultThreshold,
                imageUrl,
                businessType: businessType, // Bind product to settings businessType
                updatedAt: serverTimestamp()
            }

            if (editing) {
                await updateDoc(doc(db, 'products', editing.id), data)
                toast.success('Product updated!')
            } else {
                await addDoc(collection(db, 'products'), { ...data, createdAt: serverTimestamp() })
                
                // If resolving an intelligent product recommendation, mark it approved
                if (activeRecoId) {
                    await updateDoc(doc(db, 'recommendations', activeRecoId), { status: 'approved' })
                    toast.success('Acquisition request approved and item registered!')
                } else {
                    toast.success('Product added!')
                }
            }
            setModalOpen(false)
            setActiveRecoId(null)
        } catch (err) {
            toast.error('Failed to save product.')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id) => {
        try {
            await deleteDoc(doc(db, 'products', id))
            toast.success('Product deleted.')
            setDeleteId(null)
        } catch {
            toast.error('Failed to delete.')
        }
    }

    const handleArchive = async () => {
        if (!archiveId) return
        try {
            await updateDoc(doc(db, 'products', archiveId.id), { isArchived: !archiveId.isArchived })
            toast.success(archiveId.isArchived ? 'Product restored.' : 'Product archived.')
            setArchiveId(null)
        } catch {
            toast.error('Failed to update archive status.')
        }
    }

    const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

    const getExampleSupplier = (p, catName) => {
        if (p.supplierName && p.supplierName.trim()) return p.supplierName
        return 'Mega SME Distributors'
    }

    // Determine if an InventaAPI product is NEW to the customer
    const isNewInventaProduct = (product) => {
        // Only apply to InventaAPI products
        if (product.source !== 'inventa') return false
        
        // Must have a valid availableToConsumerSince timestamp
        if (!product.availableToConsumerSince) return false
        
        try {
            const availableDate = new Date(product.availableToConsumerSince)
            const now = new Date()
            
            // Consider "NEW" if made available within the last 30 days
            const daysDiff = (now - availableDate) / (1000 * 60 * 60 * 24)
            return daysDiff >= 0 && daysDiff <= 30
        } catch (err) {
            // Invalid date format
            return false
        }
    }

    const pendingRecos = recommendations.filter(r => r.status === 'pending')

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        Inventory 
                        <span style={{ fontSize: '0.8rem', padding: '4px 10px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 12, color: '#818cf8', textTransform: 'capitalize' }}>
                            {businessType} Profile
                        </span>
                    </h1>
                    <p className="page-subtitle">
                        {products.length} local products
                        {!inventaLoading && inventaProducts.length > 0 && ` · ${inventaProducts.length} InventaAPI products`}
                        {inventaLoading && ` · Loading InventaAPI...`}
                        {inventaError && ` · InventaAPI unavailable`}
                        {` · ${categories.length} categories`}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button className="btn" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 8, padding: '8px 16px', fontWeight: 600 }}>
                        <Upload size={16} /> Import
                    </button>
                    <button id="add-product-btn" className="btn btn-primary" onClick={openAdd}>
                        <Plus size={16} /> Add Product
                    </button>
                </div>
            </div>

            {/* Intelligent Product Acquisition Alert Banner */}
            {pendingRecos.length > 0 && !showRecommendations && (
                <div className="glass-card animate-pulse" style={{ padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(99, 102, 241, 0.4)', background: 'rgba(99, 102, 241, 0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Lightbulb size={20} style={{ color: '#818cf8' }} />
                        <div>
                            <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>Intelligent Product Recommendations Pending ({pendingRecos.length})</strong>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Cashiers have scanned unregistered barcodes and recommended adding them to stock.</p>
                        </div>
                    </div>
                    <button className="btn btn-primary btn-sm" style={{ background: '#6366F1' }} onClick={() => setShowRecommendations(true)}>
                        Review Requests
                    </button>
                </div>
            )}

            {/* Recommendations Interface Mode */}
            {showRecommendations ? (
                <div className="glass-card" style={{ padding: 24, marginBottom: 24, border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Lightbulb size={20} style={{ color: '#6366F1' }} />
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Product Acquisition Recommendations</h3>
                        </div>
                        <button className="btn btn-secondary btn-sm" onClick={() => setShowRecommendations(false)}>
                            Back to Inventory List
                        </button>
                    </div>

                    {pendingRecos.length === 0 ? (
                        <p style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>No pending product acquisition requests from cashier scans.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {pendingRecos.map(reco => (
                                <div key={reco.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: 12 }}>
                                    <div>
                                        <h4 style={{ margin: '0 0 4px', fontSize: '0.95rem', fontWeight: 700 }}>{reco.suggestedName}</h4>
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            Barcode: <strong style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{reco.barcode}</strong> • 
                                            Submitted by: <span style={{ color: 'var(--text-secondary)' }}>{reco.submittedBy}</span> • 
                                            Sector: <span style={{ textTransform: 'capitalize', color: 'var(--accent)' }}>{reco.businessType}</span>
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button className="btn btn-secondary btn-sm" onClick={() => handleRejectRecommendation(reco.id)}>
                                            Ignore
                                        </button>
                                        <button className="btn btn-primary btn-sm" style={{ background: '#6366F1' }} onClick={() => handleEnrollRecommendation(reco)}>
                                            Enroll in Inventory
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : null}

            {/* Filters */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
                    <Search size={15} className="search-icon" />
                    <input id="product-search" className="form-input" placeholder="Search by name, barcode, SKU…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="form-select" style={{ width: 180 }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
                    <option value="all">All Categories</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select className="form-select" style={{ width: 160 }} value={viewMode} onChange={e => setViewMode(e.target.value)}>
                    <option value="all">All Products</option>
                    <option value="local">Local Only</option>
                    <option value="inventa">InventaAPI Only</option>
                    <option value="new-inventa">New from InventaAPI</option>
                </select>
                {inventaError && (
                    <button onClick={loadInventaProducts} className="btn" style={{ background: 'var(--warning-bg)', color: 'var(--warning)', border: '1px solid var(--warning-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <RefreshCw size={14} /> Retry InventaAPI
                    </button>
                )}
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', color: 'var(--text-secondary)', cursor: 'pointer', marginLeft: 'auto' }}>
                    <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} style={{ width: 16, height: 16 }} />
                    Show Archived
                </label>
            </div>

            {/* InventaAPI Status */}
            {inventaLoading && (
                <div style={{ padding: '12px 16px', marginBottom: 16, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>Loading InventaAPI products...</span>
                </div>
            )}
            {inventaError && (
                <div style={{ padding: '12px 16px', marginBottom: 16, background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Database size={16} style={{ color: 'var(--danger)' }} />
                        <strong style={{ fontSize: '0.9rem', color: 'var(--danger)' }}>InventaAPI Connection Failed</strong>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--danger)' }}>{inventaError}</p>
                </div>
            )}
            {!inventaLoading && !inventaError && inventaProducts.length > 0 && (
                <div style={{ padding: '12px 16px', marginBottom: 16, background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <CheckCircle size={16} style={{ color: 'var(--success)' }} />
                    <span style={{ fontSize: '0.9rem', color: 'var(--success)' }}>
                        {inventaProducts.length} InventaAPI product{inventaProducts.length !== 1 ? 's' : ''} loaded
                    </span>
                </div>
            )}

            {/* Table */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', width: '100%', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 800 }}>
                    <thead style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                        <tr>
                            <th style={{ padding: '16px 24px', fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', width: 60 }}>No.</th>
                            <th style={{ padding: '16px 24px', fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Product Code</th>
                            <th style={{ padding: '16px 24px', fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Item Name</th>
                            <th style={{ padding: '16px 24px', fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</th>
                            <th style={{ padding: '16px 24px', fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Supplier</th>
                            <th style={{ padding: '16px 24px', fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stock Level</th>
                            <th style={{ padding: '16px 24px', fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Price</th>
                            <th style={{ padding: '16px 24px', fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', width: 140 }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(() => {
                            // Combine local and inventa products
                            let allProducts = []
                            
                            // Add local Firebase products with source indicator
                            if (viewMode === 'all' || viewMode === 'local') {
                                const localProducts = products.map(p => ({ ...p, source: 'local' }))
                                allProducts = [...allProducts, ...localProducts]
                            }
                            
                            // Add InventaAPI products with source indicator
                            if (viewMode === 'all' || viewMode === 'inventa' || viewMode === 'new-inventa') {
                                const inventaProductsWithSource = inventaProducts.map(p => ({ 
                                    ...p, 
                                    source: 'inventa',
                                    // Normalize field names for consistent display
                                    name: p.name || p.productName || p.title || 'Unknown Product',
                                    price: p.price || p.unitPrice || p.cost || 0,
                                    stock: p.stock !== undefined ? p.stock : (p.quantity !== undefined ? p.quantity : 0),
                                    sku: p.sku || p.productCode || p.code || '',
                                    categoryId: p.categoryId || p.category || '',
                                    supplierId: p.supplierId || '',
                                    supplierName: p.supplierName || p.brand || 'InventaAPI',
                                    isActive: true,
                                    isArchived: false,
                                    unit: p.unit || 'pcs'
                                }))
                                
                                // Filter for new products if in new-inventa mode
                                const filteredInventaProducts = viewMode === 'new-inventa' 
                                    ? inventaProductsWithSource.filter(p => isNewInventaProduct(p))
                                    : inventaProductsWithSource
                                
                                allProducts = [...allProducts, ...filteredInventaProducts]
                            }
                            
                            // Filter products
                            const filtered = allProducts.filter(p => {
                                const matchesSearch = !search || [
                                    p.name, p.sku, p.barcodeNumber, p.description
                                ].some(field => field && field.toString().toLowerCase().includes(search.toLowerCase()))
                                
                                const matchesCategory = filterCat === 'all' || p.categoryId === filterCat
                                const matchesArchived = showArchived ? true : !p.isArchived
                                
                                return matchesSearch && matchesCategory && matchesArchived
                            })
                            
                            // Sort: local products first, then InventaAPI products
                            filtered.sort((a, b) => {
                                if (a.source === 'local' && b.source === 'inventa') return -1
                                if (a.source === 'inventa' && b.source === 'local') return 1
                                return 0
                            })
                            
                            // Pagination
                            const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
                            const start = (currentPage - 1) * PAGE_SIZE
                            const paginated = filtered.slice(start, start + PAGE_SIZE)
                            
                            return paginated.map((p, idx) => {
                                const rowNumber = start + idx + 1
                                const catName = categories.find(c => c.id === p.categoryId)?.name || p.categoryName || 'Uncategorized'
                                const stockData = getStockStatus(p.stock || 0, p.lowStockThreshold || defaultThreshold)
                                
                                return (
                                    <tr key={`${p.source}-${p.id}`} style={{ 
                                        background: p.source === 'inventa' ? 'rgba(14, 165, 233, 0.03)' : 'transparent',
                                        borderBottom: '1px solid var(--border-light)',
                                        ...(highlightId === p.id ? { background: 'rgba(99, 102, 241, 0.1)', animation: 'pulse 2s' } : {})
                                    }} 
                                    ref={highlightId === p.id ? highlightedRowRef : null}
                                    >
                                        <td style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{rowNumber}</td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <div style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                                {p.barcodeNumber || p.sku || p.id.substring(0, 8)}
                                                {p.source === 'inventa' && (
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 600, marginTop: 2 }}>
                                                        <Database size={10} style={{ display: 'inline', marginRight: 4 }} />
                                                        InventaAPI
                                                    </div>
                                                )}
                                            </div>
                                            {p.size && (
                                                <div style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600, marginTop: 2 }}>
                                                    {businessType === 'hardware' && 'Size: '}
                                                    {businessType === 'pharmacy' && 'Dosage: '}
                                                    {businessType === 'grocery' && 'Vol/Weight: '}
                                                    {businessType === 'retail' && 'Sizing: '}
                                                    {p.size}
                                                </div>
                                            )}
                                            {p.capacity && (
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>
                                                    Spec: {p.capacity}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                {p.imageUrl ? (
                                                    <img src={p.imageUrl} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
                                                ) : (
                                                    <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Package size={20} color="var(--text-muted)" />
                                                    </div>
                                                )}
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{p.name}</p>
                                                        {isNewInventaProduct(p) && (
                                                            <span style={{ 
                                                                fontSize: '0.65rem', 
                                                                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', 
                                                                color: 'white', 
                                                                padding: '2px 6px', 
                                                                borderRadius: 10, 
                                                                fontWeight: 700, 
                                                                textTransform: 'uppercase', 
                                                                letterSpacing: '0.05em',
                                                                boxShadow: '0 1px 3px rgba(16, 185, 129, 0.3)'
                                                            }}>
                                                                NEW
                                                            </span>
                                                        )}
                                                    </div>
                                                    {p.isArchived && <span style={{ fontSize: '0.65rem', background: 'var(--danger-bg)', color: 'var(--danger)', padding: '2px 6px', borderRadius: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Archived</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{catName}</td>
                                        <td style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                                                {getExampleSupplier(p, catName)}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>{p.stock || 0} {p.unit || 'pcs'}</span>
                                                <span style={{ fontSize: '0.75rem', background: stockData.bg, color: stockData.color, padding: '3px 8px', borderRadius: 12, fontWeight: 700 }}>{stockData.label}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <p style={{ margin: 0, fontWeight: 800, color: 'var(--accent)', fontSize: '0.95rem' }}>{formatCurrency(p.price || 0)}</p>
                                        </td>
                                        <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                            {p.source === 'local' ? (
                                                <div style={{ display: 'inline-flex', gap: 8 }}>
                                                    <button onClick={() => openBarcodeModal(p)} title="Generate Barcode" style={{ 
                                                        width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                                        background: 'linear-gradient(145deg, #1d4ed8 0%, #1e40af 100%)', border: '1px solid #3b82f6', color: '#ffffff', borderRadius: 6,
                                                        boxShadow: '0 2px 8px rgba(29,78,216,0.3)', transition: 'transform 0.15s'
                                                    }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                                                        {barcodeLoading ? '…' : <BarcodeIcon size={15} />}
                                                    </button>

                                                    <button onClick={() => openEdit(p)} title="Edit" style={{ 
                                                        width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                                        background: '#064e3b', border: '1px solid #65a30d', color: '#bef264', borderRadius: 6,
                                                        boxShadow: '0 2px 8px rgba(6,78,59,0.3)', transition: 'transform 0.15s'
                                                    }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                                                        <Edit2 size={15} />
                                                    </button>

                                                    <button onClick={() => setArchiveId(p)} title={p.isArchived ? "Restore" : "Archive"} style={{ 
                                                        width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                                        background: '#1e293b', border: '1px solid #475569', color: '#cbd5e1', borderRadius: 6,
                                                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)', transition: 'transform 0.15s'
                                                    }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                                                        {p.isArchived ? <RefreshCw size={15} /> : <Archive size={15} />}
                                                    </button>

                                                    <button onClick={() => setDeleteId(p.id)} title="Delete forever" style={{ 
                                                        width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                                        background: '#7f1d1d', border: '1px solid #dc2626', color: '#fca5a5', borderRadius: 6,
                                                        boxShadow: '0 2px 8px rgba(127,29,29,0.3)', transition: 'transform 0.15s'
                                                    }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                                    Read-only (InventaAPI)
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })
                        })()}
                        {(() => {
                            // Check if we should show the empty state
                            let allProducts = []
                            if (viewMode === 'all' || viewMode === 'local') {
                                allProducts = [...allProducts, ...products]
                            }
                            if (viewMode === 'all' || viewMode === 'inventa' || viewMode === 'new-inventa') {
                                let inventaToAdd = inventaProducts
                                if (viewMode === 'new-inventa') {
                                    inventaToAdd = inventaProducts.filter(p => isNewInventaProduct({...p, source: 'inventa'}))
                                }
                                allProducts = [...allProducts, ...inventaToAdd]
                            }
                            
                            const filtered = allProducts.filter(p => {
                                const matchesSearch = !search || [
                                    p.name, p.sku, p.barcodeNumber, p.description
                                ].some(field => field && field.toString().toLowerCase().includes(search.toLowerCase()))
                                
                                const matchesCategory = filterCat === 'all' || p.categoryId === filterCat
                                const matchesArchived = showArchived ? true : !p.isArchived
                                
                                return matchesSearch && matchesCategory && matchesArchived
                            })
                            
                            const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
                            const start = (currentPage - 1) * PAGE_SIZE
                            const paginated = filtered.slice(start, start + PAGE_SIZE)
                            
                            if (paginated.length === 0) {
                                return (
                                    <tr>
                                        <td colSpan="8" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                                            {inventaLoading ? 'Loading InventaAPI products...' : 
                                             inventaError ? `InventaAPI Error: ${inventaError}` :
                                             'No products found. Add a product or clear your search filters.'}
                                        </td>
                                    </tr>
                                )
                            }
                            return null
                        })()}
                    </tbody>
                </table>
                {(() => {
                    // Calculate pagination for display
                    let allProducts = []
                    if (viewMode === 'all' || viewMode === 'local') {
                        allProducts = [...allProducts, ...products]
                    }
                    if (viewMode === 'all' || viewMode === 'inventa' || viewMode === 'new-inventa') {
                        let inventaToAdd = inventaProducts
                        if (viewMode === 'new-inventa') {
                            inventaToAdd = inventaProducts.filter(p => isNewInventaProduct({...p, source: 'inventa'}))
                        }
                        allProducts = [...allProducts, ...inventaToAdd]
                    }
                    
                    const filtered = allProducts.filter(p => {
                        const matchesSearch = !search || [
                            p.name, p.sku, p.barcodeNumber, p.description
                        ].some(field => field && field.toString().toLowerCase().includes(search.toLowerCase()))
                        
                        const matchesCategory = filterCat === 'all' || p.categoryId === filterCat
                        const matchesArchived = showArchived ? true : !p.isArchived
                        
                        return matchesSearch && matchesCategory && matchesArchived
                    })
                    
                    const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
                    
                    return <Pagination 
                        currentPage={currentPage} 
                        totalPages={totalPages} 
                        totalItems={filtered.length} 
                        pageSize={PAGE_SIZE} 
                        onPageChange={setCurrentPage} 
                    />
                })()}
            </div>

            {/* Product Modal */}
            <AnimatePresence>
                {modalOpen && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.div className="modal" style={{ maxWidth: 640 }}
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
                            <div className="modal-header">
                                <span className="modal-title">
                                    {editing ? 'Edit Product' : activeRecoId ? 'Enroll Recommended Product' : 'Add New Product'}
                                </span>
                                <button className="chat-icon-btn" onClick={() => setModalOpen(false)}><X size={18} /></button>
                            </div>
                            <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

                                <div className="form-group">
                                    <label className="form-label">Product Name *</label>
                                    <input id="product-name-input" className="form-input" value={form.name} onChange={e => setField('name', e.target.value)} placeholder="e.g. Flat Screwdriver, Paracetamol, Soy Sauce" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Barcode Number (EAN/UPC)</label>
                                    <input className="form-input" value={form.barcodeNumber || ''} onChange={e => setField('barcodeNumber', e.target.value)} placeholder="e.g. 4800016552109" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">SKU</label>
                                    <input className="form-input" value={form.sku} onChange={e => setField('sku', e.target.value)} placeholder="e.g. HW-001" />
                                </div>
                                
                                {/* Dynamic variation fields based on the businessType */}
                                <div className="form-group">
                                    <label className="form-label">
                                        {businessType === 'hardware' && 'Dimensions / Sizing'}
                                        {businessType === 'pharmacy' && 'Dosage Strength (mg, ml)'}
                                        {businessType === 'grocery' && 'Net Volume / Weight'}
                                        {businessType === 'retail' && 'Size Option (S, M, L)'}
                                    </label>
                                    <input className="form-input" value={form.size || ''} onChange={e => setField('size', e.target.value)} placeholder="e.g. 12mm x 6m, 500mg, 1L, Medium" />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">
                                        {businessType === 'hardware' && 'Steel Grade / Brand Specification'}
                                        {businessType === 'pharmacy' && 'Formulation / Brand Classification'}
                                        {businessType === 'grocery' && 'Packaging (PET Bottle, Box, Can)'}
                                        {businessType === 'retail' && 'Color / Style Variation'}
                                    </label>
                                    <input className="form-input" value={form.capacity || ''} onChange={e => setField('capacity', e.target.value)} placeholder="e.g. Grade 40, Tablet, PET Bottle, Red" />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Category</label>
                                    <select className="form-select" value={form.categoryId} onChange={e => setField('categoryId', e.target.value)}>
                                        <option value="">Select category</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Unit</label>
                                    <select className="form-select" value={form.unit} onChange={e => setField('unit', e.target.value)}>
                                        {['pcs', 'kg', 'liters', 'meters', 'box', 'roll', 'bag', 'set', 'tablet', 'capsule'].map(u => <option key={u}>{u}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Price (₱) *</label>
                                    <input id="product-price-input" className="form-input" type="number" min="0" value={form.price} onChange={e => setField('price', e.target.value)} placeholder="0.00" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Current Stock *</label>
                                    <input id="product-stock-input" className="form-input" type="number" min="0" value={form.stock} onChange={e => setField('stock', e.target.value)} placeholder="0" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Low Stock Threshold</label>
                                    <input className="form-input" type="number" min="0" value={form.lowStockThreshold} onChange={e => setField('lowStockThreshold', e.target.value)} placeholder={defaultThreshold} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Supplier</label>
                                    <select className="form-select" value={form.supplierId || ''} onChange={e => {
                                        const selId = e.target.value
                                        if (selId === 'new') {
                                            setField('supplierId', 'new')
                                            setField('supplierName', '')
                                        } else {
                                            const found = suppliers.find(s => s.id === selId)
                                            setField('supplierId', selId)
                                            setField('supplierName', found ? found.name : '')
                                        }
                                    }}>
                                        <option value="">Select supplier</option>
                                        {suppliers.filter(s => !s.isArchived).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        <option value="new" style={{ color: 'var(--accent)', fontWeight: 'bold' }}>+ Create New Supplier...</option>
                                    </select>
                                </div>
                                {form.supplierId === 'new' && (
                                    <div className="form-group" style={{ gridColumn: '1/-1' }}>
                                        <label className="form-label">New Supplier Name *</label>
                                        <input className="form-input" value={form.newSupplierName || ''} onChange={e => setField('newSupplierName', e.target.value)} placeholder="Enter new supplier company name" />
                                    </div>
                                )}
                                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                                    <label className="form-label">Description</label>
                                    <textarea className="form-textarea" value={form.description} onChange={e => setField('description', e.target.value)} placeholder="Optional product description…" />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                                <button id="save-product-btn" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                                    {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Product'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Delete Confirm */}
            <AnimatePresence>
                {deleteId && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.div className="modal" style={{ maxWidth: 400 }}
                            initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
                            <div className="modal-header">
                                <span className="modal-title">Delete Product</span>
                                <button className="chat-icon-btn" onClick={() => setDeleteId(null)}><X size={18} /></button>
                            </div>
                            <div className="modal-body">
                                <p style={{ color: 'var(--text-secondary)' }}>This action cannot be undone. Are you sure you want to delete this product?</p>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
                                <button id="confirm-delete-btn" className="btn btn-danger" onClick={() => handleDelete(deleteId)}>Delete</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Barcode Modal */}
            <AnimatePresence>
                {qrProduct && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setQrProduct(null)}>
                        <motion.div
                            style={{ maxWidth: 440, width: '100%' }}
                            className="modal"
                            initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.88, opacity: 0 }}
                            onClick={e => e.stopPropagation()}>

                            <div className="modal-header">
                                <span className="modal-title" style={{ fontSize: '1rem', lineHeight: 1.4 }}>
                                    Barcode — {qrProduct.name}
                                </span>
                                <button className="chat-icon-btn" onClick={() => setQrProduct(null)}><X size={18} /></button>
                            </div>

                            <div className="modal-body" style={{ alignItems: 'center', gap: 16 }}>
                                <div id={`barcode-print-area-${qrProduct.id}`} style={{
                                    background: '#ffffff',
                                    borderRadius: 16,
                                    padding: '24px 28px 24px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 16,
                                    width: '100%',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                                        <Barcode
                                            value={qrProduct.barcodeNumber || qrProduct.id}
                                            options={{
                                                width: 2.5,
                                                height: 75,
                                                margin: 8
                                            }}
                                        />
                                    </div>
                                    <div style={{ textAlign: 'center', borderTop: '1px solid #e2e8f0', paddingTop: 12, width: '100%' }}>
                                        <p style={{ color: '#0f172a', fontSize: '1rem', fontWeight: 800, margin: '0 0 4px', lineHeight: 1.3 }}>
                                            {qrProduct.name}
                                        </p>
                                        {qrProduct.price && (
                                            <p style={{ color: '#1d4ed8', fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>
                                                ₱{Number(qrProduct.price).toLocaleString()}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', textAlign: 'center', margin: 0, lineHeight: 1.6 }}>
                                    Barcode No.: <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)', fontSize: '0.9rem', letterSpacing: '2px' }}>{qrProduct.barcodeNumber || qrProduct.id}</strong><br/>
                                    Type this number manually at POS if scanner is unavailable.
                                </p>
                            </div>

                            <div className="modal-footer">
                                <button className="btn btn-secondary" style={{ gap: 8 }} onClick={() => {
                                    const el = document.getElementById(`barcode-print-area-${qrProduct.id}`)
                                    const win = window.open('', '', 'width=500,height=500')
                                    win.document.write(`<html><head><title>Print Barcode</title><style>@media print{*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#fff}</style></head><body>`)
                                    win.document.write(el.outerHTML)
                                    win.document.write('</body></html>')
                                    win.document.close()
                                    setTimeout(() => { win.print(); win.close() }, 500)
                                }}>
                                    <Printer size={15} /> Print Barcode
                                </button>
                                <button className="btn btn-primary" style={{ gap: 8, background: 'linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 100%)', border: 'none', boxShadow: '0 4px 14px rgba(14,165,233,0.35)' }} onClick={() => {
                                    const canvasEl = document.querySelector(`#barcode-print-area-${qrProduct.id} canvas`)
                                    if (!canvasEl) return toast.error('Could not generate Barcode image.')
                                    const bnum = qrProduct.barcodeNumber || qrProduct.id
                                    const out = document.createElement('canvas')
                                    out.width = 340; out.height = 300
                                    const ctx = out.getContext('2d')
                                    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 340, 300)
                                    const bW = Math.min(canvasEl.width, 300)
                                    const bH = Math.round(bW * canvasEl.height / canvasEl.width)
                                    const bX = (340 - bW) / 2
                                    ctx.drawImage(canvasEl, bX, 20, bW, bH)
                                    const nameY = 20 + bH + 18
                                    ctx.fillStyle = '#0f172a'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'
                                    ctx.fillText(qrProduct.name.substring(0, 40), 170, nameY)
                                    if (qrProduct.price) { ctx.fillStyle = '#1d4ed8'; ctx.font = 'bold 13px sans-serif'; ctx.fillText(`₱${Number(qrProduct.price).toLocaleString()}`, 170, nameY + 22) }
                                    const a = document.createElement('a')
                                    a.download = `barcode-${bnum}.png`
                                    a.href = out.toDataURL('image/png')
                                    a.click()
                                }}>
                                    <Download size={15} /> Download PNG
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
                                <span className="modal-title">{archiveId.isArchived ? 'Restore Product' : 'Archive Product'}</span>
                                <button className="chat-icon-btn" onClick={() => setArchiveId(null)}><X size={18} /></button>
                            </div>
                            <div className="modal-body">
                                <p style={{ color: 'var(--text-secondary)' }}>
                                    {archiveId.isArchived 
                                        ? "Are you sure you want to restore this product?" 
                                        : "Are you sure you want to archive this product?"}
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
