import { useSelector } from 'react-redux'
import { Navigate } from 'react-router-dom'
import Loader from './pageComponets/Loader'

/**
 * AdminRoute — Router-level admin authorization guard.
 *
 * Admin check is performed server-side via Firestore — no admin email is
 * stored in the client-side JS bundle.
 *
 * Method 1 (Active): Firestore user document prefs.role = 'admin'
 *   - Firebase Console → Firestore → users → [your-uid] → prefs → role: "admin"
 *   - This is the most secure approach — set it directly in the Firebase Console.
 *
 * Method 2 (Future): user.labels array containing 'admin'
 *   - For forward compatibility with Firebase custom claims.
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

  const isAdmin = hasAdminRole || hasAdminLabel

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return children
}

export default AdminRoute
