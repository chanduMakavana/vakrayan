import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { login as loginAction } from '../../features/login'
import authService from '../../appwrite/auth'
import { setCartItems } from '../../features/addToCart'

function SignUp() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
  } = useForm()

  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { isAuthenticated } = useSelector((state) => state.auth)
  const [serverError, setServerError] = useState("")
  const [loading, setLoading] = useState(false)

  const onSubmit = async (data) => {
    setServerError("")
    setLoading(true)
    try {
      // 1. Create account (which automatically logs the user in on Appwrite)
      const session = await authService.createAccount({
        email: data.email.trim(),
        password: data.password.trim(),
        name: data.name.trim()
      })
      
      if (session) {
        // 2. Fetch the active registered user details
        const userData = await authService.getCurrentUser()
        if (userData) {
          dispatch(loginAction({ user: userData }))
          dispatch(setCartItems([])) // Fresh signup starts with an empty cart
        }
      }
      
      reset()
      navigate('/')
    } catch (error) {
      console.error("SignUp Error:", error)
      if (error?.message?.toLowerCase().includes("email") || error?.status === 409) {
        setError("email", {
          type: "server",
          message: "This email is already registered with us."
        })
      } else {
        setServerError(error?.message || "Something went wrong. Try again.")
      }
    } finally {
      setLoading(false)
    }
  }
<<<<<<< HEAD

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

