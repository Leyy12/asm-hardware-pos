import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { 
    collection, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, deleteDoc,
    query, where, getDocs, writeBatch 
} from 'firebase/firestore'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth, db } from '../../firebase'
import { formatDateTime } from '../../utils/helpers'
import { Plus, X, UserCheck, UserX, Shield, Edit2, Ban, Check, Trash2, Archive } from 'lucide-react'
import toast from 'react-hot-toast'
import Pagination from '../../components/common/Pagination'

const PAGE_SIZE = 10

export default function Users() {
    const [users, setUsers] = useState([])
    const [modalOpen, setModalOpen] = useState(false)
    const [editMode, setEditMode] = useState(false)
    const [selectedUser, setSelectedUser] = useState(null)
    const [form, setForm] = useState({ name: '', email: '', password: '' })
    const [saving, setSaving] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [systemAdminName, setSystemAdminName] = useState('System Administrator')
    const [showArchived, setShowArchived] = useState(false)
    const [actionModal, setActionModal] = useState(null)
    const [actionReason, setActionReason] = useState('')

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'users'), snap =>
            setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        )
        return unsub
    }, [])

    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'settings', 'system'), docSnap => {
            if (docSnap.exists() && docSnap.data().adminName) {
                setSystemAdminName(docSnap.data().adminName)
            }
        })
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

    const handleActionRequest = (type, user) => {
        setActionModal({ type, user })
        setActionReason('')
    }

    const handleConfirmAction = async () => {
        if (!actionModal) return
        const { type, user } = actionModal
        
        if (type === 'toggleActive' && !actionReason.trim()) {
            toast.error("Please provide a reason for this status change.")
            return
        }

        try {
            if (type === 'edit') {
                setActionModal(null)
                handleOpenModal(user)
                return
            } else if (type === 'toggleActive') {
                await updateDoc(doc(db, 'users', user.id), { 
                    isActive: !user.isActive, 
                    statusReason: actionReason,
                    statusUpdatedAt: serverTimestamp()
                })
                toast.success(`${user.name} ${user.isActive ? 'deactivated' : 'activated'}.`)
            } else if (type === 'archive') {
                await updateDoc(doc(db, 'users', user.id), { isArchived: !user.isArchived })
                toast.success(`${user.name} ${user.isArchived ? 'restored from archive' : 'archived'}.`)
            } else if (type === 'delete') {
                await deleteDoc(doc(db, 'users', user.id))
                toast.success(`${user.name} deleted successfully.`)
            }
        } catch (err) {
            toast.error('Action failed.')
        }
        setActionModal(null)
        setActionReason('')
    }

    const cashiers = users.filter(u => u.role === 'cashier' && (showArchived ? u.isArchived : !u.isArchived))
    const admins = users.filter(u => u.role === 'admin' && !u.isArchived)
    const totalPages = Math.ceil(cashiers.length / PAGE_SIZE)
    const paginated = cashiers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="page-title">User Management</h1>
                    <p className="page-subtitle">{cashiers.length} {showArchived ? 'archived cashiers' : 'active cashiers'} · 1 admin</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem' }}>
                        <input type="checkbox" checked={showArchived} onChange={e => { setShowArchived(e.target.checked); setCurrentPage(1); }} style={{ accentColor: 'var(--accent)' }} />
                        Show Archived
                    </label>
                    <button id="add-cashier-btn" className="btn btn-primary" onClick={() => handleOpenModal()}>
                        <Plus size={16} /> Add Cashier
                    </button>
                </div>
            </div>

            {/* Admins */}
            <div className="glass-card" style={{ padding: '20px 24px', marginBottom: 24, border: '1px solid var(--border)' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Shield size={18} style={{ color: 'var(--accent)' }} /> Administrators
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ 
                        display: 'flex', alignItems: 'center', gap: 16, padding: '12px 20px', 
                        background: 'var(--bg-elevated)', borderRadius: 12, border: '1px solid var(--border-accent)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ 
                            width: 42, height: 42, borderRadius: '50%', background: 'var(--bg-sidebar)', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', 
                            fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)',
                            border: '1px solid var(--border)'
                        }}>
                            {systemAdminName.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{systemAdminName}</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>admin@asm.com</span>
                        </div>
                        <span style={{ 
                            background: 'linear-gradient(145deg, #1d4ed8 0%, #1e40af 100%)', 
                            color: '#ffffff', fontWeight: 800, fontSize: '0.65rem', padding: '4px 10px', 
                            borderRadius: 20, marginLeft: 12, letterSpacing: '0.05em', border: '1px solid #3b82f6',
                            boxShadow: '0 2px 8px rgba(29,78,216,0.3)'
                        }}>
                            ADMIN
                        </span>
                    </div>
                </div>
            </div>

            {/* Cashiers Table */}
            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr><th style={{ width: 50 }}>No.</th><th>Cashier</th><th>Email</th><th>Created</th><th>Status</th><th style={{ width: 120, textAlign: 'right' }}>Actions</th></tr>
                    </thead>
                    <tbody>
                        {paginated.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No cashiers yet. Add one to get started.</td></tr>}
                        {paginated.map((u, index) => {
                            const rowIndex = (currentPage - 1) * PAGE_SIZE + index + 1
                            return (
                                <tr key={u.id}>
                                    <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{rowIndex}</td>
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
                                <td style={{ textAlign: 'right' }}>
                                    <div style={{ display: 'inline-flex', gap: 8 }}>
                                        <button onClick={() => handleActionRequest('edit', u)} title="Edit" style={{ 
                                            width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                            background: '#2563eb', border: 'none', color: '#ffffff', borderRadius: 8,
                                            boxShadow: '0 2px 8px rgba(37,99,235,0.3)', transition: 'transform 0.15s'
                                        }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleActionRequest('toggleActive', u)} title={u.isActive ? 'Deactivate Cashier' : 'Activate Cashier'} style={{ 
                                            width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                            background: u.isActive ? '#9a3412' : '#047857', border: 'none', color: '#ffffff', 
                                            borderRadius: 8,
                                            boxShadow: u.isActive ? '0 2px 8px rgba(154,52,18,0.3)' : '0 2px 8px rgba(4,120,87,0.3)', 
                                            transition: 'transform 0.15s'
                                        }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                                            {u.isActive ? <Ban size={16} /> : <Check size={16} />}
                                        </button>
                                        <button onClick={() => handleActionRequest('archive', u)} title={u.isArchived ? 'Restore User' : 'Archive User'} style={{ 
                                            width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                            background: '#1b4965', border: 'none', color: '#ffffff', 
                                            borderRadius: 8,
                                            boxShadow: '0 2px 8px rgba(27,73,101,0.3)', 
                                            transition: 'transform 0.15s'
                                        }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                                            <Archive size={16} />
                                        </button>
                                        <button onClick={() => handleActionRequest('delete', u)} title="Delete" style={{ 
                                            width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                            background: '#991b1b', border: 'none', color: '#ffffff', borderRadius: 8,
                                            boxShadow: '0 2px 8px rgba(153,27,27,0.3)', transition: 'transform 0.15s'
                                        }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                            )
                        })}
                    </tbody>
                </table>
                <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={cashiers.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />
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
            <AnimatePresence>
                {actionModal && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ zIndex: 10000 }}>
                        <motion.div className="modal" style={{ maxWidth: 420 }} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
                            <div className="modal-header">
                                <span className="modal-title">
                                    {actionModal.type === 'edit' && 'Edit User'}
                                    {actionModal.type === 'toggleActive' && (actionModal.user.isActive ? 'Deactivate User' : 'Activate User')}
                                    {actionModal.type === 'archive' && (actionModal.user.isArchived ? 'Restore User' : 'Archive User')}
                                    {actionModal.type === 'delete' && 'Delete User'}
                                </span>
                                <button className="chat-icon-btn" onClick={() => setActionModal(null)}><X size={18} /></button>
                            </div>
                            <div className="modal-body">
                                <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
                                    {actionModal.type === 'edit' && `Are you sure you want to edit the details of ${actionModal.user.name}?`}
                                    {actionModal.type === 'toggleActive' && `Are you sure you want to ${actionModal.user.isActive ? 'deactivate' : 'activate'} ${actionModal.user.name}?`}
                                    {actionModal.type === 'archive' && `Are you sure you want to ${actionModal.user.isArchived ? 'restore' : 'archive'} ${actionModal.user.name}?`}
                                    {actionModal.type === 'delete' && `Are you sure you want to permanently delete ${actionModal.user.name}? This action cannot be undone.`}
                                </p>

                                {actionModal.type === 'toggleActive' && (
                                    <div className="form-group">
                                        <label className="form-label" style={{ fontWeight: 600 }}>Reason for Action <span style={{ color: '#ef4444' }}>*</span></label>
                                        <input 
                                            type="text" 
                                            className="form-input" 
                                            placeholder={`Why are you ${actionModal.user.isActive ? 'deactivating' : 'activating'} this user?`}
                                            value={actionReason} 
                                            onChange={e => setActionReason(e.target.value)} 
                                            autoFocus
                                            style={{ border: '1px solid var(--border)', background: 'var(--bg-elevated)', marginTop: 8 }}
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setActionModal(null)}>Cancel</button>
                                <button 
                                    className="btn btn-primary" 
                                    onClick={handleConfirmAction}
                                    style={actionModal.type === 'delete' ? { background: '#dc2626', borderColor: '#b91c1c' } : {}}
                                >
                                    Confirm Action
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    )
}
