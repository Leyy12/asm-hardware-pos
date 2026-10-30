import { TrendingUp } from 'lucide-react'

export default function TopSellingProducts() {
    const products = [
        { rank: 1, name: 'Mocha Blanch (1L)', category: 'Paint', qty: 14, revenue: 3080 },
        { rank: 2, name: 'PVC Pipe 1/2"', category: 'Plumbing', qty: 32, revenue: 1920 },
        { rank: 3, name: 'Flat Screwdriver Set', category: 'Tools', qty: 9, revenue: 1350 },
        { rank: 4, name: 'Masking Tape 2"', category: 'Adhesives', qty: 47, revenue: 940 },
        { rank: 5, name: 'Sand Paper #80', category: 'Abrasives', qty: 25, revenue: 625 },
        { rank: 6, name: 'GI Wire Gauge 16', category: 'Hardware', qty: 11, revenue: 550 }
    ]

    const getRankBadgeColor = (rank) => {
        if (rank === 1) return { bg: 'linear-gradient(135deg, rgba(250, 204, 21, 0.2) 0%, rgba(217, 119, 6, 0.2) 100%)', text: '#fbbf24' }
        return { bg: 'rgba(71, 85, 105, 0.3)', text: '#cbd5e1' }
    }

    const formatCurrency = (value) => {
        return `₱${value.toLocaleString()}`
    }

    return (
        <div style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.9) 100%)',
            borderRadius: 16,
            border: '1px solid rgba(71, 85, 105, 0.3)',
            padding: 24,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 24,
                paddingBottom: 16,
                borderBottom: '1px solid rgba(71, 85, 105, 0.2)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 32,
                        height: 32,
                        background: 'rgba(250, 204, 21, 0.15)',
                        borderRadius: 8,
                        color: '#fbbf24'
                    }}>
                        <TrendingUp size={18} strokeWidth={2.5} />
                    </div>
                    <h2 style={{
                        fontSize: '1.05rem',
                        fontWeight: 800,
                        color: '#ffffff',
                        margin: 0,
                        textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                        letterSpacing: '-0.5px'
                    }}>
                        Top Selling Products
                    </h2>
                </div>
                <button style={{
                    background: 'rgba(37, 99, 235, 0.2)',
                    color: '#93c5fd',
                    border: '1px solid rgba(37, 99, 235, 0.4)',
                    borderRadius: 20,
                    padding: '6px 14px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(37, 99, 235, 0.3)'
                    e.currentTarget.style.borderColor = 'rgba(37, 99, 235, 0.6)'
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(37, 99, 235, 0.2)'
                    e.currentTarget.style.borderColor = 'rgba(37, 99, 235, 0.4)'
                }}>
                    Today
                </button>
            </div>

            {/* Table Header */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '60px 1fr 80px 120px',
                gap: 16,
                paddingBottom: 12,
                marginBottom: 4,
                borderBottom: '1px solid rgba(71, 85, 105, 0.2)'
            }}>
                <div style={{
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em'
                }}>#</div>
                <div style={{
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em'
                }}>Product</div>
                <div style={{
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    textAlign: 'center'
                }}>Qty</div>
                <div style={{
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    textAlign: 'right'
                }}>Revenue</div>
            </div>

            {/* Product Rows */}
            {products.map((product, index) => {
                const badgeColor = getRankBadgeColor(product.rank)
                return (
                    <div key={index}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '60px 1fr 80px 120px',
                            gap: 16,
                            alignItems: 'center',
                            padding: '14px 0',
                            borderBottom: '1px solid rgba(71, 85, 105, 0.15)',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = 'rgba(37, 99, 235, 0.05)'
                            e.currentTarget.style.paddingLeft = '8px'
                            e.currentTarget.style.paddingRight = '8px'
                            e.currentTarget.style.borderRadius = '8px'
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = 'transparent'
                            e.currentTarget.style.paddingLeft = '0'
                            e.currentTarget.style.paddingRight = '0'
                            e.currentTarget.style.borderRadius = '0'
                        }}>
                            {/* Rank Badge */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 40,
                                height: 40,
                                background: badgeColor.bg,
                                borderRadius: 8,
                                border: `1px solid ${badgeColor.text}40`,
                                fontWeight: 800,
                                fontSize: '0.8rem',
                                color: badgeColor.text,
                                boxShadow: product.rank === 1 ? `0 0 12px ${badgeColor.text}30` : 'none'
                            }}>
                                #{product.rank}
                            </div>

                            {/* Product Info */}
                            <div>
                                <p style={{
                                    margin: 0,
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    color: '#ffffff',
                                    marginBottom: 4
                                }}>
                                    {product.name}
                                </p>
                                <p style={{
                                    margin: 0,
                                    fontSize: '0.75rem',
                                    color: '#64748b',
                                    fontWeight: 500
                                }}>
                                    {product.category}
                                </p>
                            </div>

                            {/* Quantity */}
                            <div style={{
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                color: '#cbd5e1',
                                textAlign: 'center'
                            }}>
                                {product.qty}
                            </div>

                            {/* Revenue */}
                            <div style={{
                                fontSize: '0.85rem',
                                fontWeight: 800,
                                color: '#06b6d4',
                                textAlign: 'right',
                                textShadow: '0 0 12px rgba(6, 182, 212, 0.3)',
                                letterSpacing: '0.5px'
                            }}>
                                {formatCurrency(product.revenue)}
                            </div>
                        </div>
                    </div>
                )
            })}

            {/* Footer */}
            <div style={{
                marginTop: 16,
                paddingTop: 16,
                borderTop: '1px solid rgba(71, 85, 105, 0.2)',
                display: 'flex',
                justifyContent: 'flex-end'
            }}>
                <button style={{
                    background: 'transparent',
                    color: '#93c5fd',
                    border: 'none',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '4px 8px',
                    transition: 'color 0.2s ease',
                    textDecoration: 'underline'
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#bfdbfe'}
                onMouseLeave={e => e.currentTarget.style.color = '#93c5fd'}>
                    View Full Report →
                </button>
            </div>
        </div>
    )
}
