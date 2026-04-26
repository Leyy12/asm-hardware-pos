import { useEffect, useRef, useCallback } from 'react'
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
    const containerId = 'qr-scanner-container'

    const startScanner = useCallback(async () => {
        if (scannerRef.current) return // Prevent multiple instances
        try {
            const scanner = new Html5Qrcode(containerId)
            scannerRef.current = scanner
            await scanner.start(
                { facingMode: 'environment' },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    disableFlip: false
                },
                (decodedText) => { onScan(decodedText) },
                undefined
            )
        } catch (err) {
            if (onError) onError(err)
        }
    }, [onScan, onError])

    const stopScanner = useCallback(async () => {
        try {
            if (scannerRef.current) {
                await scannerRef.current.stop()
                scannerRef.current.clear()
                scannerRef.current = null
            }
        } catch (_) { 
            // ignore 
        } finally {
            // Force DOM cleanup to remove orphaned video tags
            const el = document.getElementById(containerId)
            if (el) el.innerHTML = ''
            scannerRef.current = null
        }
    }, [])

    useEffect(() => {
        if (active) startScanner()
        else stopScanner()
        return () => { stopScanner() }
    }, [active, startScanner, stopScanner])

    return (
        <div style={{ borderRadius: 12, overflow: 'hidden', border: '2px solid var(--bg-sidebar)' }}>
            <div id={containerId} style={{ width: '100%' }} />
            <p style={{
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.75rem',
                padding: '6px 0',
                background: 'var(--bg-elevated)',
                margin: 0
            }}>
                📷 Point camera at a product QR code to scan
            </p>
        </div>
    )
}
