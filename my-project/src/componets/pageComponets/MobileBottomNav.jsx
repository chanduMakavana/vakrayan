import { useEffect, useState } from "react"
import { NavLink, useNavigate } from "react-router-dom"
import { useSelector } from "react-redux"
import { motion, AnimatePresence } from "framer-motion"

const HomeIcon = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)

const ShopIcon = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="9" cy="21" r="1"/>
    <circle cx="20" cy="21" r="1"/>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
  </svg>
)

const CartIcon = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <path d="M16 10a4 4 0 0 1-8 0"/>
  </svg>
)

const UserIcon = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
)

function MobileBottomNav() {
  const navigate = useNavigate()
  const cartItems = useSelector(s => s.cart || [])
  const { isAuthenticated } = useSelector(s => s.auth)
  const cartCount = cartItems.reduce((acc, i) => acc + Number(i.quantity || 0), 0)

  // Hide on scroll down, show on scroll up
  const [visible, setVisible] = useState(true)
  const [lastY, setLastY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY
      if (currentY < 60) { setVisible(true); setLastY(currentY); return }
      setVisible(currentY < lastY)
      setLastY(currentY)
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [lastY])

  const tabs = [
    { to: "/", label: "Home", Icon: HomeIcon },
    { to: "/shop", label: "Shop", Icon: ShopIcon },
    { to: "/cart", label: "Cart", Icon: CartIcon, badge: cartCount },
    { to: isAuthenticated ? "/profile" : "/login", label: isAuthenticated ? "Profile" : "Login", Icon: UserIcon },
  ]

  return (
    <AnimatePresence>
      {visible && (
        <motion.nav
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          aria-label="Mobile navigation"
          className="md:hidden fixed bottom-0 left-0 right-0 z-[150]"
          style={{
            background: "var(--glass-bg-heavy)",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            borderTop: "1px solid var(--glass-border-green)",
            boxShadow: "0 -4px 24px rgba(5,150,105,0.10)",
            paddingBottom: "env(safe-area-inset-bottom, 8px)",
          }}
        >
          <div className="flex items-center justify-around px-2 pt-2 pb-1">
            {tabs.map(({ to, label, Icon, badge }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className="flex flex-col items-center gap-1 flex-1 py-1 relative select-none"
                style={({ isActive }) => ({
                  color: isActive ? "var(--color-accent)" : "var(--color-muted)",
                })}
                aria-label={label}
              >
                {({ isActive }) => (
                  <>
                    <span className="relative">
                      <Icon active={isActive} />
                      {badge > 0 && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-black text-white"
                          style={{ background: "var(--color-accent)", fontFamily: "'Jost', sans-serif" }}
                        >
                          {badge > 9 ? "9+" : badge}
                        </motion.span>
                      )}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: isActive ? 700 : 500,
                        fontFamily: "'Jost', sans-serif",
                        letterSpacing: "0.04em",
                        transition: "color 0.2s",
                      }}
                    >
                      {label}
                    </span>
                    {isActive && (
                      <motion.div
                        layoutId="mobile-nav-indicator"
                        className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                        style={{ background: "var(--color-accent)" }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  )
}

export default MobileBottomNav
