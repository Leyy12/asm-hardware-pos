import { useState, useEffect } from 'react'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import { Settings as SettingsIcon, Save, Store, Receipt, Calculator, Banknote } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Settings() {
    const [settings, setSettings] = useState({
        storeName: 'ASM Hardware & General Merchandise',
        receiptFooter: 'Thank you for shopping with us!',
        taxRate: 0,
        currencyPrefix: '₱',
        lowStockAlert: 5
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const snap = await getDoc(doc(db, 'settings', 'system'))
                if (snap.exists()) {
                    setSettings(snap.data())
                }
            } catch (err) {
                console.error("Error loading settings:", err)
            } finally {
                setLoading(false)
            }
        }
        loadSettings()
    }, [])

    const handleSave = async () => {
        setSaving(true)
        try {
            await setDoc(doc(db, 'settings', 'system'), {
                ...settings,
                updatedAt: serverTimestamp()
            }, { merge: true })
            toast.success('System settings saved successfully!')
        } catch (err) {
            toast.error('Failed to update system settings.')
        } finally {
            setSaving(false)
        }
    }

    const handleChange = (k, v) => setSettings(s => ({ ...s, [k]: v }))

    if (loading) {
        return <div className="loading-screen"><div className="spinner" /></div>
    }

    return (
        <div style={{ maxWidth: 800 }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title">System Settings</h1>
                    <p className="page-subtitle">Configure global parameters and store preferences</p>
                </div>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? 'Applying...' : <><Save size={16} /> Save Changes</>}
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* General Store Details */}
                <div className="glass-card" style={{ padding: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(37, 99, 235, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                            <Store size={20} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Store Identity</h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>Basic shop information applied locally</p>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) minmax(200px, 1fr)', gap: 20 }}>
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label className="form-label">Store Registered Name</label>
                            <input className="form-input" value={settings.storeName} onChange={e => handleChange('storeName', e.target.value)} />
                        </div>
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label className="form-label">Receipt Footer Message</label>
                            <textarea className="form-textarea" rows={2} value={settings.receiptFooter} onChange={e => handleChange('receiptFooter', e.target.value)} />
                        </div>
                    </div>
                </div>

                {/* Financial Config */}
                <div className="glass-card" style={{ padding: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
                            <Calculator size={20} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Sales & Finance Configuration</h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>Taxes, currency formats, and pricing rules</p>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                        <div className="form-group">
                            <label className="form-label">Tax Rate (%)</label>
                            <input type="number" min="0" className="form-input" value={settings.taxRate} onChange={e => handleChange('taxRate', Number(e.target.value))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Default Discount Rate (%)</label>
                            <input type="number" min="1" max="100" className="form-input" value={settings.defaultDiscount || 10} onChange={e => handleChange('defaultDiscount', Number(e.target.value))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Currency Prefix</label>
                            <input className="form-input" value={settings.currencyPrefix} onChange={e => handleChange('currencyPrefix', e.target.value)} />
                        </div>
                    </div>
                </div>

                {/* System Config */}
                <div className="glass-card" style={{ padding: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)' }}>
                            <SettingsIcon size={20} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>System Thresholds</h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>Behavior and alerts setup</p>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr)', gap: 20 }}>
                        <div className="form-group">
                            <label className="form-label">Default Low Stock Alert Threshold</label>
                            <input type="number" min="0" className="form-input" value={settings.lowStockAlert} onChange={e => handleChange('lowStockAlert', Number(e.target.value))} />
                            <small style={{ color: 'var(--text-muted)' }}>If a product drops below this unit threshold, it gets flagged in the dashboard.</small>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}
