import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    LayoutDashboard, Package, ShoppingCart, RotateCcw,
    BarChart3, ChevronLeft,
    ChevronRight, LogOut, Settings, Menu, X,
    CreditCard, Search, Handshake, User, Bot, Sparkles, Database
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { onSnapshot, doc } from 'firebase/firestore'
import { db } from '../../firebase'
import ChatBot from '../chatbot/ChatBot'
import '../../styles/layout.css'

const mainMenuItems = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/inventory', icon: Package, label: 'Products' },
    { to: '/admin/monitoring', icon: Search, label: 'Inventory Monitoring' },
    // { to: '/admin/catalog', icon: Database, label: 'DaaS Catalog' }, // Removed from customer navigation
    { to: '/admin/sales', icon: ShoppingCart, label: 'Cashier' },
    { to: '/admin/refunds', icon: RotateCcw, label: 'Refunds' },
    { to: '/admin/reports', icon: BarChart3, label: 'Sales & Reports' },
    // { to: '/admin/suppliers', icon: Handshake, label: 'Supplier Management' },
]

const managementItems = [
    { to: '/admin/users', icon: User, label: 'Users' },
    // { to: '/admin/discount-cards', icon: CreditCard, label: 'Reward Cards' },
    { to: '/admin/settings', icon: Settings, label: 'Settings' },
]

export default function AdminLayout({ children }) {
    const [collapsed, setCollapsed] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const [chatOpen, setChatOpen] = useState(false)
    const [adminName, setAdminName] = useState('Administrator')
    const { userProfile, logout } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()

    // Sync admin name from Firestore settings in real-time
    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'settings', 'system'), (snap) => {
            if (snap.exists() && snap.data().adminName?.trim()) {
                setAdminName(snap.data().adminName.trim())
            } else if (userProfile?.name) {
                setAdminName(userProfile.name)
            }
        })
        return unsub
    }, [userProfile])

    // Detect mobile viewport
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth <= 768)
        check()
        window.addEventListener('resize', check)
        return () => window.removeEventListener('resize', check)
    }, [])

    // Close drawer on route change (mobile)
    const [prevPath, setPrevPath] = useState(location.pathname)
    if (location.pathname !== prevPath) {
        setPrevPath(location.pathname)
        if (isMobile) setMobileOpen(false)
    }

    // Prevent body scroll when drawer is open on mobile
    useEffect(() => {
        if (isMobile && mobileOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => { document.body.style.overflow = '' }
    }, [isMobile, mobileOpen])

    const handleLogout = async () => {
        await logout()
        navigate('/login')
    }

    const showLabels = isMobile ? true : !collapsed

    return (
        <div className="layout-root">
            {/* ---- Mobile Overlay ---- */}
            {isMobile && (
                <div
                    className={`sidebar-overlay ${mobileOpen ? 'open' : ''}`}
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* ---- Sidebar ---- */}
            <motion.aside
                className={`sidebar ${isMobile && mobileOpen ? 'mobile-open' : ''}`}
                animate={
                    isMobile
                        ? {} // CSS handles transform on mobile
                        : { width: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-w)' }
                }
                style={
                    isMobile
                        ? {} // Let CSS control width/transform on mobile
                        : {}
                }
                transition={{ duration: 0.25, ease: 'easeInOut' }}
            >
                {/* Logo */}
                <div className="sidebar-logo">
                    <div className="logo-icon">
                        <Package size={20} />
                    </div>
                    <AnimatePresence>
                        {showLabels && (
                            <motion.div
                                className="logo-text"
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 'auto' }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <span className="logo-name">ASM HARDWARE</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    {/* Desktop collapse btn */}
                    {!isMobile && (
                        <button
                            className="collapse-btn"
                            onClick={() => setCollapsed(!collapsed)}
                            title={collapsed ? 'Expand' : 'Collapse'}
                        >
                            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                        </button>
                    )}
                    {/* Mobile close btn */}
                    {isMobile && (
                        <button
                            className="collapse-btn"
                            onClick={() => setMobileOpen(false)}
                            title="Close menu"
                            style={{ display: 'flex' }}
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Nav */}
                <nav className="sidebar-nav">
                    {showLabels && <p className="nav-section-label">Main Menu</p>}
                    {mainMenuItems.map(({ to, icon: Icon, label }) => (
                        <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={label}>
                            <Icon size={20} className="nav-icon" />
                            <AnimatePresence>
                                {showLabels && (
                                    <motion.span className="nav-label" initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.2 }}>
                                        {label}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </NavLink>
                    ))}

                    {showLabels && <p className="nav-section-label">Management</p>}
                    {managementItems.map(({ to, icon: Icon, label }) => (
                        <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={label}>
                            <Icon size={20} className="nav-icon" />
                            <AnimatePresence>
                                {showLabels && (
                                    <motion.span className="nav-label" initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.2 }}>
                                        {label}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </NavLink>
                    ))}

                    {/* Logout */}
                    <button className="nav-item" onClick={handleLogout} title="Logout" style={{ width: 'calc(100% - 16px)', textAlign: 'left' }}>
                        <LogOut size={20} className="nav-icon" style={{ color: 'var(--danger)' }} />
                        <AnimatePresence>
                            {showLabels && (
                                <motion.span className="nav-label" initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.2 }}>
                                    Logout
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </button>
                </nav>

            </motion.aside>

            {/* ---- Main ---- */}
            <div
                className="layout-main"
                style={!isMobile ? {
                    marginLeft: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-w)',
                    transition: 'margin-left 0.25s ease',
                } : {}}
            >
                {/* Top bar */}
                <header className="topbar">
                    <div className="topbar-left">
                        {/* Hamburger (mobile only) */}
                        <button
                            className="topbar-hamburger"
                            onClick={() => setMobileOpen(true)}
                            title="Open menu"
                        >
                            <Menu size={20} />
                        </button>
                    </div>
                    {location.pathname === '/admin/dashboard' && (
                        <div className="topbar-right">
                            <span className="topbar-greeting">Welcome, Admin <strong>{adminName}</strong></span>
                            <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 8px' }} />
                            <div className="user-avatar" style={{ width: 32, height: 32, fontSize: '0.8rem' }}>
                                {adminName.charAt(0).toUpperCase()}
                            </div>
                        </div>
                    )}
                </header>

                {/* Content */}
                <main className="content">
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {children}
                    </motion.div>
                </main>
            </div>

            {/* Floating AI Assistant Launcher */}
            <AnimatePresence>
                {!chatOpen && (
                    <motion.button 
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        onClick={() => setChatOpen(true)}
                        style={{
                            position: 'fixed',
                            bottom: 32,
                            right: 32,
                            width: 60,
                            height: 60,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
                            border: 'none',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 8px 24px rgba(29, 78, 216, 0.4)',
                            zIndex: 9999,
                            transition: 'transform 0.2s',
                        }}
                        whileHover={{ scale: 1.05, translateY: -2, boxShadow: '0 12px 28px rgba(29, 78, 216, 0.6)' }}
                        whileTap={{ scale: 0.95 }}
                        title="Open AI Assistant"
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                            <Bot size={28} strokeWidth={1.5} />
                            <Sparkles size={16} strokeWidth={2} style={{ position: 'absolute', top: -6, right: -10, color: '#ffffff', filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.6))' }} />
                        </div>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Chatbot panel */}
            <ChatBot isOpen={chatOpen} onClose={() => setChatOpen(false)} />
        </div>
    )
}
