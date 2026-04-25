import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Bot, User, Loader2, Sparkles, Trash2 } from 'lucide-react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../firebase'
import { formatCurrency } from '../../utils/helpers'
import '../../styles/chatbot.css'

const NVIDIA_MODEL = 'meta/llama-3.1-405b-instruct'

function buildSystemPrompt(products) {
    const inventory = products.map(p => ({
        name: p.name, sku: p.sku, price: formatCurrency(p.price),
        stock: p.stock, threshold: p.lowStockThreshold, unit: p.unit
    }))
    return `You are the AI inventory assistant for ASM Hardware & General Merchandise. You are a helpful, professional, and concise assistant. Only answer questions related to inventory, products, sales, and stock management.

Current inventory (${inventory.length} products):
${JSON.stringify(inventory, null, 2)}

Guidelines:
- Answer questions about product availability, price, and stock levels
- Flag items that are below their low-stock threshold
- Provide actionable restocking recommendations
- Keep responses concise but informative
- Format currency as Philippine Peso (₱)
- Do not answer unrelated questions`
}

export default function ChatBot({ isOpen, onClose }) {
    const [messages, setMessages] = useState([
        {
            id: 1,
            role: 'assistant',
            content: "Hello! I'm your ASM inventory assistant 👋 Ask me anything about product stock, pricing, or inventory status!"
        }
    ])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const messagesEndRef = useRef(null)

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const sendMessage = async () => {
        if (!input.trim() || loading) return

        const userMsg = { id: Date.now(), role: 'user', content: input.trim() }
        setMessages(prev => [...prev, userMsg])
        setInput('')
        setLoading(true)

        try {
            // Fetch live inventory snapshot
            const snap = await getDocs(collection(db, 'products'))
            const products = snap.docs.map(d => ({ id: d.id, ...d.data() }))

            // Construct API Call to Nvidia NIM
            const chatHistory = messages.filter(m => m.id !== 1).map(m => ({
                role: m.role,
                content: m.content
            }))

            const response = await fetch("/nvidia-api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${import.meta.env.VITE_NVIDIA_API_KEY}`
                },
                body: JSON.stringify({
                    model: NVIDIA_MODEL,
                    messages: [
                        { role: "system", content: buildSystemPrompt(products) },
                        ...chatHistory,
                        { role: "user", content: userMsg.content }
                    ],
                    temperature: 0.2,
                    max_tokens: 512,
                })
            })

            if (!response.ok) throw new Error("API Error")
            const data = await response.json()
            const text = data.choices[0].message.content

            setMessages(prev => [
                ...prev,
                { id: Date.now() + 1, role: 'assistant', content: text }
            ])
        } catch (err) {
            setMessages(prev => [
                ...prev,
                {
                    id: Date.now() + 1,
                    role: 'assistant',
                    content: '⚠️ I couldn\'t connect to the AI backend. Please check your NVIDIA API key in `.env`.'
                }
            ])
        } finally {
            setLoading(false)
        }
    }

    const handleKey = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    const clearChat = () => {
        setMessages([{
            id: 1,
            role: 'assistant',
            content: "Chat cleared! How can I help you with the inventory?"
        }])
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="chatbot-panel"
                    initial={{ x: '100%', opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: '100%', opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 280, damping: 28 }}
                >
                    {/* Header */}
                    <div className="chatbot-header">
                        <div className="chatbot-title">
                            <div className="chatbot-avatar-sm">
                                <Bot size={16} />
                            </div>
                            <div>
                                <span className="chatbot-name">ASM AI Assistant</span>
                                <div className="chatbot-status">
                                    <span className="status-dot" />
                                    <span>Llama 3.1 405B · Live Context</span>
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button className="chat-icon-btn" onClick={clearChat} title="Clear chat">
                                <Trash2 size={16} />
                            </button>
                            <button className="chat-icon-btn" onClick={onClose} title="Close">
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="chatbot-messages">
                        {messages.map((msg) => (
                            <motion.div
                                key={msg.id}
                                className={`chat-message ${msg.role}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.25 }}
                            >
                                <div className="msg-avatar">
                                    {msg.role === 'assistant'
                                        ? <Bot size={14} />
                                        : <User size={14} />
                                    }
                                </div>
                                <div className="msg-bubble">
                                    <p>{msg.content}</p>
                                </div>
                            </motion.div>
                        ))}

                        {loading && (
                            <motion.div
                                className="chat-message assistant"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            >
                                <div className="msg-avatar"><Bot size={14} /></div>
                                <div className="msg-bubble typing">
                                    <span /><span /><span />
                                </div>
                            </motion.div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="chatbot-input">
                        <div className="input-hint">
                            <Sparkles size={12} /> Powered by NVIDIA AI · Real-time inventory data
                        </div>
                        <div className="chat-input-row">
                            <textarea
                                className="chat-textarea"
                                placeholder="Ask about stock, pricing, availability…"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKey}
                                rows={1}
                                disabled={loading}
                            />
                            <button
                                id="chatbot-send-btn"
                                className="chat-send-btn"
                                onClick={sendMessage}
                                disabled={!input.trim() || loading}
                            >
                                {loading ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
