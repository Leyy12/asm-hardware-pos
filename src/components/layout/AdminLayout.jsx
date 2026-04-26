import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    LayoutDashboard, Package, ShoppingCart, RotateCcw,
    BarChart3, Users, MessageSquareText, ChevronLeft,
    ChevronRight, LogOut, Bell, Settings, Truck, Menu, X,
    Download, CreditCard, Search, Handshake, User
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import ChatBot from '../chatbot/ChatBot'
import '../../styles/layout.css'

const mainMenuItems = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/inventory', icon: Package, label: 'Products' },
    { to: '/admin/monitoring', icon: Search, label: 'Inventory Monitoring' },
    { to: '/admin/sales', icon: ShoppingCart, label: 'Cashier' },
    { to: '/admin/refunds', icon: RotateCcw, label: 'Refunds' },
    { to: '/admin/reports', icon: BarChart3, label: 'Sales & Reports' },
    { to: '/admin/suppliers', icon: Handshake, label: 'Supplier Management' },
]

const managementItems = [
    { to: '/admin/users', icon: User, label: 'Users' },
    { to: '/admin/discount-cards', icon: CreditCard, label: 'Discount Cards' },
    { to: '/admin/settings', icon: Settings, label: 'Settings' },
]

export default function AdminLayout({ children }) {
    const [collapsed, setCollapsed] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const [chatOpen, setChatOpen] = useState(false)
    const { userProfile, logout } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()

    // Detect mobile viewport
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth <= 768)
        check()
        window.addEventListener('resize', check)
        return () => window.removeEventListener('resize', check)
    }, [])

    // Close drawer on route change (mobile)
    useEffect(() => {
        if (isMobile) setMobileOpen(false)
    }, [location.pathname, isMobile])

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

                {/* User info */}
                <div className="sidebar-user">
                    <div className="user-avatar">
                        {userProfile?.name?.charAt(0) || 'A'}
                    </div>
                    <AnimatePresence>
                        {showLabels && (
                            <motion.div className="user-info" initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.2 }}>
                                <span className="user-name">{userProfile?.name || 'Admin'}</span>
                                <span className="user-role">Admin</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.aside>

            {/* ---- Main ---- */}
            <div className="layout-main">
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
                        <button className="btn btn-secondary btn-sm" style={{ padding: '8px 16px', borderRadius: '12px' }}>
                            <Download size={16} /> <span className="topbar-export-label">Export</span>
                        </button>
                    </div>
                    <div className="topbar-right">
                        <Bell size={20} className="topbar-icon" />
                        <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 8px' }} />
                        <span className="topbar-greeting">Welcome, <strong>{userProfile?.name || 'Admin'}</strong></span>
                        <div className="user-avatar" style={{ width: 32, height: 32, fontSize: '0.8rem' }}>
                            {userProfile?.name?.charAt(0) || 'A'}
                        </div>
                    </div>
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

            {/* Chatbot panel */}
            <ChatBot isOpen={chatOpen} onClose={() => setChatOpen(false)} />
        </div>
    )
}
