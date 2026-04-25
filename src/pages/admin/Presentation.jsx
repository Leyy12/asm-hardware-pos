import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    BookOpen, Database, Globe, Zap, ArrowRight,
    CheckCircle2, ChevronLeft, ChevronRight
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
