import React from 'react'
import { useForm } from 'react-hook-form'
import { useDispatch } from 'react-redux'
import { Link } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { login } from '../../features/login'
function Login() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm()

    const dispatch = useDispatch();
    const navigate = useNavigate();

  const onSubmit = async (data) => {
    
    await dispatch(login(data))
    navigate('/')
    reset()
  }

  return (
    <div className="w-full min-h-screen bg-[#0f0f11] flex items-center justify-center p-6 bg-[url(https://static.vecteezy.com/system/resources/previews/015/586/867/large_2x/overlay-distressed-concrete-texture-background-free-photo.jpg)] bg-cover bg-center relative selection:bg-red-500 selection:text-white">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-xs z-10" />

      <div className="relative z-20 w-full max-w-md bg-neutral-950/80 p-8 rounded-2xl border border-white/5 shadow-2xl backdrop-blur-md">
        
        <div className="text-center mb-8">
          <h2 className="text-xs tracking-[0.5em] text-red-500 font-black uppercase mb-2">Welcome Back</h2>
          <h1 className="text-3xl font-black tracking-widest text-white uppercase">CREW SIGN IN</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          
          {/* Email Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black tracking-widest text-gray-400 uppercase">Email Address</label>
            <input 
              type="text" 
              placeholder="YOU@EXAMPLE.COM" 
              className={`w-full bg-neutral-900/60 border ${errors.email ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-red-500'} rounded-xl px-4 py-3.5 text-sm text-white placeholder-gray-600 outline-hidden tracking-wider transition-colors font-medium`}
              {...register("email", { 
                required: "Email is required",
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "Invalid email format"
                }
              })}
            />
            {errors.email && <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider">{errors.email.message}</span>}
          </div>

          {/* Password Input */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black tracking-widest text-gray-400 uppercase">Password</label>
              <a href="#" className="text-[10px] font-bold text-gray-500 hover:text-red-500 tracking-wider uppercase transition-colors">Forgot?</a>
            </div>
            <input 
              type="password" 
              placeholder="••••••••••••" 
              className={`w-full bg-neutral-900/60 border ${errors.password ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-red-500'} rounded-xl px-4 py-3.5 text-sm text-white placeholder-gray-600 outline-hidden transition-colors`}
              {...register("password", { required: "Password is required" })}
            />
            {errors.password && <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider">{errors.password.message}</span>}
          </div>

          {/* Remember Me Checkbox */}
          <div className="flex items-center gap-3 mt-1 select-none">
            <input 
              type="checkbox" 
              id="remember" 
              className="accent-red-500 rounded border-white/10 bg-neutral-900 cursor-pointer h-4 w-4"
              {...register("remember")}
            />
            <label htmlFor="remember" className="text-[11px] text-gray-500 tracking-widest font-bold uppercase cursor-pointer">Remember Device</label>
          </div>

          <button type="submit" className="w-full bg-red-500 hover:bg-red-600 active:scale-[0.98] transition-all text-white font-black text-xs tracking-widest uppercase py-4 rounded-xl shadow-lg mt-4 cursor-pointer">
            SIGN IN
          </button>
        </form>

        <div className="text-center mt-8 pt-6 border-t border-white/5">
          <p className="text-xs text-gray-500 tracking-wider">
            NEW TO THE CLUB?{' '}
            <Link to="/signup" className="text-white font-black tracking-widest hover:text-red-500 transition-colors ml-1 uppercase">
              REGISTER NOW &rarr;
            </Link>
          </p>
        </div>

      </div>
    </div>
  )
}

export default Login