import { createContext, useContext, useState, useEffect } from 'react'
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'firebase/auth'
import { doc, getDoc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null)
    const [userProfile, setUserProfile] = useState(null)
    const [loading, setLoading] = useState(true)

    async function login(email, password) {
        const cred = await signInWithEmailAndPassword(auth, email, password)
        if (cred.user) {
            await updateDoc(doc(db, 'users', cred.user.uid), {
                isOnline: true,
                lastActive: serverTimestamp()
            }).catch(() => { }) // ignore if permissions fail momentarily
        }
        return cred
    }

    async function logout() {
        if (auth.currentUser) {
            await updateDoc(doc(db, 'users', auth.currentUser.uid), {
                isOnline: false,
                lastActive: serverTimestamp()
            }).catch(() => { })
        }
        await signOut(auth)
        setUserProfile(null)
    }

    useEffect(() => {
        let unsubProfile = null

        const unsubAuth = onAuthStateChanged(auth, (user) => {
            // Clean up previous profile listener if exists
            if (unsubProfile) {
                unsubProfile()
                unsubProfile = null
            }

            if (user) {
                // Listen to profile changes in real-time
                unsubProfile = onSnapshot(doc(db, 'users', user.uid), (snap) => {
                    if (snap.exists()) {
                        setUserProfile({ id: snap.id, ...snap.data() })
                    } else {
                        setUserProfile({ role: 'guest' })
                    }
                    setCurrentUser(user)
                    setLoading(false)
                }, (err) => {
                    console.error("Auth profile fetch error:", err)
                    setUserProfile(null)
                    setCurrentUser(user)
                    setLoading(false)
                })
            } else {
                setCurrentUser(null)
                setUserProfile(null)
                setLoading(false)
            }
        })

        return () => {
            unsubAuth()
            if (unsubProfile) unsubProfile()
        }
    }, [])

    const value = { currentUser, userProfile, login, logout, loading }
    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    return useContext(AuthContext)
}
