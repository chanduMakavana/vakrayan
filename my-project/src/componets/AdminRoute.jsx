import { useSelector } from 'react-redux'
import { Navigate } from 'react-router-dom'

/**
 * AdminRoute — Router-level admin authorization guard.
 *
 * Security model (layered, defense-in-depth):
 *
 * Layer 1 (Primary): Appwrite Server-Side Labels
 *   - Assign the 'admin' label to admin users in Appwrite Console
 *     (Users → select user → Labels → add 'admin')
 *   - Labels are part of the server-signed JWT — cannot be spoofed via DevTools
 *   - This is the recommended Appwrite approach for role-based access
 *
 * Layer 2 (Fallback): Environment Variable Email Check
 *   - Used if labels are not yet configured
 *   - Still server-resolved (email comes from the Appwrite session JWT)
 *   - VITE_ADMIN_EMAIL must match the Appwrite account email exactly
 *
 * ⚠️  Neither check alone is sufficient to protect server-side data.
 *     All sensitive admin operations should be gated by Appwrite Function
 *     server-side rules (collection-level permissions) as the final guard.
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

  // Layer 1: Check Appwrite server-side user labels (cannot be spoofed client-side)
  const hasAdminLabel = Array.isArray(user.labels) && user.labels.includes('admin')

  // Layer 2: Fallback to env-var email check (still server-resolved email, not spoofable)
  const adminEmail = (import.meta.env.VITE_ADMIN_EMAIL || '').replace(/['"]/g, '').trim()
  const hasAdminEmail = adminEmail && user.email === adminEmail

  const isAdmin = hasAdminLabel || hasAdminEmail

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return children
}

export default AdminRoute
