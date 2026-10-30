import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({ currentPage, totalPages, totalItems, pageSize, onPageChange }) {
    if (!totalPages || totalPages < 1) return null

    const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1
    const end = Math.min(currentPage * pageSize, totalItems)

    const getPages = () => {
        if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
        const pages = []
        if (currentPage <= 4) {
            pages.push(1, 2, 3, 4, 5, '...', totalPages)
        } else if (currentPage >= totalPages - 3) {
            pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
        } else {
            pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages)
        }
        return pages
    }

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-elevated)',
            borderRadius: '0 0 16px 16px',
            flexWrap: 'wrap',
            gap: 10
        }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Showing <strong style={{ color: 'var(--text-primary)' }}>{start}–{end}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{totalItems}</strong> entries
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    style={{
                        width: 32, height: 32, borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: 'var(--bg-surface)',
                        color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: currentPage === 1 ? 0.4 : 1,
                        transition: 'all 0.15s ease',
                        flexShrink: 0
                    }}
                >
                    <ChevronLeft size={14} />
                </button>

                {getPages().map((p, i) =>
                    p === '...' ? (
                        <span key={`ellipsis-${i}`} style={{ color: 'var(--text-muted)', padding: '0 4px', fontSize: '0.85rem', lineHeight: '32px' }}>…</span>
                    ) : (
                        <button
                            key={p}
                            onClick={() => onPageChange(p)}
                            style={{
                                width: 32, height: 32, borderRadius: 8,
                                border: currentPage === p ? 'none' : '1px solid var(--border)',
                                background: currentPage === p ? 'var(--accent)' : 'var(--bg-surface)',
                                color: currentPage === p ? '#fff' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                fontWeight: currentPage === p ? 700 : 500,
                                fontSize: '0.8rem',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: currentPage === p ? '0 4px 12px rgba(37,99,235,0.35)' : 'none',
                                transition: 'all 0.15s ease',
                                fontFamily: 'var(--font-primary)',
                                flexShrink: 0
                            }}
                        >
                            {p}
                        </button>
                    )
                )}

                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    style={{
                        width: 32, height: 32, borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: 'var(--bg-surface)',
                        color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: currentPage === totalPages ? 0.4 : 1,
                        transition: 'all 0.15s ease',
                        flexShrink: 0
                    }}
                >
                    <ChevronRight size={14} />
                </button>
            </div>
        </div>
    )
}
