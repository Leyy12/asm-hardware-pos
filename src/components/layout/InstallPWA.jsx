import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X } from 'lucide-react'

export default function InstallPWA() {
    const [showInstall, setShowInstall] = useState(false)
    const [isIOS, setIsIOS] = useState(false)
    const promptRef = useRef(null)

    useEffect(() => {
        // Detect iOS
        const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
        setIsIOS(ios)

        const handler = (e) => {
            e.preventDefault()
            promptRef.current = e
            setShowInstall(true)
        }

        window.addEventListener('beforeinstallprompt', handler)
        
        const triggerHandler = () => {
            if (promptRef.current) {
                handleInstallClick()
            } else if (ios) {
                alert('On iPhone/iPad: Tap the "Share" icon (square with arrow) at the bottom, then scroll down and tap "Add to Home Screen".')
            } else {
                alert('To install: Open your browser menu (⋮) and tap "Install App" or "Add to Home Screen".')
            }
        }
        window.addEventListener('triggerPwaInstall', triggerHandler)

        window.addEventListener('appinstalled', () => {
            promptRef.current = null
            setShowInstall(false)
            alert('ASM System installed successfully! You can now open it from your home screen.')
        })

        // If it's iOS, we can show a special tip after a few seconds
        if (ios && !window.navigator.standalone) {
            setTimeout(() => setShowInstall(true), 3000)
        }

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
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 'calc(100% - 48px)',
                        background: 'var(--bg-elevated)',
                        padding: '16px 20px',
                        borderRadius: 16,
                        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                        zIndex: 9999,
                        maxWidth: 420
                    }}
                >
                    <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: 'var(--accent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0
                    }}>
                        <Download size={22} color="#000" />
                    </div>
                    <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 800, margin: '0 0 2px', fontSize: '1rem' }}>
                            {isIOS ? 'Add to Home Screen' : 'Install ASM System'}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.3 }}>
                            {isIOS 
                                ? 'Tap Share and then "Add to Home Screen" for the full app experience.' 
                                : 'Faster, offline-ready, and works like a real app!'}
                        </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {!isIOS && (
                            <button
                                className="btn btn-primary btn-sm"
                                style={{ padding: '8px 16px', fontSize: '0.8rem', fontWeight: 700 }}
                                onClick={handleInstallClick}
                            >
                                Install
                            </button>
                        )}
                        <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '8px 16px', fontSize: '0.8rem', background: 'transparent', border: 'none' }}
                            onClick={() => setShowInstall(false)}
                        >
                            {isIOS ? 'Got it' : 'Later'}
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
