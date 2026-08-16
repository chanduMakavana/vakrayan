import { useState } from 'react'
import { Link } from 'react-router-dom'
import campaignService from '../../services/campaign'
import { sendWebhookNotification } from '../../utils/webhookHelper'

// Social SVG icons (inline — no extra dep)
const InstagramIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
  </svg>
);

const PinterestIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
  </svg>
);

const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.259 5.63L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState('');

  const handleSubscribe = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) { setError('Invalid email — please re-enter.'); return; }
    try {
      await campaignService.subscribeNewsletter(email.trim());
      setSubscribed(true);
      sendWebhookNotification('newsletter.subscribe', { email: email.trim() });
      setEmail('');
    } catch (err) {
      console.error("Newsletter registration failed:", err);
      setError(err.message || 'Subscription failed. Try again later.');
    }
  };

  return (
    <footer
      style={{
        background: 'linear-gradient(160deg, #062C1E 0%, #031F14 60%, #02140D 100%)',
        borderTop: '1px solid rgba(5,150,105,0.30)'
      }}
    >
      {/* Top green glow line */}
      <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, #059669, #34D399, #059669, transparent)' }} />

      <div className="max-w-[1728px] mx-auto px-6 md:px-12 pt-10 pb-8">
        
        {/* Giant Brand Logo Title */}
        <div className="w-full flex flex-col items-center mb-8 px-4 text-center">
          <img 
            src="/vakrayan-text.png"
            alt="Vakrayan"
            loading="lazy"
            decoding="async"
            width={700}
            height={150}
            className="w-full max-w-[700px] h-auto object-contain"
            style={{
              filter: 'brightness(0) invert(1)',
              opacity: 0.95
            }}
          />
          <p className="mt-3 max-w-md" style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, lineHeight: 1.6, fontFamily: "'Jost', sans-serif" }}>
            Premium heavyweight drops crafted carefully to define contemporary street culture.
          </p>
          {/* Social icons — proper SVGs */}
          <div className="flex gap-4 mt-4">
            {[
              { Icon: InstagramIcon, label: 'Instagram', href: 'https://www.instagram.com/vakrayan_official/' },
              { Icon: PinterestIcon, label: 'Pinterest', href: 'https://in.pinterest.com/vakrayan_official' },
              { Icon: XIcon, label: 'X (Twitter)', href: '#' },
            ].map(({ Icon, label, href }) => (
              <a
                key={label}
                target='_blank'
                href={href}
                aria-label={label}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer"
                style={{
                  background: 'rgba(5,150,105,0.12)',
                  border: '1px solid rgba(5,150,105,0.25)',
                  color: 'rgba(255,255,255,0.60)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(5,150,105,0.28)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(5,150,105,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.60)'; }}
              >
                <Icon />
              </a>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">

          {/* Navigation */}
          <div className="flex flex-col gap-4">
            <h3 style={{ fontFamily: "'Jost', sans-serif", fontSize: 12, fontWeight: 900, letterSpacing: '0.14em', color: '#059669', textTransform: 'uppercase' }}>
              NAVIGATION
            </h3>
            {[
              { to: '/', label: 'Home' },
              { to: '/shop', label: 'All Products' },
              { to: '/category/printed-tshirt', label: 'New Arrivals' },
              { to: '/category/shirts', label: "Men's Wear" },
            ].map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                style={{ color: 'rgba(255,255,255,0.50)', fontSize: 14, fontFamily: "'Jost', sans-serif", fontWeight: 500 }}
                className="transition-colors duration-200 hover:text-white w-fit"
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Follow */}
          <div className="flex flex-col gap-4">
            <h3 style={{ fontFamily: "'Jost', sans-serif", fontSize: 12, fontWeight: 900, letterSpacing: '0.14em', color: '#059669', textTransform: 'uppercase' }}>
              FOLLOW US
            </h3>
            {[
              { label: 'Instagram ↗', href: 'https://www.instagram.com/vakrayan_official/' },
              { label: 'Pinterest ↗', href: 'https://www.pinterest.com/' },
              { label: 'Twitter / X ↗', href: 'https://x.com/' },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'rgba(255,255,255,0.50)', fontSize: 14, fontFamily: "'Jost', sans-serif", fontWeight: 500 }}
                className="transition-colors duration-200 hover:text-white w-fit cursor-pointer"
              >
                {label}
              </a>
            ))}
          </div>

          {/* Newsletter */}
          <div className="flex flex-col gap-4">
            <h3 style={{ fontFamily: "'Jost', sans-serif", fontSize: 12, fontWeight: 900, letterSpacing: '0.14em', color: '#059669', textTransform: 'uppercase' }}>
              GET THE INTEL
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, lineHeight: 1.6, fontFamily: "'Jost', sans-serif" }}>
              Early drops, secret discounts & exclusive access.
            </p>
            {!subscribed ? (
              <form onSubmit={handleSubscribe} className="flex flex-col gap-2 mt-1">
                <div
                  className="flex overflow-hidden"
                  style={{ borderRadius: 10, border: '1px solid rgba(5,150,105,0.30)', background: 'rgba(5,150,105,0.08)' }}
                >
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    style={{
                      background: 'transparent',
                      color: '#fff',
                      fontSize: 13,
                      padding: '11px 14px',
                      outline: 'none',
                      flex: 1,
                      fontFamily: "'Jost', sans-serif"
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      background: '#059669',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: 12,
                      padding: '0 16px',
                      cursor: 'pointer',
                      fontFamily: "'Jost', sans-serif",
                      letterSpacing: '0.05em',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#047857'}
                    onMouseLeave={e => e.currentTarget.style.background = '#059669'}
                  >
                    JOIN
                  </button>
                </div>
                {error && <p style={{ color: '#F87171', fontSize: 12, fontFamily: "'Jost', sans-serif" }}>{error}</p>}
              </form>
            ) : (
              <div
                className="animate-scale-up p-4 mt-1"
                style={{ borderRadius: 12, background: 'rgba(5,150,105,0.15)', border: '1px solid rgba(5,150,105,0.30)' }}
              >
                <p style={{ color: '#34D399', fontWeight: 700, fontSize: 13, fontFamily: "'Jost', sans-serif" }}>
                  ✓ You're in the loop!
                </p>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 4, fontFamily: "'Jost', sans-serif" }}>
                  Get ready for exclusive early drops.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="mt-14 pt-6 flex flex-col md:flex-row justify-between items-center gap-4"
          style={{ borderTop: '1px solid rgba(5,150,105,0.15)' }}
        >
          <span style={{ color: 'rgba(255,255,255,0.30)', fontSize: 12, fontFamily: "'Jost', sans-serif" }}>
            © 2026 Vakrayan Co. All rights reserved.
          </span>
          <div className="flex gap-6">
            <Link
              to="/privacy"
              style={{ color: 'rgba(255,255,255,0.30)', fontSize: 12, fontFamily: "'Jost', sans-serif" }}
              className="hover:text-white transition-colors duration-200"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms"
              style={{ color: 'rgba(255,255,255,0.30)', fontSize: 12, fontFamily: "'Jost', sans-serif" }}
              className="hover:text-white transition-colors duration-200"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
