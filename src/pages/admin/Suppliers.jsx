import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import { Plus, Search, Edit2, Trash2, X, Truck, Phone, Mail, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'

const emptySupplier = {
    name: '', contactPerson: '', phone: '', email: '', address: '', isActive: true
}

export default function Suppliers() {
    const [suppliers, setSuppliers] = useState([])
    const [search, setSearch] = useState('')
    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState(null)
    const [form, setForm] = useState(emptySupplier)
    const [saving, setSaving] = useState(false)
    const [deleteId, setDeleteId] = useState(null)

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'suppliers'), snap => {
            setSuppliers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        })
        return () => unsub()
    }, [])

    const filtered = suppliers.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.contactPerson.toLowerCase().includes(search.toLowerCase())
    )

    const openAdd = () => {
        setEditing(null)
        setForm(emptySupplier)
        setModalOpen(true)
    }

    const openEdit = (s) => {
        setEditing(s)
        setForm({ ...s })
        setModalOpen(true)
    }

    const handleSave = async () => {
        if (!form.name || !form.contactPerson) {
            return toast.error('Supplier name and contact person are required.')
        }

        setSaving(true)
        try {
            const data = {
                ...form,
                updatedAt: serverTimestamp()
            }

            if (editing) {
                await updateDoc(doc(db, 'suppliers', editing.id), data)
                toast.success('Supplier updated successfully!')
            } else {
                await addDoc(collection(db, 'suppliers'), { ...data, createdAt: serverTimestamp() })
                toast.success('Supplier added successfully!')
            }
            setModalOpen(false)
        } catch (err) {
            toast.error('Failed to save supplier.')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id) => {
        try {
            await deleteDoc(doc(db, 'suppliers', id))
            toast.success('Supplier removed.')
            setDeleteId(null)
        } catch {
            toast.error('Failed to delete supplier.')
        }
    }

    const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Suppliers</h1>
                    <p className="page-subtitle">{suppliers.length} registered suppliers</p>
                </div>
                <button className="btn btn-primary" onClick={openAdd}>
                    <Plus size={16} /> Add Supplier
                </button>
            </div>

            <div style={{ marginBottom: 20 }}>
                <div className="search-bar" style={{ maxWidth: 320 }}>
                    <Search size={15} className="search-icon" />
                    <input className="form-input" placeholder="Search suppliers..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
            </div>

            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Supplier Details</th>
                            <th>Contact Info</th>
                            <th>Address</th>
                            <th>Status</th>
                            <th style={{ width: 100 }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 && (
                            <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No suppliers found.</td></tr>
                        )}
                        {filtered.map(s => (
                            <tr key={s.id}>
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
                                <td>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button className="btn btn-secondary btn-sm btn-icon" onClick={() => openEdit(s)} title="Edit">
                                            <Edit2 size={14} />
                                        </button>
                                        <button className="btn btn-danger btn-sm btn-icon" onClick={() => setDeleteId(s.id)} title="Delete">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
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

            {/* Delete confirm */}
            <AnimatePresence>
                {deleteId && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.div className="modal" style={{ maxWidth: 400 }} initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
                            <div className="modal-header">
                                <span className="modal-title">Remove Supplier</span>
                                <button className="chat-icon-btn" onClick={() => setDeleteId(null)}><X size={18} /></button>
                            </div>
                            <div className="modal-body">
                                <p style={{ color: 'var(--text-secondary)' }}>Are you sure you want to completely remove this supplier from the system? This cannot be undone.</p>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
                                <button className="btn btn-danger" onClick={() => handleDelete(deleteId)}>Confirm Delete</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
