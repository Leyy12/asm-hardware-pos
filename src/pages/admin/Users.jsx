import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { 
    collection, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, 
    query, where, getDocs, writeBatch 
} from 'firebase/firestore'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth, db } from '../../firebase'
import { formatDateTime } from '../../utils/helpers'
import { Plus, X, UserCheck, UserX, Shield } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Users() {
    const [users, setUsers] = useState([])
    const [modalOpen, setModalOpen] = useState(false)
    const [editMode, setEditMode] = useState(false)
    const [selectedUser, setSelectedUser] = useState(null)
    const [form, setForm] = useState({ name: '', email: '', password: '' })
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'users'), snap =>
            setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        )
        return unsub
    }, [])

    const handleOpenModal = (user = null) => {
        if (user) {
            setEditMode(true)
            setSelectedUser(user)
            setForm({ name: user.name, email: user.email, password: '' })
        } else {
            setEditMode(false)
            setSelectedUser(null)
            setForm({ name: '', email: '', password: '' })
        }
        setModalOpen(true)
    }

    const handleSave = async () => {
        if (!form.name || !form.email) return toast.error('Name and Email are required.')
        if (!editMode && !form.password) return toast.error('Password is required for new accounts.')
        if (!editMode && form.password.length < 6) return toast.error('Password must be at least 6 characters.')
        
        setSaving(true)
        try {
            if (editMode) {
                // Update existing user
                await updateDoc(doc(db, 'users', selectedUser.id), {
                    name: form.name,
                    email: form.email
                })

                // Sync name with sales records
                const salesSnap = await getDocs(query(collection(db, 'sales'), where('cashierId', '==', selectedUser.uid)))
                if (!salesSnap.empty) {
                    // Firestore batch limit is 500. Handle potential large number of sales.
                    const docs = salesSnap.docs
                    for (let i = 0; i < docs.length; i += 500) {
                        const batch = writeBatch(db)
                        const chunk = docs.slice(i, i + 500)
                        chunk.forEach(d => {
                            batch.update(d.ref, { cashierName: form.name })
                        })
                        await batch.commit()
                    }
                }

                toast.success(`Cashier ${form.name} and ${salesSnap.size} sales records updated!`)
            } else {
                // Create new user
                const cred = await createUserWithEmailAndPassword(auth, form.email, form.password)
                await addDoc(collection(db, 'users'), {
                    uid: cred.user.uid,
                    name: form.name,
                    email: form.email,
                    role: 'cashier',
                    isActive: true,
                    createdAt: serverTimestamp()
                })
                toast.success(`Cashier ${form.name} created!`)
            }
            setModalOpen(false)
            setForm({ name: '', email: '', password: '' })
        } catch (err) {
            toast.error(err.message || 'Failed to save cashier.')
        } finally {
            setSaving(false)
        }
    }

    const toggleActive = async (user) => {
        await updateDoc(doc(db, 'users', user.id), { isActive: !user.isActive })
        toast.success(`${user.name} ${user.isActive ? 'deactivated' : 'activated'}.`)
    }

    const cashiers = users.filter(u => u.role === 'cashier')
    const admins = users.filter(u => u.role === 'admin')

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">User Management</h1>
                    <p className="page-subtitle">{cashiers.length} cashiers · {admins.length} admin{admins.length !== 1 ? 's' : ''}</p>
                </div>
                <button id="add-cashier-btn" className="btn btn-primary" onClick={() => handleOpenModal()}>
                    <Plus size={16} /> Add Cashier
                </button>
            </div>

            {/* Admins */}
            {admins.length > 0 && (
                <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Shield size={18} style={{ color: 'var(--accent-hover)' }} /> Administrators
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                        {admins.map(u => (
                            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: 'var(--bg-elevated)', borderRadius: 12, border: '1px solid var(--border-accent)' }}>
                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-sidebar)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {u.name?.charAt(0)}
                                </div>
                                <div>
                                    <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{u.name}</p>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</p>
                                </div>
                                <span className="badge badge-accent">Admin</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Cashiers Table */}
            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr><th>Cashier</th><th>Email</th><th>Created</th><th>Status</th><th>Action</th></tr>
                    </thead>
                    <tbody>
                        {cashiers.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No cashiers yet. Add one to get started.</td></tr>}
                        {cashiers.map(u => (
                            <tr key={u.id}>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: u.isActive ? 'var(--bg-sidebar)' : 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', color: u.isActive ? 'var(--text-primary)' : 'var(--text-muted)', border: u.isActive ? 'none' : '1px solid var(--border)' }}>
                                            {u.name?.charAt(0)}
                                        </div>
                                        <span style={{ fontWeight: 600 }}>{u.name}</span>
                                    </div>
                                </td>
                                <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                                <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{formatDateTime(u.createdAt)}</td>
                                <td><span className={`badge badge-${u.isActive ? 'success' : 'danger'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                                <td>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button
                                            className="btn btn-sm btn-secondary"
                                            onClick={() => handleOpenModal(u)}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            id={`toggle-user-${u.id}`}
                                            className={`btn btn-sm ${u.isActive ? 'btn-secondary' : 'btn-success'}`}
                                            onClick={() => toggleActive(u)}
                                            title={u.isActive ? 'Deactivate' : 'Activate'}
                                        >
                                            {u.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                                            {u.isActive ? 'Deactivate' : 'Activate'}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* User Modal */}
            <AnimatePresence>
                {modalOpen && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.div className="modal" style={{ maxWidth: 420 }}
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
                            <div className="modal-header">
                                <span className="modal-title">{editMode ? 'Edit Cashier' : 'Add New Cashier'}</span>
                                <button className="chat-icon-btn" onClick={() => setModalOpen(false)}><X size={18} /></button>
                            </div>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Full Name</label>
                                    <input type="text" className="form-input" placeholder="e.g., Maria Santos"
                                        value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email Address</label>
                                    <input type="email" className="form-input" placeholder="cashier@asm.com"
                                        value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                                </div>
                                {!editMode && (
                                    <div className="form-group">
                                        <label className="form-label">Password</label>
                                        <input type="password" className="form-input" placeholder="Min. 6 characters"
                                            value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                                <button id="save-cashier-btn" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                                    {saving ? 'Saving…' : (editMode ? 'Update Cashier' : 'Create Cashier')}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
