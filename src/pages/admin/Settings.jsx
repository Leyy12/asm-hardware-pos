import { useState, useEffect } from 'react'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import { Settings as SettingsIcon, Save, Store, Calculator, Banknote, Package, Phone, MapPin, User, LayoutGrid, Eye } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'

export default function Settings() {
    const { setUserProfile, userProfile, settings: systemSettings, setSettings: setSystemSettings } = useAuth()
    const [settings, setSettings] = useState({
        storeName: 'ASM Hardware & General Merchandise',
        adminName: '',
        storeAddress: '',
        contactNumber: '',
        receiptFooter: 'Thank you for shopping with us!',
        taxRate: 0,
        currencyPrefix: '₱',
        lowStockAlert: 5,
        defaultDiscount: 5,
        pointsRedemptionValue: 0.20,
        businessType: 'hardware' // New DaaS Multi-Business parameter
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (systemSettings) {
            setSettings(prev => ({ 
                ...prev, 
                ...systemSettings,
                businessType: systemSettings.businessType || 'hardware'
            }))
            if (systemSettings.adminName) {
                setUserProfile(prev => ({ ...prev, name: systemSettings.adminName }))
            }
        }
        setLoading(false)
    }, [systemSettings])

    const handleSave = async () => {
        setSaving(true)
        try {
            await setDoc(doc(db, 'settings', 'system'), {
                ...settings,
                updatedAt: serverTimestamp()
            }, { merge: true })
            setSystemSettings(prev => ({ ...prev, ...settings }))
            if (settings.adminName?.trim()) {
                setUserProfile(prev => ({ ...prev, name: settings.adminName }))
            }
            toast.success(`System settings and ${settings.businessType.toUpperCase()} profile saved!`)
        } catch (err) {
            toast.error('Failed to update system settings.')
        } finally {
            setSaving(false)
        }
    }

    const handleChange = (k, v) => {
        setSettings(s => ({ ...s, [k]: v }))
    }

    if (loading) {
        return <div className="loading-screen"><div className="spinner" /></div>
    }

    return (
        <div style={{ width: '100%' }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title">System Settings</h1>
                    <p className="page-subtitle">Configure global parameters, store preferences, and DaaS profiles</p>
                </div>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? 'Applying...' : <><Save size={16} /> Save Changes</>}
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                {/* DaaS Multi-Business Industry Profile Settings */}
                <div className="glass-card" style={{ padding: 24, border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366F1' }}>
                            <LayoutGrid size={20} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Business Sector Config</h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>Configure local schemas and synchronization parameters for your business type</p>
                        </div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginTop: 10 }}>
                        {[
                            { key: 'hardware', label: 'Hardware Store', desc: 'Activates steel grading, metric dimensions, and hardware suppliers.', color: 'var(--cyan)' },
                            { key: 'pharmacy', label: 'Pharmacy / Drugstore', desc: 'Enables capsule dosages (mg), drug classifications, and prescription flags.', color: '#EC4899' },
                            { key: 'grocery', label: 'Grocery / SME Retail', desc: 'Optimized for high-volume items, fluid ounces/litres, and batch codes.', color: '#F59E0B' },
                            { key: 'retail', label: 'General Boutique', desc: 'Configures clothing sizing lattices (S, M, L), colors, and variations.', color: '#10B981' }
                        ].map((sector) => {
                            const isSelected = settings.businessType === sector.key;
                            return (
                                <div
                                    key={sector.key}
                                    onClick={() => handleChange('businessType', sector.key)}
                                    style={{
                                        border: isSelected ? `2px solid ${sector.color}` : '1px solid var(--border)',
                                        background: isSelected ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                                        borderRadius: 12,
                                        padding: 16,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 8,
                                        boxShadow: isSelected ? `0 10px 20px -10px ${sector.color}40` : 'none'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: sector.color }} />
                                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{sector.label}</span>
                                    </div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>{sector.desc}</p>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Tax & Localization Settings */}
                <div className="glass-card" style={{ padding: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
                            <Calculator size={20} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Tax & Localization Settings</h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>Administrative tax rates and currency formats</p>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                        <div className="form-group">
                            <label className="form-label">Tax Rate (%)</label>
                            <input type="number" min="0" className="form-input" value={settings.taxRate} onChange={e => handleChange('taxRate', Number(e.target.value))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Currency Prefix</label>
                            <input className="form-input" value={settings.currencyPrefix} onChange={e => handleChange('currencyPrefix', e.target.value)} />
                        </div>
                    </div>
                </div>

                {/* Store Info Configuration */}
                <div className="glass-card" style={{ padding: 24, overflow: 'hidden', position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                            <Store size={20} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Store Information Settings</h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>Configure store name, administrator, address, and contact details.</p>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                        <div className="form-group">
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Store size={13} style={{ opacity: 0.6 }} /> Store / Business Name
                            </label>
                            <input className="form-input" value={settings.storeName} onChange={e => handleChange('storeName', e.target.value)} placeholder="e.g. ASM Hardware & General Merchandise" />
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <User size={13} style={{ opacity: 0.6 }} /> Authorized Admin Name
                            </label>
                            <input className="form-input" value={settings.adminName} onChange={e => handleChange('adminName', e.target.value)} placeholder="e.g. Juan Dela Cruz" />
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <MapPin size={13} style={{ opacity: 0.6 }} /> Store Address
                            </label>
                            <input className="form-input" value={settings.storeAddress} onChange={e => handleChange('storeAddress', e.target.value)} placeholder="e.g. 123 Rizal St., Lucena City" />
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Phone size={13} style={{ opacity: 0.6 }} /> Contact Number
                            </label>
                            <input className="form-input" value={settings.contactNumber} onChange={e => handleChange('contactNumber', e.target.value)} placeholder="e.g. 0917-123-4567" />
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}
