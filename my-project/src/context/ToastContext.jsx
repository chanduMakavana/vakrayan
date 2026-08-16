/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const ToastContext = createContext(null)


export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

// Sleek Custom SVG Icons for Premium UI feel
const SuccessIcon = () => (
  <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const ErrorIcon = () => (
  <svg className="w-5 h-5 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
)

const InfoIcon = () => (
  <svg className="w-5 h-5 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const CloseIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
)

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])
  const timersRef = useRef({})

  // Clean up all pending timers on unmount
  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach(clearTimeout)
    }
  }, [])

  const showToast = useCallback((message, type = 'info') => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prevToasts) => [...prevToasts, { id, message, type }])
    
    // Auto dismiss after 4 seconds — store ID so it can be cancelled on manual dismiss
    timersRef.current[id] = setTimeout(() => {
      setToasts((prevToasts) => prevToasts.filter((t) => t.id !== id))
      delete timersRef.current[id]
    }, 4000)
  }, [])

  const removeToast = useCallback((id) => {
    // Cancel the auto-dismiss timeout if the user manually closes the toast
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id])
      delete timersRef.current[id]
    }
    setToasts((prevToasts) => prevToasts.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Notification Container Portal */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-3 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
              className={`flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md shadow-xl pointer-events-auto select-none transition-all duration-300 ${
                toast.type === 'success'
                  ? 'bg-neutral-950/90 border-emerald-500/25 shadow-emerald-950/20 text-neutral-100'
                  : toast.type === 'error'
                  ? 'bg-neutral-950/90 border-rose-500/25 shadow-rose-950/20 text-neutral-100'
                  : 'bg-neutral-950/90 border-indigo-500/25 shadow-indigo-950/20 text-neutral-100'
              }`}
            >
              {toast.type === 'success' && <SuccessIcon />}
              {toast.type === 'error' && <ErrorIcon />}
              {toast.type === 'info' && <InfoIcon />}
              
              {/* ✅ Fixed: font size 11px→13px, removed uppercase (11px uppercase is inaccessible) */}
              <div className="flex-1 text-[13px] font-medium leading-relaxed pt-0.5">
                {toast.message}
              </div>
              
              <button
                onClick={() => removeToast(toast.id)}
                className="text-[var(--color-muted)] hover:text-neutral-200 p-0.5 rounded-md hover:bg-[var(--color-surface)]/5 transition-colors cursor-pointer shrink-0"
                aria-label="Close notification"
              >
                <CloseIcon />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
