import { useSelector } from 'react-redux'
import { Navigate, useLocation } from 'react-router-dom'

/**
 * ProtectedRoute — Router-level authentication guard.
 *
 * Blocks unauthenticated access BEFORE the target component mounts
 * or its bundle is evaluated. Preserves the intended destination in
 * `location.state.from` so a post-login redirect can return the user
 * to where they were trying to go.
 *
 * Usage in App.jsx:
 *   <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
 */
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useSelector((state) => state.auth)
  const location = useLocation()

  // While the session is being restored on mount, render nothing —
  // prevents a flash-redirect to /login before auth state is resolved.
  if (loading) return null

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    )
  }

  return children
}

export default ProtectedRoute
