import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { login as loginAction } from '../../features/login'
import authService from '../../appwrite/auth'
import { useToast } from '../../context/ToastContext'
import { hydrateCartFromDb } from '../../utils/cartMergeHelper'

function Login() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm()

  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  const { showToast } = useToast()
  const { isAuthenticated } = useSelector((state) => state.auth)

  // Local states for form handling and error management
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState("")
  const [isForgotPassword, setIsForgotPassword] = useState(false)

  // ✅ SEO: Dynamic page title
  useEffect(() => { document.title = 'Login — Vakrayan' }, [])

  const onSubmit = async (data) => {
    setServerError("") 
    setLoading(true)   

    try {
      // Call auth service with trimmed credentials
      const session = await authService.login({ 
        email: data.email.trim(), 
        password: data.password.trim() 
      });
      
      if (session) {
        // Fetch authenticated user details and update Redux store
        const userData = await authService.getCurrentUser();
        if (userData) {
          dispatch(loginAction({ user: userData }));
          // ✅ DEDUP FIX: replaced 3-line merge+fetch+dispatch with shared hydrateCartFromDb
          try { await hydrateCartFromDb(userData.$id, dispatch) } catch (e) {
            console.error("Cart merge on login failed:", e)
          }
        }
        
        reset();
        const from = location.state?.from?.pathname || '/';
        sessionStorage.setItem('just_logged_in', 'true');
        navigate(from, { replace: true });
      }
    } catch (error) {
      console.error("Login Error:", error);
      let errorMsg = error?.message || "Invalid email or password.";
      if (errorMsg.includes('auth/invalid-credential') || errorMsg.includes('auth/wrong-password') || errorMsg.includes('auth/user-not-found')) {
        errorMsg = "Invalid email or password. Please try again.";
      } else if (errorMsg.includes('auth/too-many-requests')) {
        errorMsg = "Too many failed attempts. Please try again later.";
      } else if (errorMsg.includes('Firebase: Error')) {
        errorMsg = "Authentication failed. Please try again.";
      }
      setServerError(errorMsg);
    } finally {
      setLoading(false);
    }
  };  

  const onForgotSubmit = async (data) => {
    setServerError("");
    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      await authService.createRecovery(data.email.trim(), redirectUrl);
      showToast("📧 Recovery link sent! Check your email inbox.", "success");
      setIsForgotPassword(false);
      reset();
    } catch (error) {
      console.error("Recovery link error:", error);
      let errorMsg = error?.message || "Failed to trigger password recovery. Ensure your email is correct.";
      if (errorMsg.includes('auth/user-not-found') || errorMsg.includes('auth/invalid-email')) {
        errorMsg = "Failed to trigger password recovery. Ensure your email is correct.";
      } else if (errorMsg.includes('Firebase: Error')) {
        errorMsg = "Failed to send recovery email. Please try again.";
      }
      setServerError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setServerError("");
    setLoading(true);
    try {
      await authService.loginWithGoogle();
      // Appwrite handles OAuth via redirect, so if it succeeds, the page will reload.
      // If it fails, it will throw an error and we catch it below.
    } catch (error) {
      console.error("Google Auth Error:", error);
      let errorMsg = error?.message || "Google authentication failed. Please try again.";
      if (errorMsg.includes('Firebase: Error')) {
        errorMsg = "Google authentication failed. Please try again.";
      }
      setServerError(errorMsg);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  return (
    <div
      className="w-full min-h-screen flex items-center justify-center p-6 relative overflow-hidden selection:bg-[var(--color-accent)] selection:text-white"
      style={{ background: 'linear-gradient(135deg, #F4FAF7 0%, #EDFAF3 55%, #F0F7F3 100%)' }}
    >
      {/* Ambient blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 blob blob-green animate-blob" style={{ animationDelay: '0s' }} />
      <div className="absolute bottom-0 right-1/4 w-72 h-72 blob blob-teal animate-blob" style={{ animationDelay: '4s' }} />
      <div className="absolute top-1/2 left-0 w-48 h-48 blob blob-emerald animate-blob" style={{ animationDelay: '2s', opacity: 0.10 }} />

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-md animate-fade-up"
        style={{
          background: 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid rgba(5,150,105,0.18)',
          borderRadius: 24,
          boxShadow: '0 24px 64px rgba(5,150,105,0.12), 0 4px 24px rgba(0,0,0,0.06)',
          padding: '40px 36px'
        }}
      >
        {/* Brand header */}
        <div className="text-center mb-8">
          <h1 style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontSize: 36, fontWeight: 900, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-text)', marginBottom: 6 }}>
            Vakrayan
          </h1>
          <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 13, color: 'var(--color-muted)', fontWeight: 500 }}>
            {isForgotPassword ? 'Reset your password' : 'Welcome back — sign in to continue'}
          </p>
          <div className="flex justify-center mt-3">
            <div className="accent-line" />
          </div>
        </div>

        {/* Server error */}
        {serverError && (
          <div
            className="mb-5 p-3.5 animate-fade-down"
            style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.20)', borderRadius: 10, color: 'var(--color-danger)', fontSize: 13, fontFamily: "'Jost', sans-serif", textAlign: 'center' }}
          >
            {serverError}
          </div>
        )}

        {isForgotPassword ? (
          <form onSubmit={handleSubmit(onForgotSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-muted)', fontFamily: "'Jost', sans-serif", letterSpacing: '0.04em' }}>Email Address</label>
              <input
                type="text"
                placeholder="you@example.com"
                disabled={loading}
                className={`input-field ${errors.email ? 'error' : ''} disabled:opacity-50`}
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Invalid email format' }
                })}
              />
              {errors.email && <span style={{ fontSize: 12, color: 'var(--color-danger)', fontFamily: "'Jost', sans-serif" }}>{errors.email.message}</span>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full cursor-pointer disabled:opacity-60 mt-2"
              style={{ borderRadius: 10 }}
            >
              {loading ? 'Sending...' : 'Send Recovery Link'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => { setIsForgotPassword(false); setServerError(''); reset(); }}
                style={{ fontSize: 13, color: 'var(--color-muted)', fontFamily: "'Jost', sans-serif", fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
                className="hover:text-[var(--color-accent)] transition-colors"
              >
                &larr; Back to Sign In
              </button>
            </div>
          </form>
        ) : (
          <>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-muted)', fontFamily: "'Jost', sans-serif" }}>Email Address</label>
                <input
                  type="text"
                  placeholder="you@example.com"
                  disabled={loading}
                  className={`input-field ${errors.email ? 'error' : ''} disabled:opacity-50`}
                  {...register('email', {
                    required: 'Email is required',
                    pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Invalid email format' }
                  })}
                />
                {errors.email && <span style={{ fontSize: 12, color: 'var(--color-danger)', fontFamily: "'Jost', sans-serif" }}>{errors.email.message}</span>}
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-muted)', fontFamily: "'Jost', sans-serif" }}>Password</label>
                  <button
                    type="button"
                    onClick={e => { e.preventDefault(); setIsForgotPassword(true); setServerError(''); reset(); }}
                    style={{ fontSize: 12, color: 'var(--color-accent)', fontFamily: "'Jost', sans-serif", fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Forgot?
                  </button>
                </div>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  disabled={loading}
                  className={`input-field ${errors.password ? 'error' : ''} disabled:opacity-50`}
                  {...register('password', { required: 'Password is required' })}
                />
                {errors.password && <span style={{ fontSize: 12, color: 'var(--color-danger)', fontFamily: "'Jost', sans-serif" }}>{errors.password.message}</span>}
              </div>

              {/* Remember me */}
              <div className="flex items-center gap-2.5 mt-1 select-none">
                <input
                  type="checkbox"
                  id="remember"
                  disabled={loading}
                  style={{ accentColor: 'var(--color-accent)', width: 16, height: 16 }}
                  {...register('remember')}
                />
                <label htmlFor="remember" style={{ fontSize: 12, fontFamily: "'Jost', sans-serif", color: 'var(--color-muted)', cursor: 'pointer', fontWeight: 500 }}>Remember this device</label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full cursor-pointer disabled:opacity-60 mt-1"
                style={{ borderRadius: 10 }}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            {/* Divider */}
            <div className="relative flex py-4 items-center">
              <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
              <span style={{ margin: '0 14px', fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', fontFamily: "'Jost', sans-serif", letterSpacing: '0.08em' }}>OR</span>
              <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
            </div>

            {/* Google sign in */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="btn-ghost w-full cursor-pointer disabled:opacity-60"
              style={{ borderRadius: 10, gap: 10 }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.68 1.54 15.01 1 12 1 7.35 1 3.39 3.65 1.5 7.5l3.86 3C6.31 7.57 8.91 5.04 12 5.04z" />
                <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.43c-.28 1.44-1.1 2.66-2.33 3.48l3.6 2.79c2.1-1.94 3.79-4.8 3.79-8.42z" />
                <path fill="#FBBC05" d="M5.36 14.5c-.24-.72-.38-1.49-.38-2.3s.14-1.58.38-2.3L1.5 6.9C.54 8.88 0 11.08 0 13.5s.54 4.62 1.5 6.6l3.86-3.1z" />
                <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.92l-3.6-2.79c-1.1.74-2.52 1.18-4.36 1.18-3.09 0-5.69-2.53-6.64-5.46L1.5 16.1C3.39 19.96 7.35 22.61 12 23z" />
              </svg>
              {loading ? 'Connecting...' : 'Continue with Google'}
            </button>
          </>
        )}

        {/* Footer link */}
        <div className="text-center mt-7 pt-6" style={{ borderTop: '1px solid var(--color-border)' }}>
          <p style={{ fontSize: 13, color: 'var(--color-muted)', fontFamily: "'Jost', sans-serif" }}>
            New here?{' '}
            <Link to="/signup" style={{ color: 'var(--color-accent)', fontWeight: 700, fontFamily: "'Jost', sans-serif" }} className="hover:underline">
              Create account &rarr;
            </Link>
          </p>
        </div>

      </div>
    </div>
  )
}

export default Login