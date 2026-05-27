import React from 'react'
import { useDispatch } from 'react-redux'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '../../features/login'

function Login() {
  const { register, handleSubmit, formState: { errors }, reset } = useForm()
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const onSubmit = async (data) => {
    try {
      await dispatch(login(data))
      reset()
      navigate('/home')
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div className="min-h-screen flex bg-[#0f1117]">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-linear-to-br from-indigo-950 via-[#0f1117] to-violet-950 items-center justify-center p-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(99,102,241,0.15)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(139,92,246,0.1)_0%,transparent_60%)]" />
        <div className="relative z-10 max-w-md text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-3xl mb-2">
            🔐
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight">
            Welcome back to <span className="text-indigo-400">DashApp</span>
          </h1>
          <p className="text-gray-400 text-base leading-relaxed">
            Securely manage your account, monitor your session, and stay in control of your data.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            {['Redux', 'React', 'Secure'].map((tag) => (
              <span key={tag} className="px-3 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-gray-400">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div>
            <div className="lg:hidden flex items-center gap-2 mb-8">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-sm">🔐</div>
              <span className="text-white font-bold text-lg">DashApp</span>
            </div>
            <h2 className="text-3xl font-bold text-white">Sign in</h2>
            <p className="mt-2 text-gray-400 text-sm">Enter your credentials to access your dashboard</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-300">Email address</label>
              <input
                {...register("email", {
                  required: "Email is required",
                  pattern: { value: /^\S+@\S+$/i, message: "Invalid email address" }
                })}
                type="email"
                placeholder="you@company.com"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all duration-200 text-sm"
              />
              {errors.email && (
                <p className="text-red-400 text-xs flex items-center gap-1 mt-1">
                  <span>⚠</span> {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-300">Password</label>
                <a href="#" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Forgot password?</a>
              </div>
              <input
                {...register("password", {
                  required: "Password is required",
                  minLength: { value: 6, message: "Password must be at least 6 characters" }
                })}
                type="password"
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all duration-200 text-sm"
              />
              {errors.password && (
                <p className="text-red-400 text-xs flex items-center gap-1 mt-1">
                  <span>⚠</span> {errors.password.message}
                </p>
              )}
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-2">
              <input
                {...register("rememberMe")}
                type="checkbox"
                id="rememberMe"
                className="w-4 h-4 rounded border-gray-600 bg-white/5 text-indigo-600 focus:ring-indigo-500/30 cursor-pointer"
              />
              <label htmlFor="rememberMe" className="text-sm text-gray-400 cursor-pointer select-none">
                Keep me signed in
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all duration-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-[#0f1117] shadow-lg shadow-indigo-600/20"
            >
              Sign In →
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-gray-500 uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Register Link */}
            <Link
              to="/"
              className="w-full flex justify-center py-3 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium transition-all duration-200 active:scale-[0.98]"
            >
              Create a new account
            </Link>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login
