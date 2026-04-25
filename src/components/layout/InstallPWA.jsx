import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X } from 'lucide-react'

export default function InstallPWA() {
    const [deferredPrompt, setDeferredPrompt] = useState(null)
    const [showInstall, setShowInstall] = useState(false)

    useEffect(() => {
        const handler = (e) => {
            // Prevent Chrome 67 and earlier from automatically showing the prompt
            e.preventDefault()
            // Stash the event so it can be triggered later
            setDeferredPrompt(e)
            // Show our custom UI
            setShowInstall(true)
        }

        window.addEventListener('beforeinstallprompt', handler)

        // Check if already installed
        window.addEventListener('appinstalled', () => {
            setDeferredPrompt(null)
            setShowInstall(false)
        })

        return () => window.removeEventListener('beforeinstallprompt', handler)
    }, [])

    const handleInstallClick = async () => {
        if (!deferredPrompt) return
        // Show the prompt
        deferredPrompt.prompt()
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === 'accepted') {
            setShowInstall(false)
        }
        // We no longer need the prompt. Clear it up.
        setDeferredPrompt(null)
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
