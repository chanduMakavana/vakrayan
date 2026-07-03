import { useEffect } from 'react';

/**
 * useRazorpaySDK — Loads the official Razorpay Checkout SDK once.
 *
 * ✅ FIX: Previously, Razorpay SDK was loaded separately in both Checkout.jsx
 * and UserProfile.jsx via document.createElement('script'), resulting in two
 * script tags being appended if the user visited profile before checkout.
 *
 * This hook is idempotent — safe to call from multiple components. It checks
 * for the script tag by ID before injecting, so the SDK is only loaded once.
 *
 * Usage:
 *   import { useRazorpaySDK } from '../../hooks/useRazorpaySDK';
 *   // Inside your component:
 *   useRazorpaySDK();
 */
export function useRazorpaySDK() {
  useEffect(() => {
    // If already loaded (by another component), skip
    if (document.getElementById('razorpay-sdk')) return;

    const script = document.createElement('script');
    script.id = 'razorpay-sdk';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onerror = () =>
      console.warn('⚠️ Razorpay SDK failed to load. Reverting to sandbox simulator fallback.');
    document.body.appendChild(script);

    // No cleanup needed — Razorpay SDK must persist across navigations.
    // Removing it would break payments initiated after a route change.
  }, []);
}
