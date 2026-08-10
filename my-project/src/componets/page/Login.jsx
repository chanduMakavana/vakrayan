import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { login as loginAction } from '../../features/login'
import authService from '../../services/auth'
import { useToast } from '../../context/ToastContext'
import { hydrateCartFromDb } from '../../utils/cartMergeHelper'
import Loader from '../pageComponets/Loader'
import { useDelayedLoading } from '../../hooks/useDelayedLoading'

const EyeOpen = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
)
const EyeClosed = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)
const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
)
const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)

const features = [
  { icon: '🛡️', text: 'Secure Firebase Authentication' },
  { icon: '🚚', text: 'Fast Nationwide Delivery' },
  { icon: '🔁', text: '7-Day Easy Returns' },
  { icon: '✨', text: 'Premium Quality Apparel' },
]

function Login() {
  const { register, handleSubmit, formState: { errors }, reset } = useForm()
  const navigate   = useNavigate()
  const location   = useLocation()
  const dispatch   = useDispatch()
  const { showToast } = useToast()
  const { isAuthenticated } = useSelector((s) => s.auth)

  const [loading,          setLoading]          = useState(false)
  const [serverError,      setServerError]      = useState('')
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [showPass,         setShowPass]         = useState(false)
  const [focused,          setFocused]          = useState(null)

  const showOverlay = useDelayedLoading(loading, 1500)

  useEffect(() => { document.title = 'Login | Vakrayan' }, [])

  const onSubmit = async (data) => {
    setServerError(''); setLoading(true)
    try {
      const session = await authService.login({ email: data.email.trim(), password: data.password.trim() })
      if (session) {
        if (data.remember) localStorage.setItem('remember_me', 'true')
        else localStorage.removeItem('remember_me')
        sessionStorage.setItem('session_active', 'true')
        const userData = await authService.getCurrentUser()
        if (userData) {
          dispatch(loginAction({ user: userData }))
          try { await hydrateCartFromDb(userData.$id, dispatch) } catch (e) { console.error(e) }
        }
        reset()
        const from = location.state?.from?.pathname || '/'
        sessionStorage.setItem('just_logged_in', 'true')
        navigate(from, { replace: true })
      }
    } catch (error) {
      let msg = error?.message || 'Invalid email or password.'
      if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password') || msg.includes('auth/user-not-found'))
        msg = 'Invalid email or password. Please try again.'
      else if (msg.includes('auth/too-many-requests')) msg = 'Too many failed attempts. Please try again later.'
      else if (msg.includes('Firebase: Error')) msg = 'Authentication failed. Please try again.'
      setServerError(msg)
    } finally { setLoading(false) }
  }

  const onForgotSubmit = async (data) => {
    setServerError(''); setLoading(true)
    try {
      await authService.createRecovery(data.email.trim(), `${window.location.origin}/reset-password`)
      showToast('📧 Recovery link sent! Check your email inbox.', 'success')
      setIsForgotPassword(false); reset()
    } catch (error) {
      let msg = error?.message || 'Failed to send recovery email.'
      if (msg.includes('auth/user-not-found') || msg.includes('auth/invalid-email'))
        msg = 'No account found with that email address.'
      else if (msg.includes('Firebase: Error')) msg = 'Failed to send recovery email. Please try again.'
      setServerError(msg)
    } finally { setLoading(false) }
  }

  const handleGoogleSignIn = async () => {
    setServerError(''); setLoading(true)
    try {
      const rememberChecked = document.getElementById('remember')?.checked
      if (rememberChecked) localStorage.setItem('remember_me', 'true')
      else localStorage.removeItem('remember_me')
      sessionStorage.setItem('session_active', 'true')
      sessionStorage.removeItem('dismissed_phone_prompt')
      await authService.loginWithGoogle()
    } catch (error) {
      let msg = error?.message || 'Google authentication failed.'
      if (msg.includes('Firebase: Error')) msg = 'Google authentication failed. Please try again.'
      setServerError(msg); setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) navigate(location.state?.from?.pathname || '/', { replace: true })
  }, [isAuthenticated, navigate, location])

  /* ── input style helper ─────────────────────────────────── */
  const inp = (name, hasErr) => ({
    width: '100%',
    padding: '12px 16px 12px 42px',
    background: focused === name ? '#fff' : '#F9F9F9',
    border: hasErr
      ? '1.5px solid #DC2626'
      : focused === name ? '1.5px solid #059669' : '1.5px solid #E0EDE8',
    borderRadius: 10,
    fontSize: 14,
    color: '#0D1A14',
    outline: 'none',
    transition: 'all 0.18s ease',
    boxShadow: focused === name ? (hasErr ? '0 0 0 3px rgba(220,38,38,0.10)' : '0 0 0 3px rgba(5,150,105,0.12)') : 'none',
  })

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#F4FAF7' }}>

      {/* ══ LEFT — Dark Brand Panel ═══════════════════════════ */}
      <div style={{
        width: '48%', position: 'relative', overflow: 'hidden', flexShrink: 0,
        display: 'none',
      }} className="lg:!flex flex-col justify-between" >

        {/* Vakrayan model hero image */}
        <img
          src="/vakrayan-hero.png"
          alt="Vakrayan Premium Apparel"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
        />

        {/* light black overlay — no green tint */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.42)',
        }} />

        {/* noise texture */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.04,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }} />

        {/* ── CONTENT ── */}
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%', padding: '48px 52px' }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img
              src="/vakrayan-merged-logo-white.png"
              alt="Vakrayan Logo"
              style={{ height: 44, width: 'auto', objectFit: 'contain' }}
            />
          </div>

          {/* hero text */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingBottom: 32 }}>
            <h1 style={{
              fontFamily: "'Barlow Condensed', 'Impact', sans-serif",
              fontSize: 'clamp(2.6rem, 4.5vw, 4rem)',
              fontWeight: 900, color: '#fff', lineHeight: 1.0,
              textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: 20,
            }}>
              Welcome<br />
              <span style={{ color: '#34D399' }}>Back</span><br />
              To The Crew.
            </h1>

            {/* gold separator */}
            <div style={{ width: 40, height: 3, background: 'linear-gradient(90deg, #34D399, #059669)', borderRadius: 99, marginBottom: 20 }} />

            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.62)', lineHeight: 1.70, maxWidth: 300, marginBottom: 40 }}>
              Sign in to access exclusive drops, track your orders, and manage your wardrobe all in one place.
            </p>

            {/* features */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {features.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>
                    {f.icon}
                  </div>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.72)', fontWeight: 500 }}>{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* trust badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(0,0,0,0.28)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.10)', backdropFilter: 'blur(8px)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.50)" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>
              Trusted by <span style={{ color: '#34D399', fontWeight: 700 }}>10,000+</span> customers across India
            </span>
          </div>
        </div>
      </div>

      {/* ══ RIGHT — Form Panel ════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', background: '#fff', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 400 }} className="animate-fade-up">



          {/* heading */}
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 32, fontWeight: 900, color: '#0D1A14', textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 1, marginBottom: 8 }}>
              {isForgotPassword ? 'Reset Password' : 'Sign In'}
            </h2>
            <p style={{ fontSize: 14, color: '#527060', fontWeight: 400 }}>
              {isForgotPassword ? "Enter your email and we'll send you a recovery link." : 'Sign in to continue to your Vakrayan account.'}
            </p>
          </div>

          {/* error */}
          {serverError && (
            <div style={{ marginBottom: 20, padding: '11px 14px', background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.20)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13 }}>⚠️</span>
              <span style={{ fontSize: 13, color: '#DC2626', fontWeight: 500 }}>{serverError}</span>
            </div>
          )}

          {isForgotPassword ? (
            <form onSubmit={handleSubmit(onForgotSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#527060', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#527060' }}><MailIcon /></span>
                  <input type="text" placeholder="you@example.com" disabled={loading}
                    style={{ ...inp('email-f', !!errors.email) }}
                    onFocus={() => setFocused('email-f')} onBlur={() => setFocused(null)}
                    {...register('email', { required: 'Email is required', pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Invalid email' } })}
                  />
                </div>
                {errors.email && <span style={{ fontSize: 12, color: '#DC2626', fontWeight: 500 }}>{errors.email.message}</span>}
              </div>
              <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', background: '#0D1A14', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.04em', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#059669'}
                onMouseLeave={e => e.currentTarget.style.background = '#0D1A14'}
              >
                {loading ? 'Sending…' : 'Send Recovery Link'}
              </button>
              <button type="button" onClick={() => { setIsForgotPassword(false); setServerError(''); reset() }}
                style={{ background: 'none', border: 'none', fontSize: 13, color: '#527060', fontWeight: 600, cursor: 'pointer', textAlign: 'center' }}
                className="hover:text-[var(--color-accent)] transition-colors"
              >← Back to Sign In</button>
            </form>
          ) : (
            <>
              <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                {/* email */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#527060', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#527060' }}><MailIcon /></span>
                    <input type="text" placeholder="you@example.com" disabled={loading}
                      style={inp('email', !!errors.email)}
                      onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
                      {...register('email', { required: 'Email is required', pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Invalid email format' } })}
                    />
                  </div>
                  {errors.email && <span style={{ fontSize: 12, color: '#DC2626', fontWeight: 500 }}>{errors.email.message}</span>}
                </div>

                {/* password */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#527060', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Password</label>
                    <button type="button"
                      onClick={e => { e.preventDefault(); setIsForgotPassword(true); setServerError(''); reset() }}
                      style={{ fontSize: 12, color: '#059669', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
                    >Forgot password?</button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#527060' }}><LockIcon /></span>
                    <input type={showPass ? 'text' : 'password'} placeholder="••••••••••••" disabled={loading}
                      style={{ ...inp('pass', !!errors.password), paddingRight: 44 }}
                      onFocus={() => setFocused('pass')} onBlur={() => setFocused(null)}
                      {...register('password', { required: 'Password is required' })}
                    />
                    <button type="button" onClick={() => setShowPass(p => !p)}
                      style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#527060', display: 'flex', alignItems: 'center' }}
                    >{showPass ? <EyeClosed /> : <EyeOpen />}</button>
                  </div>
                  {errors.password && <span style={{ fontSize: 12, color: '#DC2626', fontWeight: 500 }}>{errors.password.message}</span>}
                </div>

                {/* remember */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} className="select-none">
                  <input type="checkbox" id="remember" disabled={loading}
                    style={{ accentColor: '#059669', width: 15, height: 15, cursor: 'pointer' }}
                    {...register('remember')}
                  />
                  <label htmlFor="remember" style={{ fontSize: 13, color: '#527060', cursor: 'pointer', fontWeight: 400 }}>Remember this device</label>
                </div>

                {/* submit */}
                <button type="submit" disabled={loading}
                  style={{ width: '100%', padding: '14px', background: '#0D1A14', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '0.04em', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? 0.7 : 1 }}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#059669' }}
                  onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#0D1A14' }}
                >
                  {loading ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Signing in…</> : 'Sign In →'}
                </button>
              </form>

              {/* divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
                <div style={{ flex: 1, height: 1, background: '#E0EDE8' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#527060', letterSpacing: '0.10em' }}>OR</span>
                <div style={{ flex: 1, height: 1, background: '#E0EDE8' }} />
              </div>

              {/* google */}
              <button type="button" onClick={handleGoogleSignIn} disabled={loading}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '13px', background: '#fff', border: '1.5px solid #E0EDE8', borderRadius: 10, fontSize: 14, fontWeight: 500, color: '#0D1A14', cursor: 'pointer', transition: 'all 0.18s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#059669'; e.currentTarget.style.background = '#F4FAF7' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#E0EDE8'; e.currentTarget.style.background = '#fff' }}
              >
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.68 1.54 15.01 1 12 1 7.35 1 3.39 3.65 1.5 7.5l3.86 3C6.31 7.57 8.91 5.04 12 5.04z"/>
                  <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.43c-.28 1.44-1.1 2.66-2.33 3.48l3.6 2.79c2.1-1.94 3.79-4.8 3.79-8.42z"/>
                  <path fill="#FBBC05" d="M5.36 14.5c-.24-.72-.38-1.49-.38-2.3s.14-1.58.38-2.3L1.5 6.9C.54 8.88 0 11.08 0 13.5s.54 4.62 1.5 6.6l3.86-3.1z"/>
                  <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.92l-3.6-2.79c-1.1.74-2.52 1.18-4.36 1.18-3.09 0-5.69-2.53-6.64-5.46L1.5 16.1C3.39 19.96 7.35 22.61 12 23z"/>
                </svg>
                {loading ? 'Connecting…' : 'Continue with Google'}
              </button>
            </>
          )}

          {/* footer */}
          <p style={{ textAlign: 'center', marginTop: 28, fontSize: 13, color: '#527060' }}>
            New here?{' '}
            <Link to="/signup" style={{ color: '#059669', fontWeight: 700, textDecoration: 'none' }}
              onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
              onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
            >Create account →</Link>
          </p>
        </div>
      </div>
      {/* ══ FULL SCREEN BLUR LOADER OVERLAY ════════════════════ */}
      {loading && (
        <Loader type="splash" text="SECURELY LOGGING IN..." />
      )}
    </div>
  )
}

export default Login