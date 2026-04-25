import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X } from 'lucide-react'

export default function InstallPWA() {
    const [showInstall, setShowInstall] = useState(false)
    const promptRef = useRef(null)

    useEffect(() => {
        const handler = (e) => {
            e.preventDefault()
            promptRef.current = e
            setShowInstall(true)
        }

        window.addEventListener('beforeinstallprompt', handler)
        
        const triggerHandler = () => {
            if (promptRef.current) {
                handleInstallClick()
            } else {
                alert('Install prompt not available. You can also install via your browser settings.')
            }
        }
        window.addEventListener('triggerPwaInstall', triggerHandler)

        window.addEventListener('appinstalled', () => {
            promptRef.current = null
            setShowInstall(false)
        })

        return () => {
            window.removeEventListener('beforeinstallprompt', handler)
            window.removeEventListener('triggerPwaInstall', triggerHandler)
        }
    }, [])

    const handleInstallClick = async () => {
        if (!promptRef.current) return
        promptRef.current.prompt()
        const { outcome } = await promptRef.current.userChoice
        if (outcome === 'accepted') {
            setShowInstall(false)
        }
        promptRef.current = null
    }

    return (
        <AnimatePresence>
            {showInstall && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    style={{
                        position: 'fixed',
                        bottom: 24,
                        right: 24,
                        background: 'var(--bg-elevated)',
                        padding: '16px 20px',
                        borderRadius: 16,
                        boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 20,
                        zIndex: 9999,
                        maxWidth: 380
                    }}
                >
                    <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: 'var(--bg-sidebar)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <Download size={22} style={{ color: 'var(--text-primary)' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 700, margin: '0 0 4px', fontSize: '0.95rem' }}>Install App</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.3 }}>
                            Install the ASM System for a faster, app-like experience with offline support!
                        </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <button
                            className="btn btn-primary btn-sm"
                            style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                            onClick={handleInstallClick}
                        >
                            Install
                        </button>
                        <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '6px 12px', fontSize: '0.75rem', background: 'transparent', border: 'none' }}
                            onClick={() => setShowInstall(false)}
                        >
                            Not Now
                        </button>
                    </div>
                    <button
                        onClick={() => setShowInstall(false)}
                        style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                    >
                        <X size={14} />
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
