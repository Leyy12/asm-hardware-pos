import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

/**
 * QRScanner - camera-based QR/barcode reader component
 * Props:
 *   onScan(decodedText) - called on successful scan
 *   onError(err)        - called on errors
 *   active              - boolean, start/stop camera
 */
export default function QRScanner({ onScan, onError, active }) {
    const scannerRef = useRef(null)
    const mountedRef = useRef(true)
    const CONTAINER_ID = 'qr-reader-box'
    const [status, setStatus] = useState('idle') // idle | starting | running | error

    const startScanner = async () => {
        if (scannerRef.current) return
        if (!document.getElementById(CONTAINER_ID)) return

        setStatus('starting')

        const config = {
            fps: 10,
            qrbox: { width: 260, height: 130 },
            disableFlip: false,
            aspectRatio: 1.0,
        }

        let scanner = null
        try {
            scanner = new Html5Qrcode(CONTAINER_ID, { verbose: false })

            // Try cameras in order: environment → user → first available
            const camerasToTry = [
                { facingMode: 'environment' },
                { facingMode: 'user' },
            ]

            let started = false
            for (const cam of camerasToTry) {
                if (!mountedRef.current) break
                try {
                    await scanner.start(cam, config, (decoded) => {
                        if (mountedRef.current) onScan(decoded)
                    }, undefined)
                    started = true
                    break
                } catch {
                    // try next
                }
            }

            // Last resort: use device list
            if (!started && mountedRef.current) {
                try {
                    const devices = await Html5Qrcode.getCameras()
                    if (devices && devices.length > 0) {
                        await scanner.start(devices[0].id, config, (decoded) => {
                            if (mountedRef.current) onScan(decoded)
                        }, undefined)
                        started = true
                    }
                } catch {
                    // ignore
                }
            }

            if (!started) throw new Error('No camera available')
            if (!mountedRef.current) {
                await scanner.stop().catch(() => {})
                scanner.clear()
                return
            }

            scannerRef.current = scanner
            setStatus('running')
        } catch (err) {
            if (scanner) {
                scanner.clear()
            }
            scannerRef.current = null
            setStatus('error')
            if (mountedRef.current && onError) onError(err)
        }
    }

    const stopScanner = async () => {
        const sc = scannerRef.current
        scannerRef.current = null
        setStatus('idle')
        if (!sc) return
        try {
            if (sc.isScanning) await sc.stop()
            sc.clear()
        } catch { /* ignore */ }
        const el = document.getElementById(CONTAINER_ID)
        if (el) el.innerHTML = ''
    }

    useEffect(() => {
        mountedRef.current = true
        return () => {
            mountedRef.current = false
        }
    }, [])

    useEffect(() => {
        if (!active) {
            stopScanner()
            return
        }

        // Delay ensures the DOM div is fully rendered before Html5Qrcode accesses it
        const timer = setTimeout(() => {
            startScanner()
        }, 150)

        return () => {
            clearTimeout(timer)
            stopScanner()
        }
    }, [active]) // eslint-disable-line

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-accent)',
            borderRadius: 16,
            overflow: 'hidden',
            padding: '16px 16px 0 16px',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 12,
                color: 'var(--text-secondary)',
                fontSize: '0.8rem',
                fontWeight: 600,
            }}>
                <span>📷</span>
                {status === 'starting' ? 'Requesting camera access…' : 'Point camera at barcode to scan'}
            </div>

            {/* Camera viewport */}
            <div style={{
                width: '100%',
                maxWidth: 320,
                borderRadius: 12,
                overflow: 'hidden',
                border: '2px solid var(--border-accent)',
                background: '#000',
                minHeight: 240,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <div id={CONTAINER_ID} style={{ width: '100%' }} />
            </div>

            {/* Status hint */}
            <p style={{
                textAlign: 'center',
                color: status === 'error' ? 'var(--danger)' : 'var(--text-muted)',
                fontSize: '0.72rem',
                padding: '10px 0 14px',
                margin: 0,
                letterSpacing: '0.04em',
            }}>
                {status === 'error'
                    ? '⚠️ Camera blocked — check browser permissions'
                    : status === 'running'
                        ? '✅ Camera active — hold barcode steady'
                        : 'Initializing…'}
            </p>
        </div>
    )
}
