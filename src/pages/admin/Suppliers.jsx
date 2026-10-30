import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import { 
    Plus, Search, Edit2, Trash2, X, Truck, Phone, Mail, MapPin, Eye, Archive, RefreshCw,
    ClipboardList, CheckCircle2, AlertTriangle, ArrowRight, Package, ShieldCheck, History, BookOpen
} from 'lucide-react'
import toast from 'react-hot-toast'
import Pagination from '../../components/common/Pagination'

const PAGE_SIZE = 10

const emptySupplier = {
    name: '', contactPerson: '', phone: '', email: '', address: '', isActive: true, isArchived: false
}

const FALLBACK_SUPPLIERS = [
    {
        name: 'XYZ Hardware & General Merchandise',
        contactPerson: 'Maria Santos',
        phone: '0928-444-8899',
        email: 'xyzhardware@gmail.com',
        address: 'Poblacion, Abra de Ilog, Occidental Mindoro',
        isActive: true,
        isArchived: false,
    },
    {
        name: 'Pacific Paints & Finishes Inc.',
        contactPerson: 'Juan Dela Cruz',
        phone: '0917-123-4567',
        email: 'sales@pacificpaints.ph',
        address: 'Quezon Avenue, Quezon City, Metro Manila',
        isActive: true,
        isArchived: false,
    }
]

// MOCK DATA FOR PROCUREMENT
const MOCK_LOW_STOCK = [
    { id: 'ls1', name: 'Mocha Blanch Paint (1L)', category: 'Paint', size: '1L', stock: 2, threshold: 10, supplier: 'Pacific Paints & Finishes Inc.', unit: 'pcs', orderQty: 24 },
    { id: 'ls2', name: 'PVC Pipe 1/2"', category: 'Plumbing', size: '1/2"', stock: 0, threshold: 20, supplier: 'XYZ Hardware & General Merchandise', unit: 'pcs', orderQty: 50 },
    { id: 'ls3', name: 'GI Wire Gauge 16', category: 'Hardware', size: 'Gauge 16', stock: 5, threshold: 30, supplier: 'BuildRight Construction Supply', unit: 'rolls', orderQty: 20 },
    { id: 'ls4', name: 'Sand Paper #80', category: 'Abrasives', size: '#80', stock: 3, threshold: 15, supplier: 'XYZ Hardware & General Merchandise', unit: 'sheets', orderQty: 100 },
]

let _counter = 1000
function nextPO() {
    const now = new Date()
    return {
        poNumber: `PO-${String(++_counter).padStart(4, '0')}`,
        dateCreated: now.toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        deliveredDate: null, completedDate: null,
        status: 'pending', receivedQty: null, notes: '',
    }
}

const STAGES = [
    { key: 'pending',   icon: ClipboardList, label: 'Purchase Order',            sublabel: 'Pending',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  desc: 'Order requested from supplier. Not yet counted in inventory.' },
    { key: 'receiving', icon: Truck,         label: 'Delivery / Receiving',       sublabel: 'In Transit', color: '#00b4d8', bg: 'rgba(0,180,216,0.1)',  desc: 'Items arrived. Verify actual quantity delivered against the PO.' },
    { key: 'completed', icon: History,       label: 'Supplier Transaction History', sublabel: 'Completed', color: '#10b981', bg: 'rgba(16,185,129,0.1)', desc: 'Delivery verified. Valid reference for inventory update.' },
]

