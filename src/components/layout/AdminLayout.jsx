import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    LayoutDashboard, Package, ShoppingCart, RotateCcw,
    BarChart3, Users, MessageSquareText, ChevronLeft,
    ChevronRight, LogOut, Bell, Settings, Truck, MonitorPlay, Download, CreditCard,
    Search, Handshake, User
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
    const [chatOpen, setChatOpen] = useState(false)
    const { userProfile, logout } = useAuth()
    const navigate = useNavigate()

    const handleLogout = async () => {
        await logout()
        navigate('/login')
    }

    return (
        <div className="layout-root">
            {/* ---- Sidebar ---- */}
            <motion.aside
                className="sidebar"
                animate={{ width: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-w)' }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
            >
                {/* Logo */}
                <div className="sidebar-logo">
                    <div className="logo-icon">
                        <Package size={20} />
                    </div>
                    <AnimatePresence>
                        {!collapsed && (
                            <motion.div
                                className="logo-text"
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 'auto' }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <span className="logo-name">MURA LAHAT POS</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <button
                        className="collapse-btn"
                        onClick={() => setCollapsed(!collapsed)}
                        title={collapsed ? 'Expand' : 'Collapse'}
                    >
                        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                    </button>
                </div>

                {/* Nav */}
                <nav className="sidebar-nav">
                    {!collapsed && <p style={{ margin: '0 16px 8px', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Main Menu</p>}
                    {mainMenuItems.map(({ to, icon: Icon, label }) => (
                        <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={label}>
                            <Icon size={20} className="nav-icon" />
                            <AnimatePresence>
                                {!collapsed && (
                                    <motion.span className="nav-label" initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.2 }}>
                                        {label}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </NavLink>
                    ))}

                    {!collapsed && <p style={{ margin: '24px 16px 8px', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Management</p>}
                    {managementItems.map(({ to, icon: Icon, label }) => (
                        <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={label}>
                            <Icon size={20} className="nav-icon" />
                            <AnimatePresence>
                                {!collapsed && (
                                    <motion.span className="nav-label" initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.2 }}>
                                        {label}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </NavLink>
                    ))}
                    
                    {/* Logout Link */}
                    <button className="nav-item" onClick={handleLogout} title="Logout" style={{ width: 'calc(100% - 32px)', textAlign: 'left' }}>
                        <LogOut size={20} className="nav-icon" style={{ color: 'var(--danger)' }} />
                        <AnimatePresence>
                            {!collapsed && (
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
                        {userProfile?.name?.charAt(0) || 'T'}
                    </div>
                    <AnimatePresence>
                        {!collapsed && (
                            <motion.div className="user-info" initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.2 }}>
                                <span className="user-name">{userProfile?.name || 'Tita Czarina'}</span>
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
                        <button className="btn btn-secondary btn-sm" style={{ padding: '8px 16px', borderRadius: '12px' }}>
                            <Download size={16} /> Export Report
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
                        key={window.location.pathname}
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
        </div >
    )
}
