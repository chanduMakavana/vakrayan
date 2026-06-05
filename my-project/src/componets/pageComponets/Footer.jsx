import { useState } from 'react'
import { Link } from 'react-router-dom'
import campaignService from '../../appwrite/campaign'

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
      setEmail('');
    } catch (err) {
      console.error("Newsletter registration failed:", err);
      setError('SUBSCRIPTION FAIL. TRY AGAIN LATER.');
    }
  };
  return (
    <footer className="bg-[#f4f4f6] text-neutral-600 py-16 px-6 md:px-12 border-t border-neutral-200/50">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-6">
        
        {/* Brand Info */}
        <div className="flex flex-col gap-4">
          <h3 className="text-neutral-900 text-xl font-black tracking-widest uppercase">
            STREET<span className="text-[var(--theme-primary)]">-</span>WEAR
          </h3>
          <p className="text-xs text-neutral-500 leading-relaxed max-w-xs uppercase tracking-wide font-medium">
            Premium heavyweight drops crafted carefully to define contemporary street culture. Join the movement.
          </p>
        </div>

        {/* Quick Links */}
        <div className="flex flex-col gap-3">
          <h4 className="text-neutral-900 text-xs font-black tracking-widest uppercase mb-1">Navigation</h4>
          <Link to="/" className="text-xs text-neutral-500 hover:text-neutral-900 transition-colors uppercase font-medium">Home</Link>
          <Link to="/category/printed-tshirt" className="text-xs text-neutral-500 hover:text-neutral-900 transition-colors uppercase font-medium">New Arrivals</Link>
          <Link to="/category/shirts" className="text-xs text-neutral-500 hover:text-neutral-900 transition-colors uppercase font-medium">Men's Wear</Link>
          <Link to="/about" className="text-xs text-neutral-500 hover:text-neutral-900 transition-colors uppercase font-medium">About Brand</Link>
        </div>

        {/* Social Handles */}
        <div className="flex flex-col gap-3">
          <h4 className="text-neutral-900 text-xs font-black tracking-widest uppercase mb-1">Follow Us</h4>
          <a href="#" className="text-xs text-neutral-500 hover:text-neutral-900 transition-colors tracking-wider font-mono font-bold">INSTAGRAM &nearr;</a>
          <a href="#" className="text-xs text-neutral-500 hover:text-neutral-900 transition-colors tracking-wider font-mono font-bold">PINTEREST &nearr;</a>
          <a href="#" className="text-xs text-neutral-500 hover:text-neutral-900 transition-colors tracking-wider font-mono font-bold">TWITTER / X &nearr;</a>
        </div>

        {/* Newsletter Subscription */}
        <div className="flex flex-col gap-3">
          <h4 className="text-neutral-900 text-xs font-black tracking-widest uppercase mb-1">Get the Intel</h4>
          <p className="text-xs text-neutral-500 uppercase tracking-wide font-medium">Subscribe to receive early drops notification and secret discounts.</p>
          
          {!subscribed ? (
            <form onSubmit={handleSubscribe} className="space-y-1">
              <div className="flex mt-2 max-w-sm rounded-xl overflow-hidden border border-neutral-200 bg-white focus-within:border-neutral-400 transition-colors">
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ENTER YOUR EMAIL" 
                  className="bg-transparent text-neutral-800 placeholder-neutral-400 text-[10px] tracking-wider px-4 py-3 w-full outline-hidden"
                />
                <button type="submit" className="bg-neutral-950 text-white font-black text-xs px-5 uppercase hover:bg-neutral-800 transition-colors cursor-pointer">
                  Join
                </button>
              </div>
              {error && (
                <p className="text-[9px] text-red-500 font-mono tracking-widest uppercase pt-1 animate-pulse">
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
      <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-neutral-200/50 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] tracking-widest text-neutral-400 uppercase font-bold">
        <span>&copy; 2026 STREETWEAR CO. ALL RIGHTS RESERVED.</span>
        <div className="flex gap-6">
          <a href="#" className="hover:text-neutral-600 transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-neutral-600 transition-colors">Terms of Service</a>
        </div>
      </div>
    </footer>
  )
}

export default Footer