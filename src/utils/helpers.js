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

export const getStockStatus = (stock, threshold) => {
    if (stock <= 0) return { label: 'Out of Stock', variant: 'danger' }
    if (stock <= threshold) return { label: 'Low Stock', variant: 'warning' }
    return { label: 'In Stock', variant: 'success' }
}

export const truncate = (str, max = 40) =>
    str?.length > max ? str.slice(0, max) + '…' : str || '—'
