/**
 * Razorpay Payment Verification — Cloudflare Worker
 *
 * ✅ SECURITY FIX (Issue #26): Previously, Razorpay payment confirmation was handled
 * entirely client-side in Checkout.jsx L510-513. A malicious user could call
 * processFinalizeOrder() directly from the browser console without paying.
 *
 * HOW TO DEPLOY:
 * 1. Go to Cloudflare Dashboard → Workers & Pages → Create Worker
 * 2. Name it: razorpay-verify
 * 3. Paste this code
 * 4. Add Environment Variable (Secret):
 *    RAZORPAY_KEY_SECRET = your_razorpay_secret_key
 * 5. Copy the Worker URL and add to your .env:
 *    VITE_RAZORPAY_VERIFY_URL=https://razorpay-verify.YOUR_NAME.workers.dev
 *
 * HOW IT WORKS:
 * Your Checkout.jsx calls this worker BEFORE creating the order.
 * If signature is invalid (payment wasn't real), order is NOT created.
 */

const ALLOWED_ORIGINS = [
  'https://vakrayan.com',
  'https://www.vakrayan.com',
  'https://vakrayan.in',
  'https://www.vakrayan.in',
  'https://vakrayan.netlify.app',
  'http://localhost:5173',
  'http://localhost:3000'
];

function getCorsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : 'https://vakrayan.com';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default {
  async fetch(request, env) {
    const corsHeaders = getCorsHeaders(request);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders,
      });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Method Not Allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await request.json();

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Missing required payment verification fields'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      const secret = env.RAZORPAY_KEY_SECRET;
      if (!secret) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Server configuration error: RAZORPAY_KEY_SECRET is not set'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // Compute HMAC-SHA256 of "order_id|payment_id" using Web Crypto API
      const encoder = new TextEncoder();
      const keyData = encoder.encode(secret);
      const messageData = encoder.encode(`${razorpay_order_id}|${razorpay_payment_id}`);

      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);

      // Convert ArrayBuffer to hex string
      const computedSignature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // Convert to Uint8Array for constant-time comparison
      const computedBytes = new TextEncoder().encode(computedSignature);
      const receivedBytes = new TextEncoder().encode(razorpay_signature);

      // Constant-time comparison to prevent timing attacks.
      // Uses XOR of all bytes so execution time does not depend on where bytes differ.
      let mismatch = computedBytes.length !== receivedBytes.length ? 1 : 0;
      const len = Math.max(computedBytes.length, receivedBytes.length);
      for (let i = 0; i < len; i++) {
        mismatch |= (computedBytes[i] ?? 0) ^ (receivedBytes[i] ?? 0);
      }
      const isValid = mismatch === 0;

      if (!isValid) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Payment signature verification failed. Possible payment tampering detected.'
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          },
        });
      }

      return new Response(JSON.stringify({ success: true, verified: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        },
      });

    } catch (err) {
      return new Response(JSON.stringify({ success: false, error: err.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        },
      });
    }
  }
};
