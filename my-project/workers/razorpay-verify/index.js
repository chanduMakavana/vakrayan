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

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Method Not Allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await request.json();

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return new Response(JSON.stringify({ success: false, error: 'Missing payment fields' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Recreate the expected signature using HMAC-SHA256
      const message = `${razorpay_order_id}|${razorpay_payment_id}`;
      const encoder = new TextEncoder();
      const keyData = encoder.encode(env.RAZORPAY_KEY_SECRET);
      const messageData = encoder.encode(message);

      // Import key for HMAC
      const cryptoKey = await crypto.subtle.importKey(
        'raw', keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false, ['sign']
      );

      // Sign the message
      const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);

      // Convert to hex string
      const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // Compare signatures
      const isValid = expectedSignature === razorpay_signature;

      if (!isValid) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Payment signature verification failed. Possible payment tampering detected.'
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      return new Response(JSON.stringify({ success: true, verified: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });

    } catch (err) {
      return new Response(JSON.stringify({ success: false, error: err.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  }
};
