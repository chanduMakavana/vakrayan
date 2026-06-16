import { useState } from 'react'
import { Link } from 'react-router-dom'
import campaignService from '../../appwrite/campaign'
import { sendWebhookNotification } from '../../utils/webhookHelper'

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
        background: 'linear-gradient(160deg, #0D1A14 0%, #0A1510 60%, #031008 100%)',
        borderTop: '1px solid rgba(5,150,105,0.20)'
      }}
    >
      {/* Top green glow line */}
      <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, #059669, #34D399, #059669, transparent)' }} />

      <div className="max-w-7xl mx-auto px-6 md:px-12 pt-16 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">

          {/* Brand */}
          <div className="flex flex-col gap-5 md:col-span-1">
            <div>
              <h3
                className="text-[32px] leading-none mb-1"
                style={{ fontFamily: "'Chelsea Market', cursive", color: '#FFFFFF' }}
              >
                Vakrayan
              </h3>
              <div style={{ width: 40, height: 3, background: 'linear-gradient(90deg,#059669,#34D399)', borderRadius: 99 }} />
            </div>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, lineHeight: 1.7, fontFamily: "'Jost', sans-serif" }}>
              Premium heavyweight drops crafted carefully to define contemporary street culture.
            </p>
            {/* Social icons */}
            <div className="flex gap-3 mt-1">
              {['IG', 'TW', 'PT'].map(s => (
                <a
                  key={s}
                  href="#"
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold transition-all duration-200 cursor-pointer"
                  style={{
                    background: 'rgba(5,150,105,0.12)',
                    border: '1px solid rgba(5,150,105,0.25)',
                    color: 'rgba(255,255,255,0.60)',
                    fontFamily: "'Jost', sans-serif"
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(5,150,105,0.25)'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(5,150,105,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.60)'; }}
                >
                  {s}
                </a>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex flex-col gap-4">
            <h4 style={{ fontFamily: "'Bungee', sans-serif", fontSize: 11, letterSpacing: '0.1em', color: '#059669' }}>
              NAVIGATION
            </h4>
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
            <h4 style={{ fontFamily: "'Bungee', sans-serif", fontSize: 11, letterSpacing: '0.1em', color: '#059669' }}>
              FOLLOW US
            </h4>
            {['Instagram ↗', 'Pinterest ↗', 'Twitter / X ↗'].map(s => (
              <a
                key={s}
                href="#"
                style={{ color: 'rgba(255,255,255,0.50)', fontSize: 14, fontFamily: "'Jost', sans-serif", fontWeight: 500 }}
                className="transition-colors duration-200 hover:text-white w-fit cursor-pointer"
              >
                {s}
              </a>
            ))}
          </div>

          {/* Newsletter */}
          <div className="flex flex-col gap-4">
            <h4 style={{ fontFamily: "'Bungee', sans-serif", fontSize: 11, letterSpacing: '0.1em', color: '#059669' }}>
              GET THE INTEL
            </h4>
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
            {['Privacy Policy', 'Terms of Service'].map(t => (
              <a
                key={t}
                href="#"
                style={{ color: 'rgba(255,255,255,0.30)', fontSize: 12, fontFamily: "'Jost', sans-serif" }}
                className="hover:text-white transition-colors duration-200 cursor-pointer"
              >
                {t}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
