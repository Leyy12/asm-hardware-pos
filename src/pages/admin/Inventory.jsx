import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    collection, onSnapshot, addDoc, updateDoc, deleteDoc,
    doc, serverTimestamp, getDocs
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../../firebase'
import { formatCurrency, getStockStatus, exportToCSV } from '../../utils/helpers'
import { Plus, Search, Edit2, Trash2, Download, X, Upload, Package, QrCode } from 'lucide-react'
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react'
import toast from 'react-hot-toast'

const emptyProduct = {
    name: '', sku: '', categoryId: '', price: '', cost: '',
    stock: '', lowStockThreshold: 5, unit: 'pcs', description: '', isActive: true
}

export default function Inventory() {
    const [products, setProducts] = useState([])
    const [categories, setCategories] = useState([])
    const [search, setSearch] = useState('')
    const [filterCat, setFilterCat] = useState('all')
    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState(null)
    const [form, setForm] = useState(emptyProduct)
    const [imgFile, setImgFile] = useState(null)
    const [imgPreview, setImgPreview] = useState('')
    const [saving, setSaving] = useState(false)
    const [deleteId, setDeleteId] = useState(null)
    const [qrProduct, setQrProduct] = useState(null)

    useEffect(() => {
        const unsub1 = onSnapshot(collection(db, 'products'), snap =>
            setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        )
        const unsub2 = onSnapshot(collection(db, 'categories'), snap =>
            setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        )
        return () => { unsub1(); unsub2() }
    }, [])

    const filtered = products.filter(p => {
        const matchSearch = p.name?.toLowerCase().includes(search.toLowerCase()) ||
            p.sku?.toLowerCase().includes(search.toLowerCase())
        const matchCat = filterCat === 'all' || p.categoryId === filterCat
        return matchSearch && matchCat
    })

    const openAdd = () => {
        setEditing(null)
        setForm(emptyProduct)
        setImgFile(null)
        setImgPreview('')
        setModalOpen(true)
    }

    const openEdit = (p) => {
        setEditing(p)
        setForm({ ...p })
        setImgPreview(p.imageUrl || '')
        setImgFile(null)
        setModalOpen(true)
    }

    const handleImgChange = (e) => {
        const file = e.target.files[0]
        if (!file) return
        setImgFile(file)
        setImgPreview(URL.createObjectURL(file))
    }

    const handleSave = async () => {
        if (!form.name || !form.price || !form.stock) {
            return toast.error('Name, price, and stock are required.')
        }
        setSaving(true)
        try {
            let imageUrl = form.imageUrl || ''
            if (imgFile) {
                const storageRef = ref(storage, `products/${Date.now()}_${imgFile.name}`)
                await uploadBytes(storageRef, imgFile)
                imageUrl = await getDownloadURL(storageRef)
            }

            const data = {
                ...form,
                price: Number(form.price),
                cost: Number(form.cost) || 0,
                stock: Number(form.stock),
                lowStockThreshold: Number(form.lowStockThreshold) || 5,
                imageUrl,
                updatedAt: serverTimestamp()
            }

            if (editing) {
                await updateDoc(doc(db, 'products', editing.id), data)
                toast.success('Product updated!')
            } else {
                await addDoc(collection(db, 'products'), { ...data, createdAt: serverTimestamp() })
                toast.success('Product added!')
            }
            setModalOpen(false)
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

    const handleExport = () => {
        const data = filtered.map(p => ({
            Name: p.name, SKU: p.sku,
            Category: categories.find(c => c.id === p.categoryId)?.name || '',
            Price: p.price, Cost: p.cost, Stock: p.stock,
            LowStockThreshold: p.lowStockThreshold, Unit: p.unit
        }))
        exportToCSV(data, 'inventory')
    }

    const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Inventory</h1>
                    <p className="page-subtitle">{products.length} products · {categories.length} categories</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button id="export-csv-btn" className="btn btn-secondary" onClick={handleExport}>
                        <Download size={16} /> Export CSV
                    </button>
                    <button id="add-product-btn" className="btn btn-primary" onClick={openAdd}>
                        <Plus size={16} /> Add Product
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
                    <Search size={15} className="search-icon" />
                    <input id="product-search" className="form-input" placeholder="Search by name or SKU…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="form-select" style={{ width: 180 }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
                    <option value="all">All Categories</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>

            {/* Table */}
            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>SKU</th>
                            <th>Category</th>
                            <th>Price</th>
                            <th>Stock</th>
                            <th>Status</th>
                            <th style={{ width: 130 }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 && (
                            <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No products found.</td></tr>
                        )}
                        {filtered.map(p => {
                            const status = getStockStatus(p.stock, p.lowStockThreshold)
                            const cat = categories.find(c => c.id === p.categoryId)
                            return (
                                <tr key={p.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            {p.imageUrl
                                                ? <img src={p.imageUrl} alt={p.name} style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} />
                                                : <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={16} style={{ color: 'var(--text-muted)' }} /></div>
                                            }
                                            <span style={{ fontWeight: 600 }}>{p.name}</span>
                                        </div>
                                    </td>
                                    <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.8rem' }}>{p.sku || '—'}</td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{cat?.name || '—'}</td>
                                    <td style={{ fontWeight: 700, color: 'var(--accent-hover)' }}>{formatCurrency(p.price)}</td>
                                    <td style={{ fontWeight: 600 }}>{p.stock} {p.unit}</td>
                                    <td><span className={`badge badge-${status.variant}`}>{status.label}</span></td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button id={`qr-product-${p.id}`} className="btn btn-secondary btn-sm btn-icon" onClick={() => setQrProduct(p)} title="View QR Code">
                                                <QrCode size={14} />
                                            </button>
                                            <button id={`edit-product-${p.id}`} className="btn btn-secondary btn-sm btn-icon" onClick={() => openEdit(p)} title="Edit">
                                                <Edit2 size={14} />
                                            </button>
                                            <button id={`delete-product-${p.id}`} className="btn btn-danger btn-sm btn-icon" onClick={() => setDeleteId(p.id)} title="Delete">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Product Modal */}
            <AnimatePresence>
                {modalOpen && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.div className="modal" style={{ maxWidth: 640 }}
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
                            <div className="modal-header">
                                <span className="modal-title">{editing ? 'Edit Product' : 'Add New Product'}</span>
                                <button className="chat-icon-btn" onClick={() => setModalOpen(false)}><X size={18} /></button>
                            </div>
                            <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                {/* Image upload */}
                                <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: 16 }}>
                                    <div style={{ width: 80, height: 80, borderRadius: 12, overflow: 'hidden', background: 'var(--bg-elevated)', border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        {imgPreview ? <img src={imgPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="preview" />
                                            : <Package size={24} style={{ color: 'var(--text-muted)' }} />}
                                    </div>
                                    <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                                        <Upload size={14} /> Upload Image
                                        <input type="file" accept="image/*" onChange={handleImgChange} style={{ display: 'none' }} />
                                    </label>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Product Name *</label>
                                    <input id="product-name-input" className="form-input" value={form.name} onChange={e => setField('name', e.target.value)} placeholder="e.g. Flat Screwdriver" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">SKU</label>
                                    <input className="form-input" value={form.sku} onChange={e => setField('sku', e.target.value)} placeholder="e.g. HW-001" />
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
                                        {['pcs', 'kg', 'liters', 'meters', 'box', 'roll', 'bag', 'set'].map(u => <option key={u}>{u}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Selling Price (₱) *</label>
                                    <input id="product-price-input" className="form-input" type="number" min="0" value={form.price} onChange={e => setField('price', e.target.value)} placeholder="0.00" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Cost Price (₱)</label>
                                    <input className="form-input" type="number" min="0" value={form.cost} onChange={e => setField('cost', e.target.value)} placeholder="0.00" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Current Stock *</label>
                                    <input id="product-stock-input" className="form-input" type="number" min="0" value={form.stock} onChange={e => setField('stock', e.target.value)} placeholder="0" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Low Stock Threshold</label>
                                    <input className="form-input" type="number" min="0" value={form.lowStockThreshold} onChange={e => setField('lowStockThreshold', e.target.value)} placeholder="5" />
                                </div>
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
            {/* QR Code Modal */}
            <AnimatePresence>
                {qrProduct && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setQrProduct(null)}>
                        <motion.div className="modal" style={{ maxWidth: 380, textAlign: 'center' }}
                            initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }}
                            onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <span className="modal-title">QR Code — {qrProduct.name}</span>
                                <button className="chat-icon-btn" onClick={() => setQrProduct(null)}><X size={18} /></button>
                            </div>
                            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                                <div id={`qr-print-area-${qrProduct.id}`} style={{ padding: 16, background: 'white', borderRadius: 12, border: '1px solid var(--border)' }}>
                                    <QRCodeSVG
                                        value={qrProduct.sku || qrProduct.id}
                                        size={200}
                                        bgColor="#ffffff"
                                        fgColor="#1e293b"
                                        level="H"
                                        includeMargin={true}
                                    />
                                    <p style={{ fontFamily: 'monospace', fontSize: '0.8rem', marginTop: 8, color: 'var(--text-secondary)' }}>
                                        {qrProduct.sku || qrProduct.id}
                                    </p>
                                    <p style={{ fontWeight: 700, fontSize: '0.85rem' }}>{qrProduct.name}</p>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{qrProduct.price ? `₱${Number(qrProduct.price).toLocaleString()}` : ''}</p>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', maxWidth: 280 }}>
                                    This QR encodes: <strong style={{ fontFamily: 'monospace' }}>{qrProduct.sku || qrProduct.id}</strong>. Scan with the POS Camera Scanner to add to cart instantly.
                                </div>
                            </div>
                            <div className="modal-footer" style={{ justifyContent: 'center', gap: 10 }}>
                                <button className="btn btn-secondary" onClick={() => {
                                    const el = document.getElementById(`qr-print-area-${qrProduct.id}`)
                                    const orig = document.body.innerHTML
                                    document.body.innerHTML = el.outerHTML
                                    window.print()
                                    document.body.innerHTML = orig
                                    window.location.reload()
                                }}>
                                    🖨️ Print QR
                                </button>
                                <button className="btn btn-primary" onClick={() => {
                                    const canvas = document.createElement('canvas')
                                    canvas.width = 250; canvas.height = 290
                                    const ctx = canvas.getContext('2d')
                                    ctx.fillStyle = '#ffffff'
                                    ctx.fillRect(0, 0, 250, 290)
                                    const svgEl = document.querySelector(`#qr-print-area-${qrProduct.id} svg`)
                                    if (svgEl) {
                                        const svgStr = new XMLSerializer().serializeToString(svgEl)
                                        const img = new Image()
                                        img.onload = () => {
                                            ctx.drawImage(img, 0, 0, 250, 250)
                                            ctx.fillStyle = '#1e293b'
                                            ctx.font = 'bold 11px monospace'
                                            ctx.textAlign = 'center'
                                            ctx.fillText(qrProduct.sku || qrProduct.id, 125, 268)
                                            const a = document.createElement('a')
                                            a.download = `qr-${qrProduct.sku || qrProduct.id}.png`
                                            a.href = canvas.toDataURL('image/png')
                                            a.click()
                                        }
                                        img.src = 'data:image/svg+xml;base64,' + btoa(svgStr)
                                    } else {
                                        toast.error('Could not generate QR image.')
                                    }
                                }}>
                                    ⬇️ Download PNG
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
