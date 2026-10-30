import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'

/**
 * Barcode component — canvas-based, retail-style layout.
 * Bars on top, human-readable number below. Clean white background.
 */
export default function Barcode({ value, options = {} }) {
    const canvasRef = useRef(null)

    useEffect(() => {
        if (!canvasRef.current || !value) return

        try {
            // Render barcode bars to a hidden SVG (no embedded text)
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
            JsBarcode(svg, value, {
                format:       'CODE128',
                lineColor:    '#000000',
                width:        2,          // bar module width — slim & sharp
                height:       65,         // bar height — proportional, not too tall
                displayValue: false,      // we draw number ourselves
                margin:       0,          // no SVG inner margin — we handle padding in canvas
                background:   '#ffffff',
                ...options
            })

            const svgStr = new XMLSerializer().serializeToString(svg)
            const svgW   = parseInt(svg.getAttribute('width'))  || 280
            const svgH   = parseInt(svg.getAttribute('height')) || 65

            // Canvas layout constants
            const padH   = 14   // horizontal padding on each side
            const padTop = 12   // white space above bars
            const numH   = 30   // reserved height for the number text below
            const padBot = 10   // white space below number

            const cW = svgW + padH * 2
            const cH = padTop + svgH + numH + padBot

            const canvas  = canvasRef.current
            canvas.width  = cW
            canvas.height = cH

            // Scale factor for retina/HiDPI sharpness
            const dpr = window.devicePixelRatio || 1
            canvas.width  = cW  * dpr
            canvas.height = cH  * dpr
            canvas.style.width  = `${cW}px`
            canvas.style.height = `${cH}px`

            const ctx = canvas.getContext('2d')
            ctx.scale(dpr, dpr)

            // White background
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(0, 0, cW, cH)

            // Draw barcode bars image
            const img = new Image()
            img.onload = () => {
                ctx.drawImage(img, padH, padTop, svgW, svgH)

                // Human-readable number below bars — clean, proportional
                ctx.fillStyle    = '#000000'
                ctx.font         = 'bold 16px "Arial", sans-serif'
                ctx.textAlign    = 'center'
                ctx.textBaseline = 'middle'

                const numY = padTop + svgH + numH / 2

                // Draw with slight letter-spacing for readability
                const text    = String(value)
                const metrics = ctx.measureText(text)
                const spacing = 1.5
                const totalW  = metrics.width + spacing * (text.length - 1)
                let   x       = cW / 2 - totalW / 2

                ctx.textAlign = 'left'
                for (const ch of text) {
                    ctx.fillText(ch, x, numY)
                    x += ctx.measureText(ch).width + spacing
                }
            }
            img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)))

        } catch (err) {
            console.error('Barcode generation failed:', err)
        }
    }, [value, JSON.stringify(options)])

    return (
        <canvas
            ref={canvasRef}
            style={{
                display:   'block',
                maxWidth:  '100%',
                height:    'auto',
            }}
        />
    )
}