=======
>>>>>>> 61e2559d0e1cd6e0dbf11f31859e58bc8057f893
  useEffect(() => {
    if (isAuthenticated) navigate('/');
  }, [isAuthenticated, navigate]);

  return (
    <div className="w-full min-h-screen bg-[#fafafb] flex items-center justify-center p-6 bg-[url(https://static.vecteezy.com/system/resources/previews/015/586/867/large_2x/overlay-distressed-concrete-texture-background-free-photo.jpg)] bg-cover bg-center relative selection:bg-neutral-900 selection:text-white">
      <div className="absolute inset-0 bg-white/95 backdrop-blur-xs z-10" />

      <div className="relative z-20 w-full max-w-md bg-white p-8 rounded-2xl border border-neutral-200/60 shadow-xl">
        
        <div className="text-center mb-8">
          <h2 className="text-xs tracking-[0.5em] text-[var(--theme-accent)] font-black uppercase mb-2">Join The Movement</h2>
          <h1 className="text-3xl font-black tracking-widest text-neutral-900 uppercase">CREATE ACCOUNT</h1>
        </div>

        {/* Server error feedback */}
        {serverError && (
          <div className="mb-6 p-3 bg-rose-50 border border-rose-250 text-rose-600 text-[11px] font-black uppercase tracking-widest rounded-xl text-center">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          
          {/* Full Name Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">Full Name</label>
            <input 
              type="text" 
              placeholder="ENTER YOUR NAME" 
              disabled={loading}
              className={`w-full bg-[#fbfbfb] border ${errors.name ? 'border-rose-300 focus:border-rose-500' : 'border-neutral-200 focus:border-[var(--theme-primary)]'} rounded-xl px-4 py-3.5 text-sm text-neutral-900 placeholder-neutral-400 outline-hidden tracking-wider transition-colors uppercase font-medium disabled:opacity-50`}
              {...register("name", { required: "Name is required" })}
            />
            {errors.name && <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider">{errors.name.message}</span>}
          </div>

          {/* Email Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">Email Address</label>
            <input 
              type="text" 
              placeholder="YOU@EXAMPLE.COM" 
              disabled={loading}
              className={`w-full bg-[#fbfbfb] border ${errors.email ? 'border-rose-300 focus:border-rose-500' : 'border-neutral-200 focus:border-[var(--theme-primary)]'} rounded-xl px-4 py-3.5 text-sm text-neutral-900 placeholder-neutral-400 outline-hidden tracking-wider transition-colors font-medium disabled:opacity-50`}
              {...register("email", { 
                required: "Email is required",
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "Invalid email address"
                }
              })}
            />
           {errors.email && <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider">{errors.email.message}</span>}
          </div>

          {/* Password Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">Password</label>
            <input 
              type="password" 
              placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;" 
              disabled={loading}
              className={`w-full bg-[#fbfbfb] border ${errors.password ? 'border-rose-300 focus:border-rose-500' : 'border-neutral-200 focus:border-[var(--theme-primary)]'} rounded-xl px-4 py-3.5 text-sm text-neutral-900 placeholder-neutral-400 outline-hidden transition-colors disabled:opacity-50`}
              {...register("password", { 
                required: "Password is required",
                minLength: { value: 6, message: "Password must be at least 6 characters" }
              })}
            />
            {errors.password && <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider">{errors.password.message}</span>}
          </div>

          {/* Terms Checkbox */}
          <div className="flex flex-col gap-1">
            <div className="flex items-start gap-3 mt-1 select-none">
              <input 
                type="checkbox" 
                id="terms" 
                disabled={loading}
                className="mt-0.5 accent-neutral-900 rounded border-neutral-200 bg-[#fbfbfb] cursor-pointer h-4 w-4 disabled:opacity-50"
                {...register("terms", { required: "You must accept the terms" })}
              />
              <label htmlFor="terms" className="text-[11px] text-neutral-400 tracking-wide leading-tight cursor-pointer font-bold uppercase">
                I AGREE TO THE <span className="text-neutral-900 font-black hover:underline">TERMS OF SERVICE</span> AND <span className="text-neutral-900 font-black hover:underline">PRIVACY POLICY</span>
              </label>
            </div>
            {errors.terms && <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider mt-1">{errors.terms.message}</span>}
          </div>

          {/* Submit button with dynamic loading text */}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] active:scale-[0.98] disabled:scale-100 disabled:bg-[var(--theme-primary)]/40 text-white font-black text-xs tracking-widest uppercase py-4 rounded-xl shadow-md mt-2 cursor-pointer transition-all duration-200"
          >
            {loading ? 'REGISTERING...' : 'REGISTER NOW'}
          </button>
        </form>

<<<<<<< HEAD
        <div className="relative flex py-4 items-center">
          <div className="flex-grow border-t border-neutral-200/60"></div>
          <span className="flex-shrink mx-4 text-[10px] font-black text-neutral-400 tracking-widest uppercase">OR</span>
          <div className="flex-grow border-t border-neutral-200/60"></div>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-neutral-50 active:scale-[0.98] disabled:scale-100 border border-neutral-200 text-neutral-800 font-bold text-xs tracking-widest uppercase py-4 rounded-xl shadow-md cursor-pointer transition-all duration-200"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.68 1.54 15.01 1 12 1 7.35 1 3.39 3.65 1.5 7.5l3.86 3C6.31 7.57 8.91 5.04 12 5.04z" />
            <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.43c-.28 1.44-1.1 2.66-2.33 3.48l3.6 2.79c2.1-1.94 3.79-4.8 3.79-8.42z" />
            <path fill="#FBBC05" d="M5.36 14.5c-.24-.72-.38-1.49-.38-2.3s.14-1.58.38-2.3L1.5 6.9C.54 8.88 0 11.08 0 13.5s.54 4.62 1.5 6.6l3.86-3.1z" />
            <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.92l-3.6-2.79c-1.1.74-2.52 1.18-4.36 1.18-3.09 0-5.69-2.53-6.64-5.46L1.5 16.1C3.39 19.96 7.35 22.61 12 23z" />
          </svg>
          {loading ? 'CONNECTING...' : 'Continue with Google'}
        </button>

=======
>>>>>>> 61e2559d0e1cd6e0dbf11f31859e58bc8057f893
        <div className="text-center mt-8 pt-6 border-t border-neutral-100">
          <p className="text-xs text-neutral-500 tracking-wider">
            ALREADY PART OF THE CREW?{' '}
            <Link to="/login" className="text-neutral-900 font-black tracking-widest hover:text-[var(--theme-primary)] transition-colors ml-1 uppercase">
              LOG IN &rarr;
            </Link>
          </p>
        </div>

      </div>
    </div>
  )
}

export default SignUp
