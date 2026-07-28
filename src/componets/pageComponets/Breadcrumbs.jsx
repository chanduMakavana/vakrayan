import { Link } from "react-router-dom"

const ChevronIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 18l6-6-6-6"/>
  </svg>
)

// crumbs = [{ label: "Home", to: "/" }, { label: "Shop", to: "/shop" }, { label: "Product Name" }]
// Last item has no `to` — it is the current page
function Breadcrumbs({ crumbs = [], className = "" }) {
  if (!crumbs || crumbs.length < 2) return null

  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center gap-1.5 flex-wrap ${className}`}
    >
      {crumbs.map((crumb, idx) => {
        const isLast = idx === crumbs.length - 1
        return (
          <span key={idx} className="flex items-center gap-1.5">
            {idx > 0 && (
              <span style={{ color: "var(--color-border-hard)", flexShrink: 0 }}>
                <ChevronIcon />
              </span>
            )}
            {isLast ? (
              <span
                aria-current="page"
                className="truncate max-w-[180px]"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--color-text)",
                  fontFamily: "'Jost', sans-serif",
                  letterSpacing: "0.01em",
                }}
              >
                {crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.to}
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--color-muted)",
                  fontFamily: "'Jost', sans-serif",
                  letterSpacing: "0.01em",
                  textDecoration: "none",
                  transition: "color 0.15s",
                }}
                className="hover:text-[var(--color-accent)] transition-colors duration-150"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}

export default Breadcrumbs
