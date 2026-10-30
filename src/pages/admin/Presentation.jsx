import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    BookOpen, Database, Globe, Zap, ArrowRight,
    CheckCircle2, ChevronLeft, ChevronRight,
    Workflow, GraduationCap, Cpu, RefreshCw, Award
} from 'lucide-react'

const slides = [
    {
        id: 1,
        icon: BookOpen,
        title: 'From Manual to Digital',
        subtitle: 'Transitioning from Traditional Methods',
        color: '#f59e0b',
        content: (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 24, alignItems: 'center' }}>
                {/* Traditional */}
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 16, padding: 24 }}>
                    <h4 style={{ color: '#ef4444', marginBottom: 16, fontWeight: 700 }}>❌ Traditional Methods</h4>
                    {['Manual record books (ledgers)', 'Excel/spreadsheets for tracking', 'Paper receipts and invoices', 'Monthly physical stock counts', 'Delayed management reports', 'Human calculation errors'].map((item, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{item}</span>
                        </div>
                    ))}
                </div>

                {/* Arrow */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <ArrowRight size={36} style={{ color: 'var(--accent-hover)' }} />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', maxWidth: 60 }}>REPLACE WITH</span>
                </div>

                {/* Digital */}
                <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 16, padding: 24 }}>
                    <h4 style={{ color: '#2563eb', marginBottom: 16, fontWeight: 700 }}>✅ ASM PWA System</h4>
                    {['Digital inventory database (Firebase)', 'Real-time stock monitoring', 'Automated receipt generation', 'Instant stock updates per sale', 'Live dashboard with charts', 'AI-assisted decision making'].map((item, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                            <CheckCircle2 size={14} style={{ color: '#2563eb', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{item}</span>
                        </div>
                    ))}
                </div>
            </div>
        )
    },
    {
        id: 2,
        icon: Database,
        title: 'Database Structure',
        subtitle: 'Firestore NoSQL Schema Design',
        color: '#1d4ed8',
        content: (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {[
                    {
                        name: '/users/{uid}', color: '#1d4ed8',
                        fields: ['name: string', 'email: string', 'role: "admin" | "cashier"', 'isActive: boolean', 'createdAt: timestamp']
                    },
                    {
                        name: '/products/{id}', color: '#22d3ee',
                        fields: ['name: string', 'sku: string', 'price: number', 'cost: number', 'stock: number', 'lowStockThreshold: number', 'categoryId: ref', 'imageUrl: string']
                    },
                    {
                        name: '/categories/{id}', color: '#2563eb',
                        fields: ['name: string', 'description: string', 'createdAt: timestamp']
                    },
                    {
                        name: '/sales/{id}', color: '#f59e0b',
                        fields: ['transactionId: string', 'cashierId: ref', 'items: array', 'total: number', 'status: "completed" | "refunded"', 'createdAt: timestamp']
                    },
                    {
                        name: '/refunds/{id}', color: '#ef4444',
                        fields: ['originalSaleId: string', 'items: array', 'totalRefund: number', 'reason: string', 'createdAt: timestamp']
                    },
                    {
                        name: '/stockLogs/{id}', color: '#8b5cf6',
                        fields: ['productId: ref', 'changeType: string', 'quantityBefore: number', 'quantityChange: number', 'quantityAfter: number', 'performedBy: ref', 'createdAt: timestamp']
                    },
                ].map(col => (
                    <div key={col.name} style={{ background: `${col.color}10`, border: `1px solid ${col.color}30`, borderRadius: 12, padding: 16 }}>
                        <p style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.78rem', color: col.color, marginBottom: 10 }}>{col.name}</p>
                        {col.fields.map((f, i) => (
                            <p key={i} style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: 4 }}>· {f}</p>
                        ))}
                    </div>
                ))}
            </div>
        )
    },
    {
        id: 3,
        icon: Globe,
        title: 'System Integration',
        subtitle: 'PWA + Firebase + AI Unified Architecture',
        color: '#22d3ee',
        content: (
            <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 24 }}>
                    {[
                        {
                            title: 'PWA Layer', color: '#1d4ed8', icon: '📱',
                            points: ['React JS (Vite + JSX)', 'Installable on any device', 'Service Worker caching', 'Offline support', 'Desktop + Mobile responsive']
                        },
                        {
                            title: 'Firebase Backend', color: '#f59e0b', icon: '🔥',
                            points: ['Firestore real-time database', 'Firebase Authentication', 'Cloud Storage for images', 'Role-based security rules', 'Auto-scaling infrastructure']
                        },
                        {
                            title: 'AI Assistant', color: '#22d3ee', icon: '🤖',
                            points: ['Gemini 1.5 Flash model', 'Live inventory context injection', 'Natural language queries', 'Restocking recommendations', 'Admin-only access']
                        },
                    ].map(col => (
                        <div key={col.title} style={{ background: `${col.color}10`, border: `1px solid ${col.color}30`, borderRadius: 16, padding: 20 }}>
                            <p style={{ fontSize: '2rem', marginBottom: 8 }}>{col.icon}</p>
                            <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: col.color, marginBottom: 12 }}>{col.title}</h4>
                            {col.points.map((p, i) => (
                                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                                    <Zap size={12} style={{ color: col.color, marginTop: 3, flexShrink: 0 }} />
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{p}</span>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
                    <h4 style={{ fontWeight: 700, marginBottom: 12 }}>🔗 How They Connect</h4>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                        The React PWA communicates with <span style={{ color: 'var(--accent-hover)' }}>Firebase Auth</span> for secure role-based login. All data operations use
                        the <span style={{ color: 'var(--warning)' }}>Firestore SDK</span> with real-time listeners — meaning inventory, sales, and alerts update
                        instantly across all devices without page refresh. The <span style={{ color: 'var(--cyan)' }}>AI Chatbot</span> reads a live Firestore snapshot as
                        context before calling the Gemini API, ensuring it always answers with accurate, up-to-date inventory data.
                        The PWA's Service Worker caches the app shell and Firestore responses for offline resilience.
                    </p>
                </div>
            </div>
        )
    },
    {
        id: 4,
        icon: Workflow,
        title: 'System Framework',
        subtitle: 'Input - Process - Output (IPO) Model',
        color: '#8b5cf6',
        content: (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr 1fr', gap: 20, alignItems: 'stretch' }}>
                {/* INPUT COLUMN */}
                <div style={{ background: 'rgba(37,99,235,0.04)', border: '1px solid rgba(37,99,235,0.15)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(37,99,235,0.15)', paddingBottom: 10 }}>
                        <GraduationCap size={18} style={{ color: '#2563eb' }} />
                        <h4 style={{ color: '#2563eb', fontWeight: 800, fontSize: '0.95rem', margin: 0 }}>INPUT</h4>
                    </div>

                    <div>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>🧠 Knowledge Requirements</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {[
                                'Progressive Web App (PWA) Architecture',
                                'Generative AI & LLM APIs (Google Gemini API)',
                                'NoSQL Real-Time Database Design (Firestore)',
                                'Point of Sale (POS) Cashier Interface (GUI)',
                                'Automated Stock Alerts & Notification Systems',
                                'Barcode Scanning & WebRTC Camera APIs',
                                'Offline-Resilient Transaction Management',
                                'Role-Based Access Control (RBAC) & Data Security',
                                'Sales Forecasting & Data Visualization Systems',
                                'Retail Operations & Inventory Valuation Methods'
                            ].map((item, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#2563eb' }} />
                                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ marginTop: 'auto' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10, letterSpacing: '0.05em', textTransform: 'uppercase' }}>💻 Software Requirements</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                            {[
                                {
                                    name: 'React',
                                    svg: (
                                        <svg viewBox="0 0 100 100" style={{ width: 22, height: 22, fill: 'none', stroke: '#61dafb', strokeWidth: 5 }}>
                                            <ellipse cx="50" cy="50" rx="10" ry="38" transform="rotate(30 50 50)" />
                                            <ellipse cx="50" cy="50" rx="10" ry="38" transform="rotate(90 50 50)" />
                                            <ellipse cx="50" cy="50" rx="10" ry="38" transform="rotate(150 50 50)" />
                                            <circle cx="50" cy="50" r="5" fill="#61dafb" />
                                        </svg>
                                    )
                                },
                                {
                                    name: 'Firebase',
                                    svg: (
                                        <svg viewBox="0 0 100 100" style={{ width: 22, height: 22 }}>
                                            <path d="M15,80 L50,15 L62,38 Z" fill="#FFA611" />
                                            <path d="M50,15 L85,80 L50,90 Z" fill="#F38220" />
                                            <path d="M15,80 L50,90 L62,38 Z" fill="#F05125" />
                                        </svg>
                                    )
                                },
                                {
                                    name: 'Tailwind',
                                    svg: (
                                        <svg viewBox="0 0 100 100" style={{ width: 22, height: 22 }}>
                                            <path d="M15,50 C25,35 40,35 50,50 C60,65 75,65 85,50 C75,35 60,35 50,50 C40,65 25,65 15,50 Z" fill="#38BDF8" opacity="0.8" />
                                            <path d="M15,65 C25,50 40,50 50,65 C60,80 75,80 85,65 C75,50 60,50 50,65 C40,80 25,80 15,65 Z" fill="#0EA5E9" />
                                        </svg>
                                    )
                                },
                                {
                                    name: 'Gemini',
                                    svg: (
                                        <svg viewBox="0 0 100 100" style={{ width: 22, height: 22 }}>
                                            <path d="M50,5 C50,30 70,50 95,50 C70,50 50,70 50,95 C50,70 30,50 5,50 C30,50 50,30 5,5 Z" fill="#7A4DFF" />
                                            <path d="M50,20 C50,35 65,50 80,50 C65,50 50,65 50,80 C50,65 35,50 20,50 C35,50 50,35 50,20 Z" fill="#4285F4" />
                                        </svg>
                                    )
                                },
                                {
                                    name: 'Vite',
                                    svg: (
                                        <svg viewBox="0 0 100 100" style={{ width: 22, height: 22 }}>
                                            <defs>
                                                <linearGradient id="viteG" x1="0%" y1="0%" x2="100%" y2="100%">
                                                    <stop offset="0%" stopColor="#4158D0" />
                                                    <stop offset="100%" stopColor="#FFCC70" />
                                                </linearGradient>
                                            </defs>
                                            <path d="M15,20 L50,85 L85,20 Z" fill="url(#viteG)" />
                                            <path d="M50,10 L45,45 L65,45 L42,90 L52,50 L35,50 Z" fill="#FFC900" />
                                        </svg>
                                    )
                                },
                                {
                                    name: 'Git',
                                    svg: (
                                        <svg viewBox="0 0 100 100" style={{ width: 22, height: 22 }} stroke="#F05032" strokeWidth="8" fill="none">
                                            <circle cx="30" cy="70" r="10" fill="#F05032" />
                                            <circle cx="70" cy="30" r="10" fill="#F05032" />
                                            <circle cx="30" cy="30" r="10" fill="#F05032" />
                                            <line x1="30" y1="40" x2="30" y2="60" />
                                            <path d="M30,30 Q50,30 70,30" />
                                        </svg>
                                    )
                                },
                                {
                                    name: 'VS Code',
                                    svg: (
                                        <svg viewBox="0 0 100 100" style={{ width: 22, height: 22 }} fill="#007ACC">
                                            <path d="M15,30 L45,10 L85,25 L85,75 L45,90 L15,70 L35,50 Z M45,35 L45,65 L65,50 Z" />
                                        </svg>
                                    )
                                },
                                {
                                    name: 'PWA',
                                    svg: (
                                        <svg viewBox="0 0 100 100" style={{ width: 22, height: 22 }} fill="none" stroke="#5A0FC8" strokeWidth="8">
                                            <circle cx="50" cy="50" r="40" />
                                            <path d="M30,50 L45,65 L70,35" strokeWidth="10" stroke="#5A0FC8" />
                                        </svg>
                                    )
                                }
                            ].map((tech) => (
                                <div key={tech.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 4px', gap: 4 }}>
                                    {tech.svg}
                                    <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textAlign: 'center', fontWeight: 600 }}>{tech.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* PROCESS COLUMN */}
                <div style={{ background: 'rgba(217,119,6,0.04)', border: '1px solid rgba(217,119,6,0.15)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(217,119,6,0.15)', paddingBottom: 10 }}>
                        <RefreshCw size={18} style={{ color: '#d97706' }} />
                        <h4 style={{ color: '#d97706', fontWeight: 800, fontSize: '0.95rem', margin: 0 }}>PROCESS</h4>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ background: 'rgba(217,119,6,0.15)', color: '#d97706', fontSize: '0.65rem', fontWeight: 800, padding: '2px 6px', borderRadius: 4 }}>METHODOLOGY</span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>Agile Software Development</span>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                            System development followed iterative cycles enabling fast adaptation to requirements.
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                        {[
                            { step: '01', title: 'Sprint Planning', desc: 'Define sprint goals, tasks, and deliverables based on priorities.' },
                            { step: '02', title: 'Daily Standups', desc: 'Sync development progress and resolve immediate blockers.' },
                            { step: '03', title: 'Incremental Coding', desc: 'Develop high-priority modular features and write rules.' },
                            { step: '04', title: 'Sprint Review & Demo', desc: 'Validate prototype performance with store owners.' }
                        ].map((s) => (
                            <div key={s.step} style={{ display: 'flex', gap: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px', alignItems: 'flex-start' }}>
                                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.85rem', color: '#d97706', marginTop: 1 }}>{s.step}</span>
                                <div>
                                    <h5 style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{s.title}</h5>
                                    <p style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.3 }}>{s.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* OUTPUT COLUMN */}
                <div style={{ background: 'rgba(139,92,246,0.04)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(139,92,246,0.15)', paddingBottom: 10, width: '100%', alignSelf: 'flex-start' }}>
                        <Award size={18} style={{ color: '#8b5cf6' }} />
                        <h4 style={{ color: '#8b5cf6', fontWeight: 800, fontSize: '0.95rem', margin: 0 }}>OUTPUT</h4>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, margin: 'auto 0' }}>
                        <div style={{ position: 'relative', width: 90, height: 90, borderRadius: '50%', background: 'rgba(139,92,246,0.1)', border: '2px solid rgba(139,92,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(139,92,246,0.2)' }}>
                            <img src="/asm-logo.png" alt="ASM Hardware Logo" style={{ width: 68, height: 'auto', objectFit: 'contain' }} />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)', margin: '0 0 4px 0' }}>ASM POS System</h4>
                            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PWA Software Product</p>
                        </div>
                    </div>

                    <div style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, padding: 12, marginTop: 'auto' }}>
                        <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>🌟 Deliverables</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {[
                                'Real-time Point of Sale (POS)',
                                'Barcode Scanner Integration',
                                'Automated Inventory & Invoicing',
                                'Context-Aware AI Assistant'
                            ].map((del, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#8b5cf6' }} />
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{del}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )
    }
]

export default function Presentation() {
    const [current, setCurrent] = useState(0)
    const slide = slides[current]
    const Icon = slide.icon

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <div className="page-header" style={{ marginBottom: 32 }}>
                <div>
                    <h1 className="page-title">Defense Slides</h1>
                    <p className="page-subtitle">Presentation materials for research panel evaluation</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {slides.map((_, i) => (
                        <button key={i} onClick={() => setCurrent(i)}
                            style={{ width: 32, height: 8, borderRadius: 4, border: 'none', cursor: 'pointer', background: current === i ? 'var(--accent)' : 'var(--border)', transition: 'all 0.2s ease' }} />
                    ))}
                </div>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={slide.id}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.3 }}
                    className="glass-card"
                    style={{ padding: 40, minHeight: 520 }}
                >
                    {/* Slide header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
                        <div style={{ width: 52, height: 52, background: `${slide.color}22`, border: `1px solid ${slide.color}44`, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon size={24} style={{ color: slide.color }} />
                        </div>
                        <div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{slide.subtitle}</p>
                            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800 }}>{slide.title}</h2>
                        </div>
                        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 900, color: `${slide.color}22` }}>
                            0{slide.id}
                        </span>
                    </div>

                    {/* Slide content */}
                    {slide.content}
                </motion.div>
            </AnimatePresence>

            {/* Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}>
                <button className="btn btn-secondary"
                    disabled={current === 0}
                    onClick={() => setCurrent(c => c - 1)}
                >
                    <ChevronLeft size={16} /> Previous
                </button>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{current + 1} / {slides.length}</span>
                <button className="btn btn-primary"
                    disabled={current === slides.length - 1}
                    onClick={() => setCurrent(c => c + 1)}
                >
                    Next <ChevronRight size={16} />
                </button>
            </div>
        </div>
    )
}
