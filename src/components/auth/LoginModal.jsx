import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
// import { signInWithEmailAndPassword } from 'firebase/auth'
// import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
// import { auth, db } from '../../firebase'
import { X, Lock, Mail, AlertCircle, Loader, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

export default function LoginModal({ isOpen, onClose, type }) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const { login } = useAuth()

    if (!isOpen) return null

    const handleLogin = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            await login(email, password, type)
            toast.success('Login Successful!')
            onClose()
        } catch (err) {
            setError(err.message || 'Failed to sign in.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <AnimatePresence>
            <motion.div
                className="modal-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ zIndex: 9999 }}
            >
                <motion.div
                    className="modal"
                    style={{ maxWidth: 400, padding: 0, overflow: 'hidden' }}
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                >
                    {/* Modal Header */}
                    <div style={{ padding: '24px 24px 16px', background: 'linear-gradient(135deg, var(--bg-sidebar), transparent)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                <img src="/asm-logo.png" alt="ASM" style={{ width: 48, height: 48, objectFit: 'contain' }} />
                                <div>
                                    <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem', margin: 0, color: 'var(--text-primary)' }}>
                                        {type === 'admin' ? 'Admin Gateway' : 'Cashier Portal'}
                                    </h2>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 4 }}>Enter your credentials to access the system</p>
                                </div>
                            </div>
                            <button className="chat-icon-btn" onClick={onClose}><X size={20} /></button>
                        </div>
                    </div>

                    <form onSubmit={handleLogin} style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {error && (
                            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '12px 16px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600 }}>
                                <AlertCircle size={18} style={{ minWidth: 18 }} /> 
                                <span style={{ lineHeight: 1.4 }}>{error}</span>
                            </motion.div>
                        )}

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Email Address</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                                <input
                                    type="email"
                                    className="form-input"
                                    style={{ paddingLeft: 38 }}
                                    placeholder="name@asm.com"
                                    value={email} onChange={e => setEmail(e.target.value)} required
                                />
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: 8 }}>
                            <label className="form-label">Password</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className="form-input"
                                    style={{ paddingLeft: 38, paddingRight: 40 }}
                                    placeholder="••••••••"
                                    value={password} onChange={e => setPassword(e.target.value)} required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{ position: 'absolute', right: 12, top: 10, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary" style={{ padding: 14, fontSize: '1rem' }} disabled={loading}>
                            {loading ? <Loader className="spin" size={18} /> : 'Secure Login'}
                        </button>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
