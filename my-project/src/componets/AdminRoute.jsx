import { useSelector } from 'react-redux'
import { Navigate } from 'react-router-dom'

/**
 * AdminRoute — Router-level admin authorization guard.
 *
 * Validates admin access using ONLY the VITE_ADMIN_EMAIL env variable.
 * The hardcoded email literal has been intentionally removed.
 *
 * For future scale: replace the email check with an Appwrite Labels
 * check → user.labels?.includes('admin') — and assign the 'admin'
 * label to admin users in the Appwrite console.
 *
 * Usage in App.jsx:
 *   <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
 */
function AdminRoute({ children }) {
  const { user, isAuthenticated, loading } = useSelector((state) => state.auth)

  // Hold render until session recovery completes to avoid a false redirect
  if (loading) return null

  // Must be authenticated first
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  // Admin check: env var only — no hardcoded emails in source code
  const adminEmail = (import.meta.env.VITE_ADMIN_EMAIL || '').replace(/['"]/g, '').trim()
  const isAdmin = adminEmail && user.email === adminEmail

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return children
}

export default AdminRoute
