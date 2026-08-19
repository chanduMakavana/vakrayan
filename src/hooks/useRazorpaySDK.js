import { useEffect } from 'react';

/**
 * Loads the official Razorpay Checkout SDK dynamically and returns a Promise<boolean>.
 */
export function loadRazorpaySDK() {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = typeof document !== 'undefined' ? document.getElementById('razorpay-sdk') : null;
    if (existingScript) {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      existingScript.addEventListener('load', () => resolve(true), { once: true });
      existingScript.addEventListener('error', () => resolve(false), { once: true });
      setTimeout(() => resolve(Boolean(window.Razorpay)), 2500);
      return;
    }

    if (typeof document !== 'undefined') {
      const script = document.createElement('script');
      script.id = 'razorpay-sdk';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => {
        console.warn('⚠️ Razorpay SDK failed to load. Reverting to sandbox simulator fallback.');
        resolve(false);
      };
      document.body.appendChild(script);
    } else {
      resolve(false);
    }
  });
}

/**
 * useRazorpaySDK — Loads the official Razorpay Checkout SDK once on mount.
 */
export function useRazorpaySDK() {
  useEffect(() => {
    loadRazorpaySDK();
  }, []);
}
