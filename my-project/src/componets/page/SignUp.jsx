import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { login as loginAction } from '../../features/login'
import authService from '../../services/auth'
import { setCartItems } from '../../features/addToCart'
import cartService from '../../services/cart'
import { sendWebhookNotification } from '../../utils/webhookHelper'
import { hydrateCartFromDb } from '../../utils/cartMergeHelper'
import Loader from '../pageComponets/Loader'

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
const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
)
const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)



function SignUp() {
  const { register, handleSubmit, formState: { errors }, reset, setError } = useForm()
  const dispatch   = useDispatch()
  const navigate   = useNavigate()
  const location   = useLocation()
  const { isAuthenticated } = useSelector((s) => s.auth)

  const [serverError,  setServerError]  = useState('')
  const [loading,      setLoading]      = useState(false)
  const [activeModal,  setActiveModal]  = useState(null)
  const [showPass,     setShowPass]     = useState(false)
  const [focused,      setFocused]      = useState(null)

  useEffect(() => {
    document.title = 'Create Account | Vakrayan'
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => {
      try { document.head.removeChild(meta) } catch {}
    }
  }, [])

  const onSubmit = async (data) => {
    setServerError(''); setLoading(true)
    try {
      const session = await authService.createAccount({ email: data.email.trim(), password: data.password.trim(), name: data.name.trim() })
      if (session) {
        localStorage.setItem('remember_me', 'true')
        sessionStorage.setItem('session_active', 'true')
        const userData = await authService.getCurrentUser()
        if (userData) {
          dispatch(loginAction({ user: userData }))
          try {
            await hydrateCartFromDb(userData.$id)
            const cartItems = await cartService.getCartItems(userData.$id)
            dispatch(setCartItems(cartItems))
          } catch (err) { console.error('Cart merge on signup failed:', err); dispatch(setCartItems([])) }
          const hasSentKey = `sent_signup_${userData.$id || userData.id}`
          localStorage.setItem(hasSentKey, 'true')
          authService.updatePreferences({ ...(userData.prefs || {}), signup_notified: true })
            .catch(err => console.warn('Failed to update signup_notified preference:', err.message))
          sendWebhookNotification('user.signup', { name: userData.name || data.name.trim(), email: userData.email || data.email.trim(), userId: userData.$id || userData.id })
        }
      }
      reset()
      const from = location.state?.from?.pathname || '/'
      sessionStorage.setItem('just_logged_in', 'true')
      navigate(from, { replace: true })
    } catch (error) {
      console.error('SignUp Error:', error)
      if (error?.message?.toLowerCase().includes('email') || error?.status === 409) {
        setError('email', { type: 'server', message: 'This email is already registered with us.' })
      } else {
        let msg = error?.message || 'Something went wrong. Try again.'
        if (msg.includes('auth/weak-password')) msg = 'Password is too weak. Please use a stronger password.'
        else if (msg.includes('Firebase: Error')) msg = 'Registration failed. Please try again.'
        setServerError(msg)
      }
    } finally { setLoading(false) }
  }

  const handleGoogleSignIn = async () => {
    setServerError(''); setLoading(true)
    try {
      localStorage.setItem('remember_me', 'true')
      sessionStorage.setItem('session_active', 'true')
      sessionStorage.removeItem('dismissed_phone_prompt')
      const result = await authService.loginWithGoogle()
      if (result) {
        const userData = await authService.getCurrentUser()
        if (userData) {
          dispatch(loginAction({ user: userData }))
          try {
            await hydrateCartFromDb(userData.$id)
            const cartItems = await cartService.getCartItems(userData.$id)
            dispatch(setCartItems(cartItems))
          } catch (err) {
            console.error('Cart merge on signup failed:', err)
          }
          const from = location.state?.from?.pathname || '/'
          sessionStorage.setItem('just_logged_in', 'true')
          navigate(from, { replace: true })
        }
      }
    } catch (error) {
      let msg = error?.message || 'Google authentication failed. Please try again.'
      if (msg.includes('auth/unauthorized-domain')) {
        msg = 'Domain not authorized in Firebase Console (Authentication > Settings > Authorized domains).'
      } else if (msg.includes('auth/operation-not-allowed')) {
        msg = 'Google Sign-In is not enabled in Firebase Console (Authentication > Sign-in method).'
      } else if (msg.includes('auth/popup-closed-by-user')) {
        msg = 'Sign-in was cancelled.'
      } else if (msg.includes('Firebase: Error')) {
        msg = 'Google authentication failed. Please try again.'
      }
      setServerError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) navigate(location.state?.from?.pathname || '/', { replace: true })
  }, [isAuthenticated, navigate, location])

  const inp = (name, hasErr) => ({
    width: '100%', padding: '12px 16px 12px 42px',
    background: focused === name ? '#fff' : '#F9F9F9',
    border: hasErr ? '1.5px solid #DC2626' : focused === name ? '1.5px solid #059669' : '1.5px solid #E0EDE8',
    borderRadius: 10, fontSize: 14, color: '#0D1A14', outline: 'none',
    transition: 'all 0.18s ease',
    boxShadow: focused === name ? (hasErr ? '0 0 0 3px rgba(220,38,38,0.10)' : '0 0 0 3px rgba(5,150,105,0.12)') : 'none',
  })

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#F4FAF7' }}>

      {/* ══ LEFT — Dark Brand Panel ═══════════════════════════ */}
      <div style={{ width: '48%', position: 'relative', overflow: 'hidden', flexShrink: 0, display: 'none' }} className="lg:!flex flex-col justify-between">

        {/* Vakrayan model hero image */}
        <img
          src="/vakrayan-signup-hero.jpg"
          alt="Vakrayan Premium Apparel"
          loading="eager"
          decoding="async"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
        />
        {/* light black overlay — no green tint */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.42)' }} />
        {/* noise */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />

        <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%', padding: '48px 52px' }}>

          {/* logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img
              src="/vakrayan-merged-logo-white.png"
              alt="Vakrayan Logo"
              style={{ height: 44, width: 'auto', objectFit: 'contain' }}
            />
          </div>

          {/* hero text */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingBottom: 32 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(52,211,153,0.85)', letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 16, display: 'block' }}>Join The Movement</span>
            <h1 style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontSize: 'clamp(2.6rem, 4.5vw, 4rem)', fontWeight: 900, color: '#fff', lineHeight: 1.0, textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: 20 }}>
              Dress Bold.<br />
              Live<br />
              <span style={{ color: '#34D399', fontFamily: "'VakrayanFont', sans-serif", fontSize: '0.88em', letterSpacing: '0.20em', display: 'inline-block' }}>Vakrayan.</span>
            </h1>
            <div style={{ width: 40, height: 3, background: 'linear-gradient(90deg, #34D399, #059669)', borderRadius: 99, marginBottom: 20 }} />
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.62)', lineHeight: 1.70, maxWidth: 300 }}>
              Create your free account and unlock exclusive member drops, discounts, and seamless order tracking.
            </p>
          </div>

          {/* trust badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(0,0,0,0.28)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.10)', backdropFilter: 'blur(8px)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.50)" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>
              Free shipping on your <span style={{ color: '#34D399', fontWeight: 700 }}>first order</span>
            </span>
          </div>
        </div>
      </div>

      {/* ══ RIGHT — Form Panel ════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', background: '#fff', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 420 }} className="animate-fade-up">



          {/* heading */}
          <div style={{ marginBottom: 26 }}>
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 32, fontWeight: 900, color: '#0D1A14', textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 1, marginBottom: 8 }}>
              Create Account
            </h2>
            <p style={{ fontSize: 14, color: '#527060', fontWeight: 400 }}>
              Join thousands of fashion enthusiasts. It's free!
            </p>
          </div>

          {/* server error */}
          {serverError && (
            <div style={{ marginBottom: 18, padding: '11px 14px', background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.20)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13 }}>⚠️</span>
              <span style={{ fontSize: 13, color: '#DC2626', fontWeight: 500 }}>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* name */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#527060', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Full Name</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#527060' }}><UserIcon /></span>
                <input type="text" placeholder="Your Name" disabled={loading}
                  style={inp('name', !!errors.name)}
                  onFocus={() => setFocused('name')} onBlur={() => setFocused(null)}
                  {...register('name', { required: 'Name is required' })}
                />
              </div>
              {errors.name && <span style={{ fontSize: 12, color: '#DC2626', fontWeight: 500 }}>{errors.name.message}</span>}
            </div>

            {/* email */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#527060', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#527060' }}><MailIcon /></span>
                <input type="text" placeholder="you@example.com" disabled={loading}
                  style={inp('email', !!errors.email)}
                  onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
                  {...register('email', { required: 'Email is required', pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Invalid email address' } })}
                />
              </div>
              {errors.email && <span style={{ fontSize: 12, color: '#DC2626', fontWeight: 500 }}>{errors.email.message}</span>}
            </div>

            {/* password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#527060', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#527060' }}><LockIcon /></span>
                <input type={showPass ? 'text' : 'password'} placeholder="Min 6 characters" disabled={loading}
                  style={{ ...inp('pass', !!errors.password), paddingRight: 44 }}
                  onFocus={() => setFocused('pass')} onBlur={() => setFocused(null)}
                  {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Minimum 6 characters required' } })}
                />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#527060', display: 'flex', alignItems: 'center' }}
                >{showPass ? <EyeClosed /> : <EyeOpen />}</button>
              </div>
              {errors.password && <span style={{ fontSize: 12, color: '#DC2626', fontWeight: 500 }}>{errors.password.message}</span>}
            </div>

            {/* terms */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }} className="select-none">
                <input type="checkbox" id="terms" disabled={loading}
                  style={{ accentColor: '#059669', width: 15, height: 15, marginTop: 2, cursor: 'pointer', flexShrink: 0 }}
                  {...register('terms', { required: 'You must accept the terms' })}
                />
                <label htmlFor="terms" style={{ fontSize: 12, color: '#527060', lineHeight: 1.55, cursor: 'pointer', fontWeight: 400 }}>
                  I agree to the{' '}
                  <span onClick={() => setActiveModal('terms')} style={{ color: '#059669', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>Terms of Service</span>
                  {' '}and{' '}
                  <span onClick={() => setActiveModal('privacy')} style={{ color: '#059669', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>Privacy Policy</span>
                </label>
              </div>
              {errors.terms && <span style={{ fontSize: 12, color: '#DC2626', fontWeight: 500 }}>{errors.terms.message}</span>}
            </div>

            {/* submit */}
            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '14px', background: '#0D1A14', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '0.04em', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? 0.7 : 1, marginTop: 4 }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#059669' }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#0D1A14' }}
            >
              {loading ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Creating account…</> : 'Create Account →'}
            </button>
          </form>

          {/* divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0' }}>
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

          {/* footer */}
          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: '#527060' }}>
            Already a member?{' '}
            <Link to="/login" style={{ color: '#059669', fontWeight: 700, textDecoration: 'none' }}
              onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
              onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
            >Sign in →</Link>
          </p>
        </div>
      </div>



      {/* ══ TERMS & PRIVACY MODAL ════════════════════════════ */}
      {activeModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-fade-in" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-lg flex flex-col animate-scale-up" style={{ background: '#fff', border: '1px solid #E0EDE8', borderRadius: 18, boxShadow: '0 32px 80px rgba(0,0,0,0.14)', maxHeight: '80vh', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid #E0EDE8' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F4FAF7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                  {activeModal === 'terms' ? '📜' : '🔒'}
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0D1A14' }}>
                  {activeModal === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
                </h3>
              </div>
              <button onClick={() => setActiveModal(null)}
                style={{ width: 28, height: 28, borderRadius: 7, background: '#F4FAF7', border: 'none', cursor: 'pointer', fontSize: 16, color: '#527060', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}
              >×</button>
            </div>

            <div className="overflow-y-auto scrollbar-thin" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              {(activeModal === 'terms' ? [
                { title: '1. Agreement to Terms', body: 'Welcome to Vakrayan. By creating an account or placing an order, you agree to comply with and be bound by these Terms of Service.' },
                { title: '2. User Registration & Account Security', body: 'You are solely responsible for maintaining the confidentiality of your account credentials. Vakrayan is not liable for any loss from unauthorized access.' },
                { title: '3. Secure Payments via Razorpay', body: 'All transactions are processed securely through Razorpay. Vakrayan does not store your credit card or banking details on our servers.' },
                { title: '4. Shipping & Delivery Policy', body: 'We deliver across India. Orders are processed within 2-3 business days and delivered in 3-7 business days depending on your pincode.' },
                { title: '5. 7-Day Return & Exchange Policy', body: 'We offer a 7-day exchange or return for all unused, unwashed apparel in original packaging with intact labels. Refunds are credited to the original source.' },
                { title: '6. Limitation of Liability', body: 'Vakrayan shall not be liable for any indirect, incidental, or consequential damages arising from the use of our products or services.' },
              ] : [
                { title: '1. Data We Collect', body: 'We collect your name, email, phone number, and delivery addresses to process your orders securely.' },
                { title: '2. How We Protect Your Data', body: 'Logins are secured via Google Firebase Authentication. Your cart and order history are stored in Firebase Firestore with strict access controls.' },
                { title: '3. Third-Party Sharing', body: 'We only share essential logistics data with courier partners for delivery, and encrypted billing data with Razorpay for payment processing.' },
                { title: '4. Cookies & Browser Storage', body: 'We use local storage and session cookies to maintain your cart state and keep your session active.' },
                { title: '5. Your Rights & Data Deletion', body: 'You may update or delete your profile info and shipping addresses at any time from your Vakrayan account dashboard.' },
              ]).map((item, i) => (
                <div key={i}>
                  <p style={{ fontWeight: 700, color: '#0D1A14', marginBottom: 4, fontSize: 13 }}>{item.title}</p>
                  <p style={{ fontSize: 13, color: '#527060', lineHeight: 1.70 }}>{item.body}</p>
                </div>
              ))}
            </div>

            <div style={{ padding: '14px 24px', borderTop: '1px solid #E0EDE8', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setActiveModal(null)}
                style={{ padding: '10px 24px', background: '#0D1A14', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#059669'}
                onMouseLeave={e => e.currentTarget.style.background = '#0D1A14'}
              >Got it, close</button>
            </div>
          </div>
        </div>
      )}
      {/* ══ FULL SCREEN BLUR LOADER OVERLAY ════════════════════ */}
      {loading && (
        <Loader type="splash" text="CREATING YOUR PROFILE..." />
      )}
    </div>
  )
}

export default SignUp
