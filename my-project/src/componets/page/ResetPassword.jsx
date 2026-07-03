import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import authService from '../../appwrite/auth'
import { useToast } from '../../context/ToastContext'

function ResetPassword() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
    reset,
  } = useForm()

  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { showToast } = useToast()

  const userId = searchParams.get('userId') || 'firebase-user'
  const secret = searchParams.get('oobCode') || searchParams.get('secret')

  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState("")

  const onSubmit = async (data) => {
    if (!userId || !secret) {
      setServerError("Invalid or expired password reset link. Please request a new recovery email.")
      return
    }

    setServerError("")
    setLoading(true)

    try {
      await authService.updateRecovery(
        userId,
        secret,
        data.password.trim()
      )
      showToast("🔒 Password reset successful! You can now log in.", "success")
      reset()
      navigate('/login', { replace: true })
    } catch (error) {
      console.error("Reset Password Error:", error)
      let errorMsg = error?.message || "Failed to update password. Link may be expired.";
      if (errorMsg.includes('auth/invalid-action-code') || errorMsg.includes('auth/expired-action-code')) {
        errorMsg = "The reset link is invalid or has expired. Please request a new one.";
      } else if (errorMsg.includes('auth/weak-password')) {
        errorMsg = "Password is too weak. Please use a stronger password.";
      } else if (errorMsg.includes('Firebase: Error')) {
        errorMsg = "Failed to update password. Please try again.";
      }
      setServerError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-6 bg-[url(https://static.vecteezy.com/system/resources/previews/015/586/867/large_2x/overlay-distressed-concrete-texture-background-free-photo.jpg)] bg-cover bg-center relative selection:bg-[var(--color-accent)] selection:text-white animate-gradient-shift bg-[length:200%_200%]">
      <div className="absolute inset-0 bg-[var(--color-bg)]/95 backdrop-blur-xs z-10" />

      <div className="relative z-20 w-full max-w-md bg-[var(--color-surface)]/80 backdrop-blur-xl p-8 rounded-2xl border border-[var(--color-border)] shadow-2xl">

        <div className="text-center mb-8">
          <h2 className="text-xs tracking-[0.5em] text-[var(--color-accent)] font-black uppercase mb-2">Secure Account</h2>
          <h1 className="text-3xl font-black tracking-widest text-[var(--color-text)] uppercase">UPDATE PASSWORD</h1>
        </div>

        {/* Server error feedback */}
        {serverError && (
          <div className="mb-6 p-3 bg-rose-50 border border-rose-250 text-rose-600 text-[11px] font-black uppercase tracking-widest rounded-xl text-center animate-pulse">
            {serverError}
          </div>
        )}

        {(!userId || !secret) ? (
          <div className="text-center">
            <p className="text-sm text-[var(--color-muted)] mb-6 font-medium">
              Invalid or incomplete password reset parameters. Please check the link in your email or trigger another password recovery.
            </p>
            <Link to="/login" className="w-full inline-block bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black text-xs tracking-widest uppercase py-4 rounded-xl shadow-md transition-all duration-200 text-center">
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            {/* New Password Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black tracking-widest text-[var(--color-muted)] uppercase">New Password</label>
              <input
                type="password"
                placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                disabled={loading}
                className={`input-glow w-full bg-[var(--color-subtle)] border ${errors.password ? 'border-rose-300 focus:border-rose-500' : 'border-[var(--color-border)] focus:border-[var(--color-accent)]'} rounded-xl px-4 py-3.5 text-sm text-[var(--color-text)] placeholder-[var(--color-muted)] outline-hidden transition-colors disabled:opacity-50`}
                {...register("password", {
                  required: "Password is required",
                  minLength: { value: 6, message: "Password must be at least 6 characters" }
                })}
              />
              {errors.password && <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider">{errors.password.message}</span>}
            </div>

            {/* Confirm Password Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black tracking-widest text-[var(--color-muted)] uppercase">Confirm Password</label>
              <input
                type="password"
                placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                disabled={loading}
                className={`input-glow w-full bg-[var(--color-subtle)] border ${errors.confirmPassword ? 'border-rose-300 focus:border-rose-500' : 'border-[var(--color-border)] focus:border-[var(--color-accent)]'} rounded-xl px-4 py-3.5 text-sm text-[var(--color-text)] placeholder-[var(--color-muted)] outline-hidden transition-colors disabled:opacity-50`}
                {...register("confirmPassword", {
                  required: "Please confirm your password",
                  validate: (value) => value === getValues("password") || "Passwords do not match"
                })}
              />
              {errors.confirmPassword && <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider">{errors.confirmPassword.message}</span>}
            </div>

            {/* Submit button with dynamic loading text */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] active:scale-[0.98] disabled:scale-100 disabled:bg-[var(--color-accent)]/40 text-white font-black text-xs tracking-widest uppercase py-4 rounded-xl shadow-md mt-4 cursor-pointer transition-all duration-200"
            >
              {loading ? 'RESETTING...' : 'RESET PASSWORD'}
            </button>
          </form>
        )}

        <div className="text-center mt-8 pt-6 border-t border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-muted)] tracking-wider">
            REMEMBERED IT?{' '}
            <Link to="/login" className="text-[var(--color-text)] font-black tracking-widest hover:text-[var(--color-accent)] transition-colors ml-1 uppercase">
              LOG IN NOW &rarr;
            </Link>
          </p>
        </div>

      </div>
    </div>
  )
}

export default ResetPassword
