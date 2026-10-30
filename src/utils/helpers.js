export const formatCurrency = (amount) => {
    const num = Number(amount) || 0
    return `₱${num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export const formatDate = (timestamp) => {
    if (!timestamp) return '—'
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('en-PH', {
        year: 'numeric', month: 'short', day: 'numeric'
    })
}

export const formatDateTime = (timestamp) => {
    if (!timestamp) return '—'
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleString('en-PH', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    })
}

export const formatTime = (timestamp) => {
    if (!timestamp) return '—'
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
}

export const generateTransactionId = () => {
    const now = new Date()
    const y = now.getFullYear().toString().slice(-2)
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    return `ASM-${y}${m}${d}-${rand}`
}

// Generates a unique 8-digit numeric barcode number (retail-style, e.g. "00134569")
export const generateBarcodeNumber = () => {
    const ts  = Date.now().toString().slice(-5)          // last 5 digits of timestamp
    const rnd = Math.floor(Math.random() * 1000).toString().padStart(3, '0') // 3-digit random
    return (ts + rnd).padStart(8, '0')                  // always 8 digits
}

export const generateExchangeReference = () => {
    const now = new Date()
    const y = now.getFullYear().toString().slice(-2)
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    const rand = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
    return `EX-${y}${m}${d}-${rand}`
}

export const exportToCSV = (data, filename) => {
    if (!data.length) return
    const headers = Object.keys(data[0])
    const csvContent = [
        headers.join(','),
        ...data.map(row =>
            headers.map(h => {
                const val = row[h] ?? ''
                return `"${String(val).replace(/"/g, '""')}"`
            }).join(',')
        )
    ].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
}

export const resolveLowStockThreshold = (threshold, defaultThreshold = 10) => {
    if (threshold === '' || threshold === null || threshold === undefined) return defaultThreshold
    const parsed = Number(threshold)
    return Number.isFinite(parsed) ? parsed : defaultThreshold
}

export const isLowStock = (stock, threshold, defaultThreshold = 10) => {
    const resolved = resolveLowStockThreshold(threshold, defaultThreshold)
    return stock > 0 && stock <= resolved
}

export const getStockStatus = (stock, threshold, defaultThreshold = 10) => {
    const resolved = resolveLowStockThreshold(threshold, defaultThreshold)
    if (stock <= 0) return { label: 'OUT OF STOCK', variant: 'danger', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' }
    if (stock <= resolved) return { label: 'LOW STOCK', variant: 'warning', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' }
    return { label: 'OPTIMAL', variant: 'success', color: 'var(--success)', bg: 'rgba(16, 185, 129, 0.12)' }
}

export const truncate = (str, max = 40) =>
    str?.length > max ? str.slice(0, max) + '…' : str || '—'
