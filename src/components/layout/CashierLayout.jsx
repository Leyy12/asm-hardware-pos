import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ShoppingCart, RotateCcw, LogOut, ChevronLeft,
    ChevronRight, Package, MessageSquareText, Bell, Menu, X
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import ChatBot from '../chatbot/ChatBot'
import '../../styles/layout.css'

const navItems = [
    { to: '/cashier/pos', icon: ShoppingCart, label: 'POS Terminal' },
    { to: '/cashier/refund', icon: RotateCcw, label: 'Refunds' },
]

export default function CashierLayout({ children }) {
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
                                <span className="logo-name">ASM</span>
                                <span className="logo-sub">Cashier Portal</span>
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
                    {navItems.map(({ to, icon: Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            title={label}
                        >
                            <Icon size={20} className="nav-icon" />
                            <AnimatePresence>
                                {showLabels && (
                                    <motion.span
                                        className="nav-label"
                                        initial={{ opacity: 0, width: 0 }}
                                        animate={{ opacity: 1, width: 'auto' }}
                                        exit={{ opacity: 0, width: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        {label}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </NavLink>
                    ))}
                </nav>

                {/* AI Chat button */}
                <button
                    className={`nav-item chat-nav-btn ${chatOpen ? 'active' : ''}`}
                    onClick={() => setChatOpen(!chatOpen)}
                    title="AI Assistant"
                    style={{ marginBottom: 8 }}
                >
                    <MessageSquareText size={20} className="nav-icon" />
                    <AnimatePresence>
                        {showLabels && (
                            <motion.span className="nav-label"
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 'auto' }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                AI Assistant
                            </motion.span>
                        )}
                    </AnimatePresence>
                </button>

                {/* User info */}
                <div className="sidebar-user">
                    <div className="user-avatar">
                        {userProfile?.name?.charAt(0) || 'C'}
                    </div>
                    <AnimatePresence>
                        {showLabels && (
                            <motion.div
                                className="user-info"
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 'auto' }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <span className="user-name">{userProfile?.name || 'Cashier'}</span>
                                <span className="user-role">Shop Cashier</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <button className="logout-btn" onClick={handleLogout} title="Logout">
                        <LogOut size={16} />
                    </button>
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
                        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Terminal Active</h2>
                    </div>
                    <div className="topbar-right">
                        <Bell size={20} className="topbar-icon" />
                        <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 8px' }} />
                        <span className="topbar-greeting">Counter: <strong>{userProfile?.name || 'Cashier'}</strong></span>
                        <div className="user-avatar" style={{ width: 32, height: 32, fontSize: '0.8rem' }}>
                            {userProfile?.name?.charAt(0) || 'C'}
                        </div>
                    </div>
                </header>

                {/* Content */}
                <main className="content" style={{ padding: '24px' }}>
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
