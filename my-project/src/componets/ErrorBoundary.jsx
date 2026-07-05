import { Component } from 'react'

/**
 * ErrorBoundary — Global React crash handler.
 *
 * Catches any runtime errors thrown inside its child tree (e.g., a
 * failed JSON.parse, a null dereference, or a bad Firebase response)
 * and renders a branded fallback UI instead of a blank white screen.
 *
 * Must be a class component — React's error boundary API requires
 * getDerivedStateFromError / componentDidCatch lifecycle methods.
 *
 * Usage in main.jsx:
 *   <ErrorBoundary>
 *     <App />
 *   </ErrorBoundary>
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // In production, pipe this to an error monitoring service (Sentry, etc.)
    console.error('ErrorBoundary caught a crash:', error, info.componentStack)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            background: '#fafafb',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            fontFamily: "'Inter', sans-serif",
            textAlign: 'center'
          }}
        >
          {/* Brand wordmark */}
          <h1
            style={{
              fontSize: '1.25rem',
              fontWeight: 900,
              letterSpacing: '0.4em',
              color: '#0a0a0a',
              textTransform: 'uppercase',
              marginBottom: '2rem'
            }}
          >
            VAKRAYAN
          </h1>

          {/* Error icon */}
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: '#fff1f2',
              border: '1px solid #fecdd3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              marginBottom: '1.5rem'
            }}
          >
            ⚠️
          </div>

          {/* Heading */}
          <h2
            style={{
              fontSize: '1.125rem',
              fontWeight: 900,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: '#0a0a0a',
              marginBottom: '0.75rem'
            }}
          >
            Something Went Wrong
          </h2>

          {/* Message */}
          <p
            style={{
              fontSize: '0.75rem',
              color: '#737373',
              maxWidth: 320,
              lineHeight: 1.8,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              fontWeight: 600,
              marginBottom: '2rem'
            }}
          >
            An unexpected error occurred. Our team has been notified.
            Please reload the page to continue.
          </p>

          {/* Reload CTA */}
          <button
            onClick={this.handleReload}
            style={{
              background: '#0a0a0a',
              color: '#ffffff',
              border: 'none',
              borderRadius: 12,
              padding: '14px 32px',
              fontSize: '0.7rem',
              fontWeight: 900,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => (e.target.style.background = '#333')}
            onMouseLeave={(e) => (e.target.style.background = '#0a0a0a')}
          >
            Reload Page →
          </button>

          {/* Dev-only error detail */}
          {import.meta.env.DEV && this.state.error && (
            <pre
              style={{
                marginTop: '2rem',
                padding: '1rem',
                background: '#fff1f2',
                border: '1px solid #fecdd3',
                borderRadius: 8,
                fontSize: '0.65rem',
                color: '#be123c',
                maxWidth: 560,
                textAlign: 'left',
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}
            >
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
