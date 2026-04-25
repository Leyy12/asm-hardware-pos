import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export function RequireAuth({ children, role }) {
    const { currentUser, userProfile } = useAuth()

    if (!currentUser) return <Navigate to="/" replace />
    if (role && userProfile?.role !== role) {
        // If they have no valid role, send them back to landing instead of other dashboards to avoid loops
        if (!userProfile?.role || userProfile.role === 'guest') {
            return <Navigate to="/" replace />
        }
        return <Navigate to={userProfile.role === 'admin' ? '/admin/dashboard' : '/cashier/pos'} replace />
    }
    return children
}
