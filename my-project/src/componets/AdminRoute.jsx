import { useSelector } from 'react-redux'
import { Navigate } from 'react-router-dom'
import Loader from './pageComponets/Loader'

/**
 * AdminRoute — Router-level admin authorization guard.
 *
 * Firebase Adapter के साथ 3 तरीकों से admin check होता है:
 *
 * Method 1 (Recommended): Firestore user document में prefs.role = 'admin' set करो
 *   - Firebase Console → Firestore → users → [your-uid] → prefs → role: "admin"
 *   - यह सबसे secure है
 *
 * Method 2 (Easy): VITE_ADMIN_EMAIL environment variable
 *   - .env file में: VITE_ADMIN_EMAIL="youremail@gmail.com"
 *
 * Method 3: user.labels (future Firebase compatibility)
 */
function AdminRoute({ children }) {
  const { user, isAuthenticated, loading } = useSelector((state) => state.auth)

  // Hold render until session recovery completes to avoid a false redirect
  if (loading) return <Loader type="splash" />

  // Must be authenticated first
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  // Method 1: Firestore prefs.role check (most secure — set in Firebase Console)
  const hasAdminRole = user.prefs?.role === 'admin'

  // Method 2: Firebase-style labels (for future compatibility)
  const hasAdminLabel = Array.isArray(user.labels) && user.labels.includes('admin')

  // Method 3: Email check via env variable or master admin email
  const configuredAdminEmail = (import.meta.env.VITE_ADMIN_EMAIL || 'chandumakavana61@gmail.com').replace(/['"]/g, '').trim().toLowerCase()
  const userEmail = (user.email || '').trim().toLowerCase()
  const hasAdminEmail = Boolean(userEmail && (userEmail === configuredAdminEmail || userEmail === 'chandumakavana61@gmail.com'))

  const isAdmin = hasAdminRole || hasAdminLabel || hasAdminEmail

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return children
}

export default AdminRoute
