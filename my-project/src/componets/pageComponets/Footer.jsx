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
    
    if (!email.trim()) {
      setError('PLEASE ENTER AN EMAIL ADDRESS.');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('INVALID EMAIL ALIGNMENT. PLEASE RE-ENTER.');
      return;
    }
    
    try {
      await campaignService.subscribeNewsletter(email.trim());
      setSubscribed(true);
      
      // Dispatch newsletter.subscribe webhook notification
      sendWebhookNotification('newsletter.subscribe', {
        email: email.trim()
      });
      
      setEmail('');
    } catch (err) {
      console.error("Newsletter registration failed:", err);
      setError('SUBSCRIPTION FAIL. TRY AGAIN LATER.');
    }
  };
  return (
    <footer className="bg-gradient-to-b from-[var(--color-subtle)] to-[var(--color-bg)] text-[var(--color-muted)] py-16 px-6 md:px-12 border-t border-[var(--color-border)]">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-6">
        
        {/* Brand Info */}
        <div className="flex flex-col gap-4">
          <h3 className="text-[var(--color-text)] text-xl font-black tracking-widest uppercase">
            STREET<span className="text-[var(--color-accent)]">-</span>WEAR
          </h3>
          <p className="text-xs text-[var(--color-muted)] leading-relaxed max-w-xs uppercase tracking-wide font-medium">
            Premium heavyweight drops crafted carefully to define contemporary street culture. Join the movement.
          </p>
        </div>

        {/* Quick Links */}
        <div className="flex flex-col gap-3">
          <h4 className="text-[var(--color-text)] text-xs font-black tracking-widest uppercase mb-1">Navigation</h4>
          <Link to="/" className="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors uppercase font-medium">Home</Link>
          <Link to="/category/printed-tshirt" className="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors uppercase font-medium">New Arrivals</Link>
          <Link to="/category/shirts" className="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors uppercase font-medium">Men's Wear</Link>
          <Link to="/about" className="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors uppercase font-medium">About Brand</Link>
        </div>

        {/* Social Handles */}
        <div className="flex flex-col gap-3">
          <h4 className="text-[var(--color-text)] text-xs font-black tracking-widest uppercase mb-1">Follow Us</h4>
          <a href="#" className="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors tracking-wider font-mono font-bold hover:underline underline-offset-4">INSTAGRAM &nearr;</a>
          <a href="#" className="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors tracking-wider font-mono font-bold hover:underline underline-offset-4">PINTEREST &nearr;</a>
          <a href="#" className="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors tracking-wider font-mono font-bold hover:underline underline-offset-4">TWITTER / X &nearr;</a>
        </div>

        {/* Newsletter Subscription */}
        <div className="flex flex-col gap-3">
          <h4 className="text-[var(--color-text)] text-xs font-black tracking-widest uppercase mb-1">Get the Intel</h4>
          <p className="text-xs text-[var(--color-muted)] uppercase tracking-wide font-medium">Subscribe to receive early drops notification and secret discounts.</p>
          
          {!subscribed ? (
            <form onSubmit={handleSubscribe} className="space-y-1">
              <div className="flex mt-2 max-w-sm rounded-2xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm focus-within:shadow-md focus-within:border-[var(--color-accent)] transition-all duration-300">
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ENTER YOUR EMAIL" 
                  className="bg-transparent text-[var(--color-text)] placeholder-[var(--color-muted)] text-[10px] tracking-wider px-4 py-3 w-full outline-hidden"
                />
                <button type="submit" className="bg-[var(--color-accent)] text-white font-black text-xs px-5 uppercase hover:bg-[var(--color-accent-hover)] transition-colors cursor-pointer rounded-r-2xl">
                  Join
                </button>
              </div>
              {error && (
                <p className="text-[9px] text-[var(--color-danger)] font-mono tracking-widest uppercase pt-1 animate-pulse">
                  {error}
                </p>
              )}
            </form>
          ) : (
            <div className="mt-2 p-3.5 bg-emerald-950 text-emerald-400 border border-emerald-900/60 rounded-xl text-[10px] font-black uppercase tracking-widest leading-relaxed max-w-xs animate-scale-up">
              ✓ YOU ARE NOW IN THE LOOP.<br />
              <span className="text-emerald-500 font-mono text-[9px] font-medium tracking-wider">GET READY FOR EXCLUSIVE EARLY DROPS.</span>
            </div>
          )}
        </div>

      </div>

      {/* Copyright Disclaimer */}
      <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-[var(--color-border)] flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] tracking-widest text-[var(--color-muted)] uppercase font-bold">
        <span>&copy; 2026 STREETWEAR CO. ALL RIGHTS RESERVED.</span>
        <div className="flex gap-6">
          <a href="#" className="hover:text-[var(--color-text)] transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-[var(--color-text)] transition-colors">Terms of Service</a>
        </div>
      </div>
    </footer>
  )
}

export default Footer