export default function Suppliers() {
    // Top-level Tab State
    const [activeMainTab, setActiveMainTab] = useState('directory') // 'directory' | 'procurement'

    // ==========================================
    // 1. SUPPLIER DIRECTORY STATES & LOGIC
    // ==========================================
    const [suppliers, setSuppliers] = useState([])
    const [search, setSearch] = useState('')
    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState(null)
    const [form, setForm] = useState(emptySupplier)
    const [saving, setSaving] = useState(false)
    const [deleteId, setDeleteId] = useState(null)
    const [archiveId, setArchiveId] = useState(null)
    const [viewingSupplier, setViewingSupplier] = useState(null)
    const [showArchived, setShowArchived] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)

    const [fallbackSeeded, setFallbackSeeded] = useState(false)

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'suppliers'), snap => {
            setSuppliers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        })
        return () => unsub()
    }, [])

    useEffect(() => {
        if (fallbackSeeded || suppliers.length === 0) return
        const missing = FALLBACK_SUPPLIERS.filter(fb => !suppliers.some(s => s.name?.trim().toLowerCase() === fb.name.trim().toLowerCase()))
        if (missing.length === 0) {
            setFallbackSeeded(true)
            return
        }

        const seedMissing = async () => {
            for (const supplier of missing) {
                try {
                    await addDoc(collection(db, 'suppliers'), {
                        ...supplier,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    })
                } catch (err) {
                    console.error('Failed to seed supplier:', supplier.name, err)
                }
            }
            setFallbackSeeded(true)
        }
        seedMissing()
    }, [suppliers, fallbackSeeded])

    const [prevSearch, setPrevSearch] = useState(search)
    if (search !== prevSearch) {
        setPrevSearch(search)
        setCurrentPage(1)
    }

    const normalizeSupplierName = (name) => name?.trim().toLowerCase() ?? ''
    const dedupedSuppliers = []
    const supplierNames = new Map()
    for (const supplier of suppliers) {
        const normalized = normalizeSupplierName(supplier.name)
        if (!normalized) continue
        const existing = supplierNames.get(normalized)
        if (!existing) {
            supplierNames.set(normalized, supplier)
            dedupedSuppliers.push(supplier)
        } else if (existing.isArchived && !supplier.isArchived) {
            const index = dedupedSuppliers.indexOf(existing)
            if (index !== -1) dedupedSuppliers[index] = supplier
            supplierNames.set(normalized, supplier)
        }
    }

    const filteredSuppliers = dedupedSuppliers.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.contactPerson.toLowerCase().includes(search.toLowerCase())
        const matchesArchive = showArchived ? s.isArchived : !s.isArchived
        return matchesSearch && matchesArchive
    })

    const totalPages = Math.ceil(filteredSuppliers.length / PAGE_SIZE)
    const paginated = filteredSuppliers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

    const openAdd = () => { setEditing(null); setForm(emptySupplier); setModalOpen(true); }
    const openEdit = (s) => { setEditing(s); setForm({ ...s }); setModalOpen(true); }

    const handleSave = async () => {
        const trimmedName = form.name?.trim()
        if (!trimmedName || !form.contactPerson) return toast.error('Supplier name and contact person are required.')

        const duplicateExists = suppliers.some(s => s.name?.trim().toLowerCase() === trimmedName.toLowerCase() && (!editing || s.id !== editing.id))
        if (duplicateExists) {
            return toast.error('Supplier already exists in the directory.')
        }

        setSaving(true)
        try {
            const data = { ...form, name: trimmedName, updatedAt: serverTimestamp() }
            if (editing) {
                await updateDoc(doc(db, 'suppliers', editing.id), data)
                toast.success('Supplier updated successfully!')
            } else {
                await addDoc(collection(db, 'suppliers'), { ...data, createdAt: serverTimestamp() })
                toast.success('Supplier added successfully!')
            }
            setModalOpen(false)
        } catch (err) { toast.error('Failed to save supplier.') } finally { setSaving(false) }
    }

    const handleDelete = async (id) => {
        try { await deleteDoc(doc(db, 'suppliers', id)); toast.success('Supplier removed.'); setDeleteId(null); }
        catch { toast.error('Failed to delete supplier.') }
    }

    const handleArchive = async () => {
        if (!archiveId) return
        try {
            await updateDoc(doc(db, 'suppliers', archiveId.id), { isArchived: !archiveId.isArchived })
            toast.success(archiveId.isArchived ? 'Supplier restored.' : 'Supplier archived.')
            setArchiveId(null)
        } catch { toast.error('Failed to update archive status.') }
    }
    const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))


    // ==========================================
    // 2. PROCUREMENT WORKFLOW STATES & LOGIC
    // ==========================================
    const [orders, setOrders] = useState([])
    const [procTab, setProcTab] = useState('pending')
    const [rcvQty, setRcvQty] = useState({})
    const [noteVal, setNoteVal] = useState({})
    const [procModal, setProcModal] = useState(null)
    const [adminAuthModal, setAdminAuthModal] = useState(null) // For the completed transaction admin verification
    const [adminPin, setAdminPin] = useState('')
    const [confirmPOModal, setConfirmPOModal] = useState(null) // Modal for confirming PO creation
    const [orderQtys, setOrderQtys] = useState({}) // Stores custom order quantities from the admin

    const activeSuppliers = dedupedSuppliers.filter(s => !s.isArchived)
    const findSupplierByName = (name) => activeSuppliers.find(s => normalizeSupplierName(s.name) === normalizeSupplierName(name))

    const activeItemIds = new Set(orders.filter(o => o.status !== 'completed').map(o => o.itemId))
    const lowStock = MOCK_LOW_STOCK.filter(i => !activeItemIds.has(i.id) && i.stock <= i.threshold)

    function handleConfirmCreatePO() {
        if (!confirmPOModal) return
        setOrders(p => [{
            ...nextPO(),
            itemId: confirmPOModal.id,
            item: confirmPOModal,
            supplierId: confirmPOModal.supplierId,
            supplierName: confirmPOModal.supplierName
        }, ...p])
        setConfirmPOModal(null)
        toast.success(`Purchase order created for ${confirmPOModal.name}!`)
    }
    
    function markDelivered(po) {
        const now = new Date()
        setOrders(p => p.map(o => o.poNumber === po ? { ...o, status: 'receiving', deliveredDate: now.toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) } : o))
    }
    function cancelPO(po) { setOrders(p => p.filter(o => o.poNumber !== po)) }
    
    function openVerify(po) { setProcModal(po) }
    
    // Request admin verification before completing
    function requestAdminCompletion(po) {
        setProcModal(null)
        setAdminAuthModal(po)
        setAdminPin('')
    }

    function completeOrder(po) {
        // Mock admin PIN check (e.g., '1234' for thesis demo)
        if (adminPin !== '1234' && adminPin !== 'admin') {
            toast.error('Invalid Admin PIN. Only administrators can verify and update inventory.')
            return
        }

        const qty = Number(rcvQty[po]) || 0
        const now = new Date()
        setOrders(p => p.map(o => o.poNumber === po ? { ...o, status: 'completed', receivedQty: qty, completedDate: now.toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }), notes: noteVal[po] || '' } : o))
        setAdminAuthModal(null)
        toast.success('Verified! Transaction logged and inventory updated.')
    }

    const counts = { pending: 0, receiving: 0, completed: 0 }
    orders.forEach(o => counts[o.status]++)
    const filteredOrders = orders.filter(o => o.status === procTab)
    const stage = STAGES.find(s => s.key === procTab)


    // ==========================================
    // RENDER HELPERS
    // ==========================================
    // (Removed th and td since we are using standard table classes)

    return (
        <div style={{ color: 'var(--text-primary)', minHeight: '100%', paddingBottom: 48 }}>
            
            {/* Header */}
            <div className="page-header" style={{ marginBottom: 16 }}>
                <div>
                    <h1 className="page-title">Supplier Management</h1>
                    <p className="page-subtitle">Manage suppliers and structured delivery workflows</p>
                </div>
                {activeMainTab === 'directory' && (
                    <button className="btn btn-primary" onClick={openAdd}>
                        <Plus size={16} /> Add Supplier
                    </button>
                )}
            </div>

            {/* Main Tabs Navigation */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
                <button 
                    onClick={() => setActiveMainTab('directory')} 
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', background: 'transparent', color: activeMainTab === 'directory' ? 'var(--text-primary)' : 'var(--text-muted)', border: 'none', borderBottom: activeMainTab === 'directory' ? `2px solid var(--accent)` : '2px solid transparent', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.2s', marginBottom: -1 }}
                >
                    <BookOpen size={18} /> Tab 1: Supplier Directory
                </button>
                <button 
                    onClick={() => setActiveMainTab('procurement')} 
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', background: 'transparent', color: activeMainTab === 'procurement' ? 'var(--text-primary)' : 'var(--text-muted)', border: 'none', borderBottom: activeMainTab === 'procurement' ? `2px solid var(--accent)` : '2px solid transparent', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.2s', marginBottom: -1 }}
                >
                    <Truck size={18} /> Tab 2: Purchase Orders & Delivery Flows
                </button>
            </div>

            {/* ========================================== */}
            {/* TAB 1: SUPPLIER DIRECTORY                  */}
            {/* ========================================== */}
            {activeMainTab === 'directory' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div className="search-bar" style={{ maxWidth: 320 }}>
                            <Search size={15} className="search-icon" />
                            <input className="form-input" placeholder="Search suppliers..." value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                            <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} style={{ width: 16, height: 16 }} />
                            Show Archived
                        </label>
                    </div>

                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th style={{ width: 50 }}>No.</th>
                                    <th>Supplier Details</th>
                                    <th>Contact Info</th>
                                    <th>Address</th>
                                    <th>Status</th>
                                    <th style={{ width: 140, textAlign: 'right', paddingRight: 24 }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.length === 0 && (
                                    <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No suppliers found.</td></tr>
                                )}
                                {paginated.map((s, index) => {
                                    const rowIndex = (currentPage - 1) * PAGE_SIZE + index + 1
                                    return (
                                        <tr key={s.id}>
                                            <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{rowIndex}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                                                        <Truck size={18} />
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</div>
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{s.contactPerson}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.85rem' }}>
                                                    {s.phone && <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}><Phone size={12} /> {s.phone}</div>}
                                                    {s.email && <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}><Mail size={12} /> {s.email}</div>}
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                                    <MapPin size={12} style={{ flexShrink: 0 }} /> {s.address || '—'}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge ${s.isActive ? 'badge-success' : 'badge-danger'}`}>
                                                    {s.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right', padding: '16px 24px' }}>
                                                <div style={{ display: 'inline-flex', gap: 8 }}>
                                                    <button onClick={() => setViewingSupplier(s)} title="View" style={{ 
                                                        width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                                        background: 'linear-gradient(145deg, #1d4ed8 0%, #1e40af 100%)', border: '1px solid #3b82f6', color: '#ffffff', borderRadius: 6,
                                                        boxShadow: '0 2px 8px rgba(29,78,216,0.3)', transition: 'transform 0.15s'
                                                    }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                                                        <Eye size={15} />
                                                    </button>
                                                    <button onClick={() => openEdit(s)} title="Edit" style={{ 
                                                        width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                                        background: '#064e3b', border: '1px solid #65a30d', color: '#bef264', borderRadius: 6,
                                                        boxShadow: '0 2px 8px rgba(6,78,59,0.3)', transition: 'transform 0.15s'
                                                    }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                                                        <Edit2 size={15} />
                                                    </button>
                                                    <button onClick={() => setArchiveId(s)} title={s.isArchived ? "Restore" : "Archive"} style={{ 
                                                        width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                                        background: '#1e293b', border: '1px solid #475569', color: '#cbd5e1', borderRadius: 6,
                                                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)', transition: 'transform 0.15s'
                                                    }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                                                        {s.isArchived ? <RefreshCw size={15} /> : <Archive size={15} />}
                                                    </button>
                                                    <button onClick={() => setDeleteId(s.id)} title="Delete forever" style={{ 
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
                        <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={filteredSuppliers.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />
                    </div>
                </motion.div>
            )}


            {/* ========================================== */}
            {/* TAB 2: PURCHASE ORDERS & DELIVERY FLOW     */}
            {/* ========================================== */}
            {activeMainTab === 'procurement' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    


                    {/* Low Stock Panel */}
                    {lowStock.length > 0 && (
                        <div style={{ marginBottom: 24 }}>
                            <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10, border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px 12px 0 0', borderBottom: 'none' }}>
                                <AlertTriangle size={18} color="#ef4444" />
                                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Low Stock Alert</span>
                                <span className="badge badge-danger" style={{ borderRadius: 20 }}>{lowStock.length}</span>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>items require a Purchase Order</span>
                            </div>
                            <div className="table-wrapper" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Product</th>
                                            <th>Category</th>
                                            <th>Supplier</th>
                                            <th>Current Stock</th>
                                            <th>Order Quantity</th>
                                            <th style={{ textAlign: 'right', paddingRight: 24 }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lowStock.map(item => {
                                            const matchedSupplier = findSupplierByName(item.supplier)
                                            return (
                                                <tr key={item.id}>
                                                    <td>
                                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</div>
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.size}</div>
                                                    </td>
                                                    <td style={{ color: 'var(--text-secondary)' }}>{item.category}</td>
                                                    <td style={{ color: 'var(--text-secondary)' }}>
                                                        {item.supplier}
                                                    </td>
                                                    <td>
                                                        <span className={`badge ${item.stock === 0 ? 'badge-danger' : 'badge-warning'}`}>
                                                            {item.stock === 0 ? 'OUT OF STOCK' : `LOW STOCK (${item.stock}/${item.threshold})`}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            <input 
                                                                type="number" 
                                                                min="0"
                                                                className="form-input" 
                                                                style={{ width: 80, padding: '6px 10px' }} 
                                                                value={orderQtys[item.id] !== undefined ? orderQtys[item.id] : 0} 
                                                                onChange={e => setOrderQtys(p => ({ ...p, [item.id]: e.target.value }))} 
                                                            />
                                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.unit}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ textAlign: 'right', paddingRight: 24 }}>
                                                        <button className="btn btn-primary" onClick={() => {
                                                            const qty = orderQtys[item.id] !== undefined ? Number(orderQtys[item.id]) : 0;
                                                            const supplierRecord = matchedSupplier
                                                            if (qty <= 0) {
                                                                toast.error("Please enter a valid order quantity first.");
                                                                return;
                                                            }
                                                            if (!supplierRecord) {
                                                                toast.error("Supplier must already exist in Supplier Directory before creating a PO.");
                                                                return;
                                                            }
                                                            setConfirmPOModal({ ...item, orderQty: qty, supplierId: supplierRecord.id, supplierName: supplierRecord.name });
                                                        }}>
                                                            <Plus size={14} /> Create Purchase Order
                                                        </button>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Stage Tabs */}
                    <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
                        {STAGES.map(s => {
                            const Icon = s.icon; const active = procTab === s.key
                            return (
                                <button key={s.key} onClick={() => setProcTab(s.key)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', background: active ? 'var(--bg-elevated)' : 'transparent', color: active ? 'var(--text-primary)' : 'var(--text-muted)', border: '1px solid', borderColor: active ? 'var(--border)' : 'transparent', borderBottom: 'none', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', borderRadius: '8px 8px 0 0', marginBottom: -1, transition: 'all 0.2s' }}>
                                    <Icon size={16} color={s.color} />
                                    {s.label}
                                    <span style={{ background: active ? s.color : 'var(--bg-surface)', color: active ? '#fff' : 'var(--text-muted)', borderRadius: 20, padding: '2px 8px', fontSize: '0.75rem', fontWeight: 700 }}>{counts[s.key]}</span>
                                </button>
                            )
                        })}
                    </div>

                    {/* Stage Description Bar */}
                    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <stage.icon size={18} color={stage.color} />
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}><strong style={{ color: 'var(--text-primary)' }}>{stage.sublabel}:</strong> {stage.desc}</span>
                    </div>

                    {/* Orders Table */}
                    <div className="table-wrapper">
                        {filteredOrders.length === 0 ? (
                            <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
                                <Package size={44} style={{ opacity: 0.25, marginBottom: 14 }} />
                                <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>No orders at this stage.</p>
                                {procTab === 'pending' && <p style={{ margin: '6px 0 0', fontSize: '0.8rem' }}>Create a Purchase Order from the Low Stock Alert above.</p>}
                                {procTab === 'receiving' && <p style={{ margin: '6px 0 0', fontSize: '0.8rem' }}>Mark a Pending PO as Delivered to move it here.</p>}
                                {procTab === 'completed' && <p style={{ margin: '6px 0 0', fontSize: '0.8rem' }}>Verified transactions will appear here and update inventory.</p>}
                            </div>
                        ) : (
                            <table>
                                <thead>
                                    <tr>
                                        <th>PO Number</th>
                                        <th>Product</th>
                                        <th>Supplier</th>
                                        <th>Ordered Qty</th>
                                        {procTab === 'pending'   && <th>Stage</th>}
                                        {procTab === 'receiving' && <th>Actual Qty Received</th>}
                                        {procTab === 'completed' && <th>Qty Verified</th>}
                                        <th>{procTab === 'completed' ? 'Completed Date' : 'Date Created'}</th>
                                        {procTab === 'completed' && <th>Notes</th>}
                                        <th style={{ textAlign: 'right', paddingRight: 24 }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <AnimatePresence>
                                        {filteredOrders.map(order => (
                                            <motion.tr key={order.poNumber} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
                                                <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)' }}>{order.poNumber}</td>
                                                <td>
                                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{order.item.name}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{order.item.category} · {order.item.size}</div>
                                                </td>
                                                <td style={{ color: 'var(--text-secondary)' }}>{order.supplierName || order.item.supplier}</td>
                                                <td style={{ fontWeight: 600 }}>{order.item.orderQty} {order.item.unit}</td>

                                                {procTab === 'pending' && (
                                                    <td><span className="badge badge-warning">Awaiting Delivery</span></td>
                                                )}
                                                {procTab === 'receiving' && (
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <input className="form-input" type="number" min={0} max={order.item.orderQty} placeholder="Enter qty" value={rcvQty[order.poNumber] || ''} onChange={e => setRcvQty(p => ({ ...p, [order.poNumber]: e.target.value }))} style={{ width: 90, padding: '6px 10px' }} />
                                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/ {order.item.orderQty} {order.item.unit}</span>
                                                        </div>
                                                    </td>
                                                )}
                                                {procTab === 'completed' && (
                                                    <td><span className="badge badge-success">{order.receivedQty} {order.item.unit}</span></td>
                                                )}

                                                <td style={{ color: 'var(--text-secondary)' }}>
                                                    {procTab === 'completed' ? order.completedDate : order.dateCreated}
                                                </td>

                                                {procTab === 'completed' && (
                                                    <td style={{ color: 'var(--text-secondary)', fontStyle: order.notes ? 'normal' : 'italic' }}>
                                                        {order.notes || '—'}
                                                    </td>
                                                )}

                                                <td style={{ textAlign: 'right', paddingRight: 24 }}>
                                                    <div style={{ display: 'inline-flex', gap: 8, justifyContent: 'flex-end' }}>
                                                        {order.status === 'pending' && <>
                                                            <button className="btn btn-primary" onClick={() => markDelivered(order.poNumber)} style={{ padding: '6px 12px' }}>
                                                                <Truck size={14} /> Mark as Delivered
                                                            </button>
                                                            <button className="btn btn-danger" onClick={() => cancelPO(order.poNumber)} title="Cancel PO" style={{ padding: '6px 10px' }}>
                                                                <X size={14} />
                                                            </button>
                                                        </>}
                                                        {order.status === 'receiving' && (
                                                            <button className="btn btn-success" onClick={() => openVerify(order.poNumber)} disabled={!rcvQty[order.poNumber]} style={{ padding: '6px 16px' }}>
                                                                <ShieldCheck size={14} /> Verify Delivery
                                                            </button>
                                                        )}
                                                        {order.status === 'completed' && (
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--success)', fontSize: '0.85rem', fontWeight: 600 }}>
                                                                <CheckCircle2 size={16} /> Updated
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        )}
                    </div>
                </motion.div>
            )}

            {/* ========================================== */}
            {/* ALL MODALS (DIRECTORY & PROCUREMENT)       */}
            {/* ========================================== */}
            
            {/* 1. Add/Edit Supplier Modal */}
            <AnimatePresence>
                {modalOpen && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.div className="modal" initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
                            <div className="modal-header">
                                <span className="modal-title">{editing ? 'Edit Supplier' : 'New Supplier'}</span>
                                <button className="chat-icon-btn" onClick={() => setModalOpen(false)}><X size={18} /></button>
                            </div>
                            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div className="form-group">
                                    <label className="form-label">Company / Supplier Name *</label>
                                    <input className="form-input" value={form.name} onChange={e => setField('name', e.target.value)} placeholder="e.g. Ace Hardware Corp" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Contact Person *</label>
                                    <input className="form-input" value={form.contactPerson} onChange={e => setField('contactPerson', e.target.value)} placeholder="Full Name" />
                                </div>
                                <div style={{ display: 'flex', gap: 16 }}>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label className="form-label">Phone Number</label>
                                        <input className="form-input" value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="+63 900 000 0000" />
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label className="form-label">Email</label>
                                        <input className="form-input" type="email" value={form.email} onChange={e => setField('email', e.target.value)} placeholder="contact@supplier.com" />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Physical Address</label>
                                    <textarea className="form-textarea" value={form.address} onChange={e => setField('address', e.target.value)} placeholder="Facility or Office Address..." />
                                </div>
                                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                                    <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => setField('isActive', e.target.checked)} style={{ width: 16, height: 16 }} />
                                    <label htmlFor="isActive" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Supplier is Active</label>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                                    {saving ? 'Saving...' : 'Save Supplier'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 2. Delete / Archive Directory Modals (Omitted for brevity, using same logic as previous) */}
            <AnimatePresence>
                {deleteId && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.div className="modal" style={{ maxWidth: 400 }} initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
                            <div className="modal-header">
                                <span className="modal-title">Remove Supplier</span>
                                <button className="chat-icon-btn" onClick={() => setDeleteId(null)}><X size={18} /></button>
                            </div>
                            <div className="modal-body"><p style={{ color: 'var(--text-secondary)' }}>Are you sure you want to completely remove this supplier from the system?</p></div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
                                <button className="btn btn-danger" onClick={() => handleDelete(deleteId)}>Confirm Delete</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {archiveId && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.div className="modal" style={{ maxWidth: 420 }} initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
                            <div className="modal-header">
                                <span className="modal-title">{archiveId.isArchived ? 'Restore Supplier' : 'Archive Supplier'}</span>
                                <button className="chat-icon-btn" onClick={() => setArchiveId(null)}><X size={18} /></button>
                            </div>
                            <div className="modal-body">
                                <p style={{ color: 'var(--text-secondary)' }}>
                                    {archiveId.isArchived
                                        ? 'Restore this supplier to the active directory?'
                                        : 'Archive this supplier and hide it from active supplier lists?'}
                                </p>
                                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginTop: 16 }}>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Supplier</p>
                                    <p style={{ margin: '6px 0 0', fontWeight: 700, color: 'var(--text-primary)' }}>{archiveId.name}</p>
                                    <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{archiveId.contactPerson}</p>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setArchiveId(null)}>Cancel</button>
                                <button className="btn btn-warning" onClick={handleArchive}>
                                    {archiveId.isArchived ? 'Yes, Restore' : 'Yes, Archive'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 3. View Supplier Details Modal */}
            <AnimatePresence>
                {viewingSupplier && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.div className="modal" style={{ maxWidth: 700 }} initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
                            <div className="modal-header">
                                <span className="modal-title">Supplier Details</span>
                                <button className="chat-icon-btn" onClick={() => setViewingSupplier(null)}><X size={18} /></button>
                            </div>
                            <div className="modal-body">
                                <div style={{ background: 'var(--bg-elevated)', padding: '20px', borderRadius: '12px', marginBottom: '24px', border: '1px solid var(--border)' }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>🧾 Supplier Information</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '0.9rem' }}>
                                        <div><p style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>Supplier Name</p><p style={{ fontWeight: 600 }}>{viewingSupplier.name}</p></div>
                                        <div><p style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>Contact Person</p><p style={{ fontWeight: 600 }}>{viewingSupplier.contactPerson}</p></div>
                                        <div><p style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>Contact Number</p><p style={{ fontWeight: 600 }}>{viewingSupplier.phone || '—'}</p></div>
                                        <div><p style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>Email</p><p style={{ fontWeight: 600 }}>{viewingSupplier.email || '—'}</p></div>
                                        <div style={{ gridColumn: '1 / -1' }}><p style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>Address</p><p style={{ fontWeight: 600 }}>{viewingSupplier.address || '—'}</p></div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 4. Verification Modal (Procurement) */}
            <AnimatePresence>
                {procModal && (() => {
                    const order = orders.find(o => o.poNumber === procModal)
                    if (!order) return null
                    const qty = Number(rcvQty[procModal]) || 0
                    const ordered = order.item.orderQty
                    const variance = qty - ordered
                    return (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(5px)' }}>
                            <motion.div initial={{ scale: 0.92, y: 18 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92 }} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 32, maxWidth: 460, width: '92%', boxShadow: '0 24px 70px rgba(0,0,0,0.55)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}><ShieldCheck size={24} /></div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Verify Delivery</h3>
                                        <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Review quantities before admin completion.</p>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
                                    {[
                                        { label: 'PO Number', value: order.poNumber, color: '#00b4d8' },
                                        { label: 'Ordered', value: `${ordered} ${order.item.unit}`, color: 'var(--text-primary)' },
                                        { label: 'Received', value: `${qty} ${order.item.unit}`, color: variance < 0 ? '#ef4444' : '#10b981' },
                                    ].map(c => (
                                        <div key={c.label} style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '12px 14px', border: '1px solid var(--border)' }}>
                                            <p style={{ margin: '0 0 6px', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{c.label}</p>
                                            <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: c.color, fontFamily: 'monospace' }}>{c.value}</p>
                                        </div>
                                    ))}
                                </div>

                                <p style={{ margin: '0 0 6px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Product: <strong style={{ color: 'var(--text-primary)' }}>{order.item.name}</strong></p>
                                <p style={{ margin: '0 0 20px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Supplier: <strong style={{ color: 'var(--text-primary)' }}>{order.supplierName || order.item.supplier}</strong></p>

                                {variance !== 0 && (
                                    <div style={{ background: variance < 0 ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', border: `1px solid ${variance < 0 ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`, borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: '0.82rem', color: variance < 0 ? '#ef4444' : '#10b981', fontWeight: 700 }}>
                                        {variance < 0 ? `⚠ Short delivery: ${Math.abs(variance)} ${order.item.unit} missing from order.` : `✓ Over-delivery: ${variance} ${order.item.unit} extra received.`}
                                    </div>
                                )}

                                <textarea placeholder="Optional notes (e.g. partial delivery, damage, etc.)..." value={noteVal[procModal] || ''} onChange={e => setNoteVal(p => ({ ...p, [procModal]: e.target.value }))}
                                    style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 8, padding: '12px 14px', fontSize: '0.85rem', resize: 'vertical', minHeight: 70, boxSizing: 'border-box', marginBottom: 24, outline: 'none', fontFamily: 'inherit' }} />

                                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                    <button onClick={() => setProcModal(null)} style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)', padding: '10px 20px', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>Cancel</button>
                                    <button onClick={() => requestAdminCompletion(procModal)} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '10px 22px', borderRadius: 8, fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}>
                                        Proceed to Admin Completion
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )
                })()}
            </AnimatePresence>

            {/* 5. Admin Authorization Modal (Procurement Completion) */}
            <AnimatePresence>
                {adminAuthModal && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ zIndex: 10000 }}>
                        <motion.div className="modal" style={{ maxWidth: 400 }} initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
                            <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                                <span className="modal-title" style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 8 }}><ShieldCheck size={20} /> Admin Verification Required</span>
                                <button className="chat-icon-btn" onClick={() => setAdminAuthModal(null)}><X size={18} /></button>
                            </div>
                            <div className="modal-body">
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 20 }}>
                                    Completing this transaction will finalize the record and permanently update the system inventory. Please enter the Admin PIN to authorize. (Demo PIN: <strong>1234</strong>)
                                </p>
                                <input 
                                    type="password" 
                                    placeholder="Enter Admin PIN" 
                                    value={adminPin} 
                                    onChange={e => setAdminPin(e.target.value)}
                                    autoFocus
                                    style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 8, padding: '12px 14px', fontSize: '1.2rem', letterSpacing: '0.2em', textAlign: 'center', boxSizing: 'border-box', outline: 'none' }} 
                                />
                            </div>
                            <div className="modal-footer" style={{ borderTop: 'none', paddingTop: 0 }}>
                                <button className="btn btn-secondary" onClick={() => setAdminAuthModal(null)}>Cancel</button>
                                <button className="btn btn-primary" onClick={() => completeOrder(adminAuthModal)} style={{ background: '#ef4444', borderColor: '#ef4444', color: '#fff' }}>
                                    Authorize & Complete
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 6. Confirm Create PO Modal */}
            <AnimatePresence>
                {confirmPOModal && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ zIndex: 10000 }}>
                        <motion.div className="modal" style={{ maxWidth: 400 }} initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
                            <div className="modal-header">
                                <span className="modal-title">Create Purchase Order</span>
                                <button className="chat-icon-btn" onClick={() => setConfirmPOModal(null)}><X size={18} /></button>
                            </div>
                            <div className="modal-body">
                                <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.9rem' }}>
                                    Are you sure you want to create a purchase order for <strong style={{ color: 'var(--text-primary)' }}>{confirmPOModal.name}</strong> from <strong style={{ color: 'var(--text-primary)' }}>{confirmPOModal.supplierName || confirmPOModal.supplier}</strong>?
                                </p>
                                <div style={{ background: 'var(--bg-elevated)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Final Order Qty:</span>
                                    <span style={{ fontWeight: 800, color: 'var(--accent)' }}>{confirmPOModal.orderQty} {confirmPOModal.unit}</span>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setConfirmPOModal(null)}>Cancel</button>
                                <button className="btn btn-primary" onClick={handleConfirmCreatePO}>
                                    Yes, Create PO
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    )
}
