import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useSelector, useDispatch } from 'react-redux'
import { createAccount } from '../../features/login'
import { Link, useNavigate } from 'react-router-dom'

function SignUp() {
  const { register, handleSubmit, formState: { errors }, reset } = useForm()
  const [message, setMessage] = useState('')
  const dispatch = useDispatch()
  const login = useSelector((state) => state.login)
  const navigate = useNavigate()

  async function onSubmit(data) {
    try {
      await dispatch(createAccount(data))
      setMessage('Account created successfully!')
      reset()
      navigate('/login')
    } catch (err) {
      setMessage('Error creating account. Please try again.')
    }
  }

  return (
    <div className="min-h-screen flex bg-[#0f1117]">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-linear-to-br from-violet-950 via-[#0f1117] to-indigo-950 items-center justify-center p-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(139,92,246,0.15)_0%,_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(99,102,241,0.1)_0%,_transparent_60%)]" />
        <div className="relative z-10 max-w-md text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-600/20 border border-violet-500/30 text-3xl mb-2">
            ✨
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight">
            Join <span className="text-violet-400">DashApp</span> today
          </h1>
          <p className="text-gray-400 text-base leading-relaxed">
            Create your free account in seconds and get instant access to your personal secure dashboard.
          </p>
          <div className="grid grid-cols-1 gap-3 pt-2 text-left">
            {[
              { icon: '🛡️', text: 'Redux-powered secure state management' },
              { icon: '⚡', text: 'Instant account setup, no credit card needed' },
              { icon: '🔒', text: 'Your data stays private and protected' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm text-gray-300">{item.text}</span>
              </div>
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
              <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-sm">✨</div>
              <span className="text-white font-bold text-lg">DashApp</span>
            </div>
            <h2 className="text-3xl font-bold text-white">Create account</h2>
            <p className="mt-2 text-gray-400 text-sm">Fill in the details below to get started</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-300">Full name</label>
              <input
                {...register("name", { required: "Name is required" })}
                type="text"
                placeholder="John Doe"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all duration-200 text-sm"
              />
              {errors.name && (
                <p className="text-red-400 text-xs flex items-center gap-1 mt-1">
                  <span>⚠</span> {errors.name.message}
                </p>
              )}
            </div>

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
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all duration-200 text-sm"
              />
              {errors.email && (
                <p className="text-red-400 text-xs flex items-center gap-1 mt-1">
                  <span>⚠</span> {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-300">Password</label>
              <input
                {...register("password", {
                  required: "Password is required",
                  minLength: { value: 6, message: "Password must be at least 6 characters" }
                })}
                type="password"
                placeholder="Min. 6 characters"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all duration-200 text-sm"
              />
              {errors.password && (
                <p className="text-red-400 text-xs flex items-center gap-1 mt-1">
                  <span>⚠</span> {errors.password.message}
                </p>
              )}
            </div>

            {/* Status Message */}
            {message && (
              <div className={`px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 ${
                message.includes('successfully')
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/10 border border-red-500/20 text-red-400'
              }`}>
                <span>{message.includes('successfully') ? '✓' : '⚠'}</span>
                {message}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-all duration-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:ring-offset-2 focus:ring-offset-[#0f1117] shadow-lg shadow-violet-600/20"
            >
              Create Account →
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-gray-500 uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Login Link */}
            <Link
              to="/login"
              className="w-full flex justify-center py-3 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium transition-all duration-200 active:scale-[0.98]"
            >
              Already have an account? Sign In
            </Link>
          </form>
        </div>
      </div>
    </div>
  )
}

export default SignUp
