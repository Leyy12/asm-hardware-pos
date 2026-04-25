import { useState, useEffect } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Package, Smartphone, Database, Bot, CheckCircle2, ShieldCheck, Zap, UserPlus, MessageSquare } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import LoginModal from '../components/auth/LoginModal'
import ChatBot from '../components/chatbot/ChatBot'
import '../styles/landing.css'

export default function Landing() {
    const { currentUser, userProfile } = useAuth()
    const navigate = useNavigate()
    const [modalType, setModalType] = useState(null) // 'admin' | 'cashier'
    const [isChatOpen, setIsChatOpen] = useState(false)

    useEffect(() => {
        if (currentUser && userProfile?.role && userProfile.role !== 'guest') {
            navigate(userProfile.role === 'cashier' ? '/cashier/pos' : '/admin/dashboard', { replace: true })
        }
    }, [currentUser, userProfile, navigate])

    const { scrollY } = useScroll()
    const y1 = useTransform(scrollY, [0, 1000], [0, 200])
    const y2 = useTransform(scrollY, [0, 1000], [0, -200])

    const stagger = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    }

    const fadeUp = {
        hidden: { opacity: 0, y: 30 },
        show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
    }

    const features = [
        {
            icon: Smartphone, title: 'Progressive Web App', color: '#10B981', // Mint Green
            desc: 'Access the POS and Dashboard from any device. Install directly to your home screen with offline resilience.'
        },
        {
            icon: Database, title: 'Real-Time Sync', color: '#09bccd', // Cyan
            desc: 'Powered by Firebase Firestore. Watch sales happen and stock levels drop live, no refresh required.'
        },
        {
            icon: Bot, title: 'Context-Aware AI', color: '#388E3C', // Success Green
            desc: 'Integrated with NVIDIA NIM. Ask the chatbot anything about your live stock levels and get instant insights.'
        },
        {
            icon: ShieldCheck, title: 'Role-based Security', color: '#1976D2', // Info Blue
            desc: 'Strict separation of concerns. Admins manage the business, while cashiers handle fast POS transactions.'
        }
    ]

    return (
        <div className="landing-root">
            {/* Background Animated Elements */}
            <div className="landing-bg">
                <motion.div style={{ y: y1, background: 'var(--bg-sidebar)' }} className="hero-orb orb-primary" />
                <motion.div style={{ y: y2 }} className="hero-orb orb-cyan" />
                <div className="hero-grid" />
            </div>

            {/* Navbar */}
            <nav className="landing-nav">
                <motion.div
                    className="nav-logo"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <img src="/asm-logo.png" alt="ASM Hardware" style={{ width: 44, height: 44, objectFit: 'contain' }} />
                    <span className="nav-logo-text">ASM System</span>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    style={{ display: 'flex', gap: 12 }}
                >
                    <button onClick={() => setModalType('cashier')} className="btn btn-secondary nav-login-btn">
                        Cashier POS
                    </button>
                    <button onClick={() => setModalType('admin')} className="btn btn-primary nav-login-btn">
                        Admin Portal
                    </button>
                </motion.div>
            </nav>

            {/* Hero Section */}
            <section className="hero-section">
                <motion.div
                    className="hero-content"
                    variants={stagger}
                    initial="hidden"
                    animate="show"
                >
                    <motion.div variants={fadeUp} className="hero-badge">
                        <Zap size={14} className="hero-badge-icon" />
                        <span>Next-Generation Inventory Platform</span>
                    </motion.div>

                    <motion.h1 variants={fadeUp} className="hero-title">
                        Manage your hardware business with <span className="gradient-text">intelligent precision.</span>
                    </motion.h1>

                    <motion.p variants={fadeUp} className="hero-subtitle">
                        Transition from slow manual ledgers to a lightning-fast, real-time Progressive Web App with built-in AI assistance for effortless decision making.
                    </motion.p>

                    <motion.div variants={fadeUp} className="hero-cta-group">
                        <button onClick={() => setModalType('cashier')} className="btn btn-secondary hero-btn" style={{ minWidth: 160 }}>
                            <UserPlus size={18} /> Cashier Login
                        </button>
                        <button onClick={() => setModalType('admin')} className="btn btn-primary hero-btn" style={{ minWidth: 160 }}>
                            <ShieldCheck size={18} /> Admin Login
                        </button>
                        <div className="hero-stats">
                            <div className="stat-item">
                                <CheckCircle2 size={16} className="text-success" />
                                <span>0s Sync Delay</span>
                            </div>
                            <div className="stat-item">
                                <CheckCircle2 size={16} className="text-success" />
                                <span>100% Mobile Ready</span>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>

                {/* Floating Mockup */}
                <motion.div
                    className="hero-visual"
                    initial={{ opacity: 0, scale: 0.9, y: 40 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2, type: 'spring' }}
                >
                    <div className="glass-mockup">
                        <div className="mockup-header">
                            <span className="mockup-dot" style={{ background: '#ef4444' }} />
                            <span className="mockup-dot" style={{ background: '#f59e0b' }} />
                            <span className="mockup-dot" style={{ background: '#10b981' }} />
                        </div>
                        <div className="mockup-body">
                            <div className="mockup-sidebar" />
                            <div className="mockup-content">
                                <div className="mockup-card skeleton" style={{ width: '30%', height: 60 }} />
                                <div className="mockup-card skeleton" style={{ width: '30%', height: 60, animationDelay: '0.2s' }} />
                                <div className="mockup-card skeleton" style={{ width: '30%', height: 60, animationDelay: '0.4s' }} />
                                <div className="mockup-chart skeleton" style={{ width: '100%', height: 180, marginTop: 16 }} />
                            </div>
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* Features Overview */}
            <section className="features-section">
                <motion.div
                    className="section-header"
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={stagger}
                >
                    <motion.h2 variants={fadeUp} className="section-title">
                        The Complete Toolkit
                    </motion.h2>
                    <motion.p variants={fadeUp} className="section-subtitle">
                        Designed for ASM Hardware from the ground up, combining modern
                        architecture with intuitive design tailored for retail efficiency.
                    </motion.p>
                </motion.div>

                <motion.div
                    className="features-grid"
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: "-50px" }}
                    variants={stagger}
                >
                    {features.map((feat, i) => (
                        <motion.div key={i} variants={fadeUp} className="feature-card">
                            <div className="feature-icon-wrapper" style={{ background: `${feat.color}15`, border: `1px solid ${feat.color}30` }}>
                                <feat.icon size={24} color={feat.color} />
                            </div>
                            <h3 className="feature-title">{feat.title}</h3>
                            <p className="feature-desc">{feat.desc}</p>
                        </motion.div>
                    ))}
                </motion.div>
            </section>

            {/* Capstone Info Section */}
            <section className="capstone-section">
                <div className="capstone-grid">
                    <motion.div
                        className="capstone-info"
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true, margin: "-50px" }}
                        variants={stagger}
                    >
                        <motion.h2 variants={fadeUp}>Revolutionizing Hardware Retail</motion.h2>
                        <motion.p variants={fadeUp}>
                            This Capstone Project addresses the critical bottlenecks faced by traditional hardware businesses: manual inventory audits, unrecorded sales, and lack of real-time insights. By deploying a decoupled React Frontend and Firebase backend, ASM Hardware can scale seamlessly.
                        </motion.p>

                        <motion.div variants={fadeUp} className="capstone-timeline">
                            <div className="timeline-item">
                                <div className="timeline-title">Legacy Issues</div>
                                <div className="timeline-desc">Dependence on ledgers caused severe discrepancies and slow audits.</div>
                            </div>
                            <div className="timeline-item">
                                <div className="timeline-title">Digital Transition</div>
                                <div className="timeline-desc">Instant cloud syncing ensures admins and cashiers share the exact same truth.</div>
                            </div>
                            <div className="timeline-item">
                                <div className="timeline-title">AI Integration</div>
                                <div className="timeline-desc">Leveraging Gemini 1.5 allows instant, conversational insight into live data.</div>
                            </div>
                        </motion.div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, x: 20 }}
                        whileInView={{ opacity: 1, scale: 1, x: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ duration: 0.6 }}
                        className="glass-card-elevated"
                        style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '20px' }}
                    >
                        <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', fontSize: '1.2rem', fontWeight: 700 }}>Quick Stats & Tech Core</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '10px' }}>
                            <div>
                                <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '4px' }}>Frontend</h4>
                                <strong style={{ color: 'var(--cyan)' }}>React + Vite PWA</strong>
                            </div>
                            <div>
                                <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '4px' }}>Backend</h4>
                                <strong style={{ color: 'var(--warning)' }}>Firebase NoSQL</strong>
                            </div>
                            <div>
                                <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '4px' }}>Intelligence</h4>
                                <strong style={{ color: 'var(--accent-hover)' }}>Gemini 1.5 AI</strong>
                            </div>
                            <div>
                                <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '4px' }}>Security</h4>
                                <strong style={{ color: 'var(--success)' }}>State Context Guards</strong>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Extended Footer */}
            <footer className="landing-footer">
                <div className="footer-main">
                    <div className="footer-col">
                        <img src="/asm-logo.png" alt="ASM" style={{ width: 120, objectFit: 'contain', marginBottom: '8px' }} />
                        <span className="footer-col-title">ASM Hardware</span>
                        <p className="footer-col-desc">Transforming manual operations into ultra-efficient data-driven systems.</p>
                    </div>

                    <div className="footer-col" style={{ alignItems: 'flex-start' }}>
                        <span className="footer-col-title">In Partnership With</span>
                        <a href="#" target="_blank" rel="noopener noreferrer">
                            <img src="https://tse2.mm.bing.net/th/id/OIP.a-6SCwp9y6j4W-9XzE_UCAHaHa?cb=thfvnext&rs=1&pid=ImgDetMain&o=7&rm=3" alt="Abra de Ilog Logo" className="partner-logo" />
                        </a>
                        <p className="footer-col-desc" style={{ marginTop: '8px' }}>
                            <strong>Municipality of Abra de Ilog</strong><br />
                        </p>
                    </div>

                    <div className="footer-col">
                        <span className="footer-col-title">Institutional Affiliation</span>
                        <p className="footer-col-desc">
                            <strong>Occidental Mindoro State College</strong><br />
                            This Progressive Web App represents a fully operational Capstone Study designed to modernize local enterprise operations.
                        </p>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p>&copy; {new Date().getFullYear()} ASM Hardware & General Merchandise. All rights reserved.</p>
                </div>
            </footer>

            <LoginModal
                isOpen={!!modalType}
                type={modalType}
                onClose={() => setModalType(null)}
            />

            {/* Global AI Floating Action Button */}
            <button
                className="chatbot-fab"
                onClick={() => setIsChatOpen(true)}
                title="Open AI Assistant"
            >
                <MessageSquare size={24} />
            </button>

            <ChatBot isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
        </div>
    )
}
