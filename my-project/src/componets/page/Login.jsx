import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { login as loginAction } from '../../features/login' // Alias used to avoid naming collision with local submit function
import authService from '../../appwrite/auth'
import cartService from '../../appwrite/cart'
import { setCartItems } from '../../features/addToCart'

function Login() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm()

  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { isAuthenticated } = useSelector((state) => state.auth)

  // Local states for form handling and error management
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState("")

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
            const cartItems = await cartService.getCartItems(userData.$id);
            dispatch(setCartItems(cartItems));
          } catch (cartErr) {
            console.error("Cart retrieval on login failed:", cartErr);
          }
        }
        
        reset();
        navigate('/');
      }
    } catch (error) {
      console.error("Login Error:", error);
      setServerError(error?.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };  


  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
      return;
    }
    const userLoginStatus = async()=>{
      try{
        const session = await authService.getCurrentUser();
        if(session){
          navigate('/')
        }
      }
      catch(error){
        console.log("User Already Login",error);
      }
    }
    userLoginStatus();
  }, [navigate, isAuthenticated]);

  return (
    <div className="w-full min-h-screen bg-[#fafafb] flex items-center justify-center p-6 bg-[url(https://static.vecteezy.com/system/resources/previews/015/586/867/large_2x/overlay-distressed-concrete-texture-background-free-photo.jpg)] bg-cover bg-center relative selection:bg-neutral-900 selection:text-white">
      <div className="absolute inset-0 bg-white/95 backdrop-blur-xs z-10" />

      <div className="relative z-20 w-full max-w-md bg-white p-8 rounded-2xl border border-neutral-200/60 shadow-xl">

        <div className="text-center mb-8">
          <h2 className="text-xs tracking-[0.5em] text-[var(--theme-accent)] font-black uppercase mb-2">Welcome Back</h2>
          <h1 className="text-3xl font-black tracking-widest text-neutral-900 uppercase">CREW SIGN IN</h1>
        </div>

        {/* Server error feedback */}
        {serverError && (
          <div className="mb-6 p-3 bg-rose-50 border border-rose-250 text-rose-600 text-[11px] font-black uppercase tracking-widest rounded-xl text-center animate-pulse">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">

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
                  message: "Invalid email format"
                }
              })}
            />
            {errors.email && <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider">{errors.email.message}</span>}
          </div>

          {/* Password Input */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">Password</label>
              <a href="#" className="text-[10px] font-bold text-neutral-400 hover:text-[var(--theme-primary)] tracking-wider uppercase transition-colors">Forgot?</a>
            </div>
            <input
              type="password"
              placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
              disabled={loading}
              className={`w-full bg-[#fbfbfb] border ${errors.password ? 'border-rose-300 focus:border-rose-500' : 'border-neutral-200 focus:border-[var(--theme-primary)]'} rounded-xl px-4 py-3.5 text-sm text-neutral-900 placeholder-neutral-400 outline-hidden transition-colors disabled:opacity-50`}
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
              className="accent-neutral-950 rounded border-neutral-200 bg-[#fbfbfb] cursor-pointer h-4 w-4 disabled:opacity-50"
              {...register("remember")}
            />
            <label htmlFor="remember" className="text-[11px] text-neutral-400 tracking-widest font-bold uppercase cursor-pointer">Remember Device</label>
          </div>

          {/* Submit button with dynamic loading text */}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] active:scale-[0.98] disabled:scale-100 disabled:bg-[var(--theme-primary)]/40 text-white font-black text-xs tracking-widest uppercase py-4 rounded-xl shadow-md mt-4 cursor-pointer transition-all duration-200"
          >
            {loading ? 'AUTHENTICATING...' : 'SIGN IN'}
          </button>
        </form>

        <div className="text-center mt-8 pt-6 border-t border-neutral-100">
          <p className="text-xs text-neutral-500 tracking-wider">
            NEW TO THE CLUB?{' '}
            <Link to="/signup" className="text-neutral-900 font-black tracking-widest hover:text-[var(--theme-primary)] transition-colors ml-1 uppercase">
              REGISTER NOW &rarr;
            </Link>
          </p>
        </div>

      </div>
    </div>
  )
}

export default Login