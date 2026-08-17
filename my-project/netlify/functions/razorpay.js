/**
 * Razorpay Netlify Function — vakrayan.com
 *
 * Actions:
 *   create_order  → Creates a Razorpay order server-side (required before opening checkout popup)
 *   verify_payment → Verifies HMAC-SHA256 signature after payment completes
 *
 * Environment Variables (set in Netlify Dashboard → Site → Environment Variables):
 *   RAZORPAY_KEY_ID     = rzp_test_XXXXXXXXXX  (or rzp_live_...)
 *   RAZORPAY_KEY_SECRET = your_secret_key
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

export async function handler(event) {
  const origin = (event.headers && (event.headers.origin || event.headers.Origin)) || '';
  const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin);

  const corsHeaders = {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : 'https://vakrayan.com',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Server config error: Razorpay keys not set in environment.' })
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid JSON body.' })
    };
  }

  const { action } = payload;

  // ──────────────────────────────────────────────────
  // ACTION 1: Create a Razorpay Order
  // ──────────────────────────────────────────────────
  if (action === 'create_order') {
    const { amount, currency = 'INR', receipt, notes } = payload;

    if (!amount || isNaN(amount) || Number(amount) < 100) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid amount. Must be >= 100 paise (₹1).' })
      };
    }

    const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');

    try {
      const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify({
          amount: Math.round(Number(amount)),
          currency,
          receipt: receipt || `rcpt_${Date.now()}`,
          notes: notes || {},
          payment_capture: 1
        })
      });

      const data = await rzpResponse.json();

      if (!rzpResponse.ok) {
        return {
          statusCode: rzpResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: data.error?.description || 'Razorpay order creation failed.' })
        };
      }

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, order: data })
      };

    } catch (err) {
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `Network error: ${err.message}` })
      };
    }
  }

  // ──────────────────────────────────────────────────
  // ACTION 2: Verify Payment Signature (HMAC-SHA256)
  // ──────────────────────────────────────────────────
  if (action === 'verify_payment') {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = payload;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing required payment verification fields.' })
      };
    }

    try {
      const crypto = await import('crypto');
      const expectedSig = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      const isValid = expectedSig === razorpay_signature;

      if (!isValid) {
        return {
          statusCode: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Payment signature verification failed. Possible tampering.' })
        };
      }

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, verified: true })
      };

    } catch (err) {
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `Verification error: ${err.message}` })
      };
    }
  }

  return {
    statusCode: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: 'Invalid action. Use "create_order" or "verify_payment".' })
  };
}
