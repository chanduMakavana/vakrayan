import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
)

const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
)

function ThemeToggle({ compact = false }) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("vakrayan_theme")
    if (saved) return saved === "dark"
    return window.matchMedia("(prefers-color-scheme: dark)").matches
  })

  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.setAttribute("data-theme", "dark")
      localStorage.setItem("vakrayan_theme", "dark")
    } else {
      root.removeAttribute("data-theme")
      localStorage.setItem("vakrayan_theme", "light")
    }
  }, [isDark])

  useEffect(() => {
    const saved = localStorage.getItem("vakrayan_theme")
    if (saved === "dark") {
      document.documentElement.setAttribute("data-theme", "dark")
    }
  }, [])

  const toggle = () => setIsDark(prev => !prev)

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="relative flex items-center justify-center cursor-pointer transition-all duration-200"
      style={{
        width: compact ? 36 : 40,
        height: compact ? 36 : 40,
        borderRadius: "var(--radius-sm)",
        background: isDark ? "rgba(52,211,153,0.12)" : "rgba(5,150,105,0.06)",
        border: `1px solid ${isDark ? "rgba(52,211,153,0.25)" : "var(--color-border)"}`,
        color: isDark ? "#34D399" : "var(--color-muted)",
        flexShrink: 0,
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isDark ? "moon" : "sun"}
          initial={{ opacity: 0, rotate: -30, scale: 0.7 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 30, scale: 0.7 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          {isDark ? <MoonIcon /> : <SunIcon />}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}

export default ThemeToggle
