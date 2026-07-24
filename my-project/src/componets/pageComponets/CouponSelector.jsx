import { useState, useEffect } from 'react';
import campaignService from '../../services/campaign';
import couponUsageService from '../../services/couponUsage';
import { useToast } from '../../context/ToastContext';

// Inline Tag Icon matching screenshot design
const TagIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
);

// Standard default first-order & promo coupons fallback
const DEFAULT_COUPONS = [
  {
    code: 'NEW10',
    discount: 10,
    min_order_value: 0,
    description: 'Extra 10% off on your first purchase, on styles up to 40% off.*T&C'
  }
];

export default function CouponSelector({
  cartTotalAmount = 0,
  couponApplied = '',
  discountPercent = 0,
  onApplyCoupon,
  onRemoveCoupon,
  user = null,
}) {
  const { showToast } = useToast();
  const [promoInput, setPromoInput] = useState('');
  const [couponsList, setCouponsList] = useState(DEFAULT_COUPONS);
  const [loadingCoupons, setLoadingCoupons] = useState(false);

  // Fetch dynamic coupons from DB and merge with defaults
  useEffect(() => {
    let isMounted = true;
    setLoadingCoupons(true);
    campaignService.getCoupons()
      .then((dbCoupons) => {
        if (!isMounted) return;
        if (Array.isArray(dbCoupons) && dbCoupons.length > 0) {
          const merged = [...dbCoupons];
          // Ensure default first-order coupons exist if not in DB
          DEFAULT_COUPONS.forEach((def) => {
            if (!merged.some(c => String(c.code).toUpperCase() === def.code.toUpperCase())) {
              merged.push(def);
            }
          });
          setCouponsList(merged);
        } else {
          setCouponsList(DEFAULT_COUPONS);
        }
      })
      .catch(() => {
        if (isMounted) setCouponsList(DEFAULT_COUPONS);
      })
      .finally(() => {
        if (isMounted) setLoadingCoupons(false);
      });

    return () => { isMounted = false; };
  }, []);

  // Handle single coupon validation and application
  const applyCouponCode = async (targetCode) => {
    const cleanCode = String(targetCode || '').trim().toUpperCase();
    if (!cleanCode) return;

    try {
      const match = couponsList.find(c => String(c.code || '').trim().toUpperCase() === cleanCode);
      
      if (!match) {
        showToast(`Invalid coupon code: "${cleanCode}"`, 'error');
        return;
      }

      if (match.isExpired) {
        showToast(`Coupon ${match.code} has expired.`, 'error');
        return;
      }

      // Check min order value requirement
      let minOrder = Number(match.min_order_value || 0);
      if (match.coupon_usage) {
        try {
          const parsed = JSON.parse(match.coupon_usage);
          if (parsed && typeof parsed === 'object' && 'min_order_value' in parsed) {
            minOrder = Number(parsed.min_order_value);
          }
        } catch {
          // ignore
        }
      }

      if (cartTotalAmount > 0 && cartTotalAmount < minOrder) {
        showToast(`Coupon ${match.code} requires a minimum order value of ₹${minOrder}.`, 'error');
        return;
      }

      // Check single usage limit for logged-in user
      if (user && user.$id) {
        const alreadyUsed = await couponUsageService.checkCouponUsage(user.$id, match.code);
        if (alreadyUsed) {
          showToast(`Coupon ${match.code} has already been redeemed. Limit: 1 use per customer.`, 'error');
          return;
        }
      }

      // Apply coupon
      const disc = Number(match.discount || 10);
      onApplyCoupon(match.code, disc, minOrder);
      setPromoInput('');
      showToast(`Coupon "${match.code}" applied! You saved ${disc}%.`, 'success');
    } catch (err) {
      console.error('Coupon application failed:', err);
      showToast('Failed to apply coupon. Please try again.', 'error');
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (promoInput.trim()) {
      applyCouponCode(promoInput.trim());
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Input Box matching screenshot */}
      <form onSubmit={handleManualSubmit} className="flex gap-2">
        <input
          type="text"
          value={promoInput}
          onChange={(e) => setPromoInput(e.target.value)}
          placeholder="Discount code or gift card"
          className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-accent)] rounded-xl px-4 py-3 text-xs text-[var(--color-text)] placeholder-[var(--color-muted)] outline-hidden transition-all shadow-2xs"
        />
        <button
          type="submit"
          disabled={!promoInput.trim()}
          className="bg-[var(--color-subtle)] hover:bg-[var(--color-border)]/40 disabled:opacity-50 text-[var(--color-text)] font-black text-xs px-5 py-3 rounded-xl transition-all cursor-pointer shrink-0 border border-[var(--color-border)]"
        >
          Apply
        </button>
      </form>

      {/* Active applied banner */}
      {couponApplied && (
        <div className="flex items-center justify-between gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Coupon <strong className="font-black uppercase">{couponApplied}</strong> active ({discountPercent}% OFF)</span>
          </div>
          <button
            type="button"
            onClick={onRemoveCoupon}
            className="text-rose-600 hover:text-rose-800 text-[11px] font-black uppercase cursor-pointer transition-colors"
          >
            ✕ Remove
          </button>
        </div>
      )}

      {/* 2. Available Coupons List matching exact screenshot design */}
      <div className="space-y-2">
        <p className="text-[11px] font-bold text-[var(--color-muted)] uppercase tracking-wider">
          Available Coupons & Offers
        </p>

        <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
          {couponsList.map((coupon) => {
            const isCurrent = couponApplied && couponApplied.toUpperCase() === String(coupon.code).toUpperCase();
            const minOrder = Number(coupon.min_order_value || 0);
            const isEligible = cartTotalAmount >= minOrder;

            return (
              <div
                key={coupon.code}
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                  isCurrent
                    ? 'border-emerald-500 bg-emerald-50/40 shadow-xs'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)]'
                }`}
              >
                {/* Left: Tag Icon + Code & Description */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200/80 flex items-center justify-center shrink-0 mt-0.5">
                    <TagIcon />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-[var(--color-text)] uppercase tracking-wider font-mono">
                        {coupon.code}
                      </h4>
                      <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full uppercase">
                        {coupon.discount}% OFF
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--color-muted)] leading-snug line-clamp-2">
                      {coupon.description || `Get ${coupon.discount}% off on your purchase.`}
                    </p>
                    {minOrder > 0 && !isEligible && (
                      <p className="text-[10px] text-amber-600 font-medium">
                        Min. order: ₹{minOrder} (Add ₹{minOrder - cartTotalAmount} more)
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Apply / Applied Black Button matching screenshot */}
                <div>
                  {isCurrent ? (
                    <button
                      type="button"
                      onClick={onRemoveCoupon}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer shrink-0"
                    >
                      Applied ✓
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => applyCouponCode(coupon.code)}
                      className="bg-black hover:bg-zinc-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer shrink-0"
                    >
                      Apply
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
