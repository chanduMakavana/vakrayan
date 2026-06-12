import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { login as loginAction } from '../../features/login' // Alias used to avoid naming collision with local submit function
import authService from '../../appwrite/auth'
import cartService from '../../appwrite/cart'
import { setCartItems } from '../../features/addToCart'
import { useToast } from '../../context/ToastContext'
import { mergeLocalCartToDb } from '../../utils/cartMergeHelper'

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
          try {
            await mergeLocalCartToDb(userData.$id);
            const cartItems = await cartService.getCartItems(userData.$id);
            dispatch(setCartItems(cartItems));
          } catch (cartErr) {
            console.error("Cart retrieval or merge on login failed:", cartErr);
          }
        }
        
        reset();
        const from = location.state?.from?.pathname || '/';
        sessionStorage.setItem('just_logged_in', 'true');
        navigate(from, { replace: true });
      }
    } catch (error) {
      console.error("Login Error:", error);
      setServerError(error?.message || "Invalid email or password.");
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
      setServerError(error?.message || "Failed to trigger password recovery. Ensure your email is correct.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setServerError("");
    setLoading(true);
    try {
      await authService.loginWithGoogle();
    } catch (error) {
      console.error("Google Auth Error:", error);
      setServerError(error?.message || "Google authentication failed. Please try again.");
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
    <div className="w-full min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-6 bg-[url(https://static.vecteezy.com/system/resources/previews/015/586/867/large_2x/overlay-distressed-concrete-texture-background-free-photo.jpg)] bg-cover bg-center relative selection:bg-[var(--color-accent)] selection:text-white animate-gradient-shift bg-[length:200%_200%]">
      <div className="absolute inset-0 bg-[var(--color-bg)]/95 backdrop-blur-xs z-10" />

      <div className="relative z-20 w-full max-w-md bg-[var(--color-surface)]/80 backdrop-blur-xl p-8 rounded-2xl border border-[var(--color-border)] shadow-2xl">

        <div className="text-center mb-8">
          <h2 className="text-xs tracking-[0.5em] text-[var(--color-accent)] font-black uppercase mb-2">
            {isForgotPassword ? "Credentials Recovery" : "Welcome Back"}
          </h2>
          <h1 className="text-3xl font-black tracking-widest text-[var(--color-text)] uppercase">
            {isForgotPassword ? "RESET PASSWORD" : "CREW SIGN IN"}
          </h1>
        </div>

        {/* Server error feedback */}
        {serverError && (
          <div className="mb-6 p-3 bg-rose-50 border border-rose-250 text-rose-600 text-[11px] font-black uppercase tracking-widest rounded-xl text-center animate-pulse">
            {serverError}
          </div>
        )}

        {isForgotPassword ? (
          <form onSubmit={handleSubmit(onForgotSubmit)} className="flex flex-col gap-5">
            {/* Email Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black tracking-widest text-[var(--color-muted)] uppercase">Email Address</label>
              <input
                type="text"
                placeholder="YOU@EXAMPLE.COM"
                disabled={loading}
                className={`input-glow w-full bg-[var(--color-subtle)] border ${errors.email ? 'border-rose-300 focus:border-rose-500' : 'border-[var(--color-border)] focus:border-[var(--color-accent)]'} rounded-xl px-4 py-3.5 text-sm text-[var(--color-text)] placeholder-[var(--color-muted)] outline-hidden tracking-wider transition-colors font-medium disabled:opacity-50`}
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Invalid email format"
                  }
                })}
              />
              {errors.email && <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider">{errors.email.message}</span>}
            </div>

            {/* Submit button with dynamic loading text */}
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] active:scale-[0.98] disabled:scale-100 disabled:bg-[var(--color-accent)]/40 text-white font-black text-xs tracking-widest uppercase py-4 rounded-xl shadow-md mt-4 cursor-pointer transition-all duration-200"
            >
              {loading ? 'SENDING LINK...' : 'SEND RECOVERY LINK'}
            </button>

            <div className="text-center mt-2">
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setServerError("");
                  reset();
                }}
                className="text-[10px] font-black text-[var(--color-muted)] hover:text-[var(--color-accent)] tracking-widest uppercase transition-colors cursor-pointer bg-transparent border-0"
              >
                &larr; Back to Sign In
              </button>
            </div>
          </form>
        ) : (
          <>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
              {/* Email Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black tracking-widest text-[var(--color-muted)] uppercase">Email Address</label>
                <input
                  type="text"
                  placeholder="YOU@EXAMPLE.COM"
                  disabled={loading}
                  className={`input-glow w-full bg-[var(--color-subtle)] border ${errors.email ? 'border-rose-300 focus:border-rose-500' : 'border-[var(--color-border)] focus:border-[var(--color-accent)]'} rounded-xl px-4 py-3.5 text-sm text-[var(--color-text)] placeholder-[var(--color-muted)] outline-hidden tracking-wider transition-colors font-medium disabled:opacity-50`}
                  {...register("email", {
                    required: "Email is required",
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: "Invalid email format"
                    }
                  })}
                />
                {errors.email && <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider">{errors.email.message}</span>}
              </div>

              {/* Password Input */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black tracking-widest text-[var(--color-muted)] uppercase">Password</label>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsForgotPassword(true);
                      setServerError("");
                      reset();
                    }}
                    className="text-[10px] font-bold text-[var(--color-muted)] hover:text-[var(--color-accent)] tracking-wider uppercase transition-colors cursor-pointer bg-transparent border-0 p-0"
                  >
                    Forgot?
                  </button>
                </div>
                <input
                  type="password"
                  placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                  disabled={loading}
                  className={`input-glow w-full bg-[var(--color-subtle)] border ${errors.password ? 'border-rose-300 focus:border-rose-500' : 'border-[var(--color-border)] focus:border-[var(--color-accent)]'} rounded-xl px-4 py-3.5 text-sm text-[var(--color-text)] placeholder-[var(--color-muted)] outline-hidden transition-colors disabled:opacity-50`}
                  {...register("password", { required: "Password is required" })}
                />
                {errors.password && <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider">{errors.password.message}</span>}
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center gap-3 mt-1 select-none">
                <input
                  type="checkbox"
                  id="remember"
                  disabled={loading}
                  className="accent-[var(--color-accent)] rounded border-[var(--color-border)] bg-[var(--color-subtle)] cursor-pointer h-4 w-4 disabled:opacity-50"
                  {...register("remember")}
                />
                <label htmlFor="remember" className="text-[11px] text-[var(--color-muted)] tracking-widest font-bold uppercase cursor-pointer">Remember Device</label>
              </div>

              {/* Submit button with dynamic loading text */}
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] active:scale-[0.98] disabled:scale-100 disabled:bg-[var(--color-accent)]/40 text-white font-black text-xs tracking-widest uppercase py-4 rounded-xl shadow-md mt-4 cursor-pointer transition-all duration-200"
              >
                {loading ? 'AUTHENTICATING...' : 'SIGN IN'}
              </button>
            </form>

            <div className="relative flex py-4 items-center">
              <div className="flex-grow border-t border-[var(--color-border)]"></div>
              <span className="flex-shrink mx-4 text-[10px] font-black text-[var(--color-muted)] tracking-widest uppercase">OR</span>
              <div className="flex-grow border-t border-[var(--color-border)]"></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-[var(--color-surface)] hover:bg-[var(--color-subtle)] active:scale-[0.98] disabled:scale-100 border border-[var(--color-border)] text-[var(--color-text)] font-bold text-xs tracking-widest uppercase py-4 rounded-xl shadow-md cursor-pointer transition-all duration-200"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.68 1.54 15.01 1 12 1 7.35 1 3.39 3.65 1.5 7.5l3.86 3C6.31 7.57 8.91 5.04 12 5.04z" />
                <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.43c-.28 1.44-1.1 2.66-2.33 3.48l3.6 2.79c2.1-1.94 3.79-4.8 3.79-8.42z" />
                <path fill="#FBBC05" d="M5.36 14.5c-.24-.72-.38-1.49-.38-2.3s.14-1.58.38-2.3L1.5 6.9C.54 8.88 0 11.08 0 13.5s.54 4.62 1.5 6.6l3.86-3.1z" />
                <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.92l-3.6-2.79c-1.1.74-2.52 1.18-4.36 1.18-3.09 0-5.69-2.53-6.64-5.46L1.5 16.1C3.39 19.96 7.35 22.61 12 23z" />
              </svg>
              {loading ? 'CONNECTING...' : 'Continue with Google'}
            </button>
          </>
        )}

        <div className="text-center mt-8 pt-6 border-t border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-muted)] tracking-wider">
            NEW TO THE CLUB?{' '}
            <Link to="/signup" className="text-[var(--color-text)] font-black tracking-widest hover:text-[var(--color-accent)] transition-colors ml-1 uppercase">
              REGISTER NOW &rarr;
            </Link>
          </p>
        </div>

      </div>
    </div>
  )
}

export default Login