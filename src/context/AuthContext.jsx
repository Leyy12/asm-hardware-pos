import { createContext, useContext, useState, useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(() => ({ uid: 'mock-admin-123', email: 'admin@asm.com' }))
    const [userProfile, setUserProfile] = useState(() => ({ id: 'mock-admin-123', role: 'admin', name: 'Administrator' }))
    const [settings, setSettings] = useState({
        storeName: 'ASM Hardware & General Merchandise',
        adminName: '',
        storeAddress: '',
        contactNumber: '',
        receiptFooter: 'Thank you for shopping with us!',
        taxRate: 0,
        currencyPrefix: '₱',
        lowStockAlert: 5
    })
    const [loading, setLoading] = useState(false)

    async function login(email, password, type = 'admin') {
        // MOCK LOGIN WITH STRICT VALIDATION
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // Strict Credential Checks
                if (type === 'admin') {
                    if (email !== 'admin@asm.com' || password !== 'admin123') {
                        return reject(new Error('Invalid Admin credentials. Access denied.'))
                    }
                } else if (type === 'cashier') {
                    if (email !== 'cashier@asm.com' || password !== 'cashier123') {
                        return reject(new Error('Invalid Cashier credentials. Access denied.'))
                    }
                }

                const mockUser = { uid: `mock-${type}-123`, email }
                const name = type === 'cashier' ? 'July Lee' : 'Administrator'
                setCurrentUser(mockUser)
                setUserProfile({ id: `mock-${type}-123`, role: type, name })
                resolve({ user: mockUser })
            }, 500)
        })
    }

    async function logout() {
        // MOCK LOGOUT
        setCurrentUser(null)
        setUserProfile(null)
    }

    useEffect(() => {
        const unsubscribe = onSnapshot(doc(db, 'settings', 'system'), snap => {
            if (snap.exists()) {
                setSettings(prev => ({ ...prev, ...snap.data() }))
            }
        }, err => {
            console.error('Failed to load system settings:', err)
        })

        return () => unsubscribe()
    }, [])

    const value = { currentUser, userProfile, setUserProfile, login, logout, loading, settings, setSettings }
    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    return useContext(AuthContext)
}
