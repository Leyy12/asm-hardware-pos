import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { RequireAuth } from './components/guards/RequireAuth'
import AdminLayout from './components/layout/AdminLayout'
import CashierLayout from './components/layout/CashierLayout'
import InstallPWA from './components/layout/InstallPWA'

// Lazy pages — no lazy loading for simplicity; all eager for offline caching
import Landing from './pages/Landing'
import Dashboard from './pages/admin/Dashboard'
import Inventory from './pages/admin/Inventory'
import Sales from './pages/admin/Sales'
import Refunds from './pages/admin/Refunds'
import Reports from './pages/admin/Reports'
import Users from './pages/admin/Users'
import Presentation from './pages/admin/Presentation'
import Suppliers from './pages/admin/Suppliers'
import Settings from './pages/admin/Settings'
import POS from './pages/cashier/POS'
import CashierRefund from './pages/cashier/CashierRefund'
import DiscountCards from './pages/admin/DiscountCards'
import InventoryMonitoring from './pages/admin/InventoryMonitoring'

function DashboardRedirect() {
  const { currentUser, userProfile } = useAuth()
  if (!currentUser) return <Navigate to="/" replace />
  if (userProfile?.role === 'cashier') return <Navigate to="/cashier/pos" replace />
  return <Navigate to="/admin/dashboard" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              fontSize: '0.875rem',
              fontFamily: 'var(--font-primary)'
            },
            success: { iconTheme: { primary: 'var(--success)', secondary: 'white' } },
            error: { iconTheme: { primary: 'var(--danger)', secondary: 'white' } },
          }}
        />

        <InstallPWA />

        <Routes>
          {/* Root & Auth */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Navigate to="/" replace />} />

          {/* Admin Routes */}
          <Route path="/admin/*" element={
            <RequireAuth role="admin">
              <AdminLayout>
                <Routes>
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="inventory" element={<Inventory />} />
                  <Route path="monitoring" element={<InventoryMonitoring />} />
                  <Route path="sales" element={<Sales />} />
                  <Route path="refunds" element={<Refunds />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="users" element={<Users />} />
                  <Route path="suppliers" element={<Suppliers />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="discount-cards" element={<DiscountCards />} />
                  <Route path="presentation" element={<Presentation />} />
                  <Route path="*" element={<Navigate to="dashboard" replace />} />
                </Routes>
              </AdminLayout>
            </RequireAuth>
          } />

          {/* Cashier Routes */}
          <Route path="/cashier/*" element={
            <RequireAuth role="cashier">
              <CashierLayout>
                <Routes>
                  <Route path="pos" element={<POS />} />
                  <Route path="refund" element={<CashierRefund />} />
                  <Route path="*" element={<Navigate to="pos" replace />} />
                </Routes>
              </CashierLayout>
            </RequireAuth>
          } />

          {/* Internal redirect helper for manual URL input */}
          <Route path="/dashboard" element={<DashboardRedirect />} />

          {/* 404 fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
