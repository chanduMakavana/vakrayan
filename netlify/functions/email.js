const ALLOWED_ORIGINS = [
  'https://vakrayan.com',
  'https://www.vakrayan.com',
  'https://vakrayan.in',
  'https://www.vakrayan.in',
  'https://vakrayan.netlify.app',
  'http://localhost:5173',
  'http://localhost:3000'
];

const escapeHtml = (unsafe) => {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// ── Email Templates ──────────────────────────────────────────────────────────

const getOrderConfirmationHtml = (payload, origin) => {
  const {
    orderNumber = 'N/A',
    orderId = '',
    customerName = 'Valued Customer',
    items = [],
    total = 0,
    paymentMethod = 'Online Payment',
    shippingAddress = ''
  } = payload;

  const orderUrl = orderId ? `${origin}/order/${orderId}` : `${origin}/profile`;

  const itemRows = (items || []).map(item => `
    <tr>
      <td style="padding: 14px 10px; border-bottom: 1px solid #1E2923; color: #FFFFFF; font-size: 14px;">
        <strong>${escapeHtml(item.name || 'Product')}</strong>
        ${item.size ? `<span style="display:block; color:#718096; font-size:12px; margin-top:2px;">Size: ${escapeHtml(item.size)}</span>` : ''}
      </td>
      <td style="padding: 14px 10px; border-bottom: 1px solid #1E2923; color: #A0AEC0; font-size: 14px; text-align: center;">
        x${item.quantity || 1}
      </td>
      <td style="padding: 14px 10px; border-bottom: 1px solid #1E2923; color: #34D399; font-size: 14px; text-align: right; font-weight: 600;">
        ₹${((item.price || 0) * (item.quantity || 1)).toLocaleString('en-IN')}
      </td>
    </tr>
  `).join('');

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Confirmation - Vakrayan</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #0A0F0D; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E2E8F0;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0A0F0D; padding: 40px 10px;">
      <tr>
        <td align="center">
          <table width="100%" max-width="600" style="max-width: 600px; background-color: #0F1714; border: 1px solid #1E2D27; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
            
            <!-- Header / Brand -->
            <tr>
              <td style="padding: 36px 30px 24px; text-align: center; border-bottom: 1px solid #1A2822; background: linear-gradient(180deg, #13221B 0%, #0F1714 100%);">
                <h1 style="margin: 0; font-size: 26px; font-weight: 900; letter-spacing: 4px; color: #FFFFFF; text-transform: uppercase;">
                  VAKRAYAN
                </h1>
                <p style="margin: 6px 0 0; font-size: 11px; letter-spacing: 2px; color: #34D399; text-transform: uppercase; font-weight: 700;">
                  Premium Heavyweight Apparel
                </p>
              </td>
            </tr>

            <!-- Status Banner -->
            <tr>
              <td style="padding: 30px 30px 10px; text-align: center;">
                <div style="display: inline-block; background-color: rgba(52, 211, 153, 0.1); border: 1px solid #059669; color: #34D399; font-size: 12px; font-weight: 800; letter-spacing: 2px; padding: 8px 18px; border-radius: 999px; text-transform: uppercase;">
                  ✓ Order Confirmed
                </div>
                <h2 style="margin: 18px 0 6px; font-size: 22px; font-weight: 800; color: #FFFFFF;">
                  Thank you for your order, ${escapeHtml(customerName)}!
                </h2>
                <p style="margin: 0; font-size: 14px; color: #94A3B8; line-height: 1.5;">
                  We are preparing your fit. Here is your order summary:
                </p>
              </td>
            </tr>

            <!-- Order Meta Grid -->
            <tr>
              <td style="padding: 20px 30px;">
                <table width="100%" style="background-color: #141E1A; border: 1px solid #23352D; border-radius: 12px; padding: 16px;">
                  <tr>
                    <td style="padding: 6px 10px; font-size: 13px; color: #718096;">Order ID:</td>
                    <td style="padding: 6px 10px; font-size: 13px; color: #FFFFFF; font-weight: 700; text-align: right;">#${escapeHtml(orderNumber)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 10px; font-size: 13px; color: #718096;">Payment:</td>
                    <td style="padding: 6px 10px; font-size: 13px; color: #FFFFFF; font-weight: 600; text-align: right;">${escapeHtml(paymentMethod)}</td>
                  </tr>
                  ${shippingAddress ? `
                  <tr>
                    <td style="padding: 6px 10px; font-size: 13px; color: #718096; vertical-align: top;">Deliver To:</td>
                    <td style="padding: 6px 10px; font-size: 13px; color: #CBD5E1; text-align: right;">${escapeHtml(shippingAddress)}</td>
                  </tr>` : ''}
                </table>
              </td>
            </tr>

            <!-- Items Table -->
            <tr>
              <td style="padding: 10px 30px 20px;">
                <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 800; color: #FFFFFF; letter-spacing: 1px; text-transform: uppercase;">
                  Items in your order
                </h3>
                <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                  <thead>
                    <tr style="border-bottom: 2px solid #23352D;">
                      <th style="padding: 8px 10px; text-align: left; font-size: 11px; color: #718096; text-transform: uppercase;">Item</th>
                      <th style="padding: 8px 10px; text-align: center; font-size: 11px; color: #718096; text-transform: uppercase;">Qty</th>
                      <th style="padding: 8px 10px; text-align: right; font-size: 11px; color: #718096; text-transform: uppercase;">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemRows}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colspan="2" style="padding: 18px 10px 8px; font-size: 16px; font-weight: 800; color: #FFFFFF; text-transform: uppercase;">Total Paid:</td>
                      <td style="padding: 18px 10px 8px; font-size: 18px; font-weight: 900; color: #34D399; text-align: right;">₹${Number(total).toLocaleString('en-IN')}</td>
                    </tr>
                  </tfoot>
                </table>
              </td>
            </tr>

            <!-- Call to Action -->
            <tr>
              <td style="padding: 10px 30px 36px; text-align: center;">
                <a href="${orderUrl}" style="display: inline-block; background: #059669; background: linear-gradient(135deg, #059669 0%, #10B981 100%); color: #FFFFFF; text-decoration: none; font-size: 13px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; padding: 14px 32px; border-radius: 10px; box-shadow: 0 10px 20px rgba(5, 150, 105, 0.3);">
                  View / Track Order &rarr;
                </a>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding: 24px 30px; background-color: #0B120F; border-top: 1px solid #1E2D27; text-align: center; color: #64748B; font-size: 12px; line-height: 1.6;">
                <p style="margin: 0 0 6px;">Questions regarding your order? Reach us at <a href="mailto:support@vakrayan.com" style="color: #34D399; text-decoration: none;">support@vakrayan.com</a></p>
                <p style="margin: 0;">&copy; ${new Date().getFullYear()} Vakrayan Premium Apparel. All rights reserved.</p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
};

const getPasswordResetHtml = (payload, origin) => {
  const { resetUrl = '', email = '' } = payload;
  const targetUrl = resetUrl || `${origin}/reset-password`;

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password - Vakrayan</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #0A0F0D; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E2E8F0;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0A0F0D; padding: 40px 10px;">
      <tr>
        <td align="center">
          <table width="100%" max-width="540" style="max-width: 540px; background-color: #0F1714; border: 1px solid #1E2D27; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
            
            <!-- Header -->
            <tr>
              <td style="padding: 36px 30px 24px; text-align: center; border-bottom: 1px solid #1A2822; background: linear-gradient(180deg, #13221B 0%, #0F1714 100%);">
                <h1 style="margin: 0; font-size: 26px; font-weight: 900; letter-spacing: 4px; color: #FFFFFF; text-transform: uppercase;">
                  VAKRAYAN
                </h1>
                <p style="margin: 6px 0 0; font-size: 11px; letter-spacing: 2px; color: #34D399; text-transform: uppercase; font-weight: 700;">
                  Security &amp; Account Recovery
                </p>
              </td>
            </tr>

            <!-- Content -->
            <tr>
              <td style="padding: 36px 30px 20px; text-align: center;">
                <div style="font-size: 40px; margin-bottom: 12px;">🔒</div>
                <h2 style="margin: 0 0 12px; font-size: 22px; font-weight: 800; color: #FFFFFF;">
                  Reset Your Password
                </h2>
                <p style="margin: 0 0 24px; font-size: 14px; color: #94A3B8; line-height: 1.6;">
                  We received a request to reset the password for your Vakrayan account (${escapeHtml(email)}). Click the button below to choose a new password:
                </p>

                <a href="${targetUrl}" style="display: inline-block; background: #059669; background: linear-gradient(135deg, #059669 0%, #10B981 100%); color: #FFFFFF; text-decoration: none; font-size: 13px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; padding: 14px 36px; border-radius: 10px; box-shadow: 0 10px 20px rgba(5, 150, 105, 0.3);">
                  Reset Password &rarr;
                </a>

                <p style="margin: 28px 0 0; font-size: 12px; color: #64748B; line-height: 1.5;">
                  If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
                </p>
              </td>
            </tr>

            <!-- Security Notice -->
            <tr>
              <td style="padding: 16px 30px; background-color: #141E1A; border-top: 1px solid #1E2D27; font-size: 11px; color: #64748B; text-align: center;">
                This reset link is valid for 1 hour. For security reasons, never share this link with anyone.
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding: 20px 30px; background-color: #0B120F; border-top: 1px solid #1E2D27; text-align: center; color: #64748B; font-size: 12px;">
                &copy; ${new Date().getFullYear()} Vakrayan Premium Apparel.
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
};

// ── Main Handler ─────────────────────────────────────────────────────────────

export async function handler(event) {
  const origin = (event.headers && (event.headers.origin || event.headers.Origin)) || '';
  const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin);

  const corsHeaders = {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : 'https://vakrayan.com',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' };
  }

  // Block requests from unauthorized external origins
  if (!isAllowedOrigin && origin) {
    return {
      statusCode: 403,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Forbidden: Origin not allowed.' })
    };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const { type, to, subject, data, htmlContent, textContent } = payload;

    const apiKey = process.env.BREVO_API_KEY || process.env.VITE_BREVO_API_KEY;

    if (!apiKey) {
      console.error('[email.js] Missing BREVO_API_KEY environment variable.');
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Server email service not configured (missing BREVO_API_KEY).' })
      };
    }

    if (!to || (!to.email && typeof to !== 'string')) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Recipient email is required.' })
      };
    }

    const recipientEmail = typeof to === 'string' ? to.trim() : to.email.trim();
    const recipientName = typeof to === 'object' && to.name ? to.name.trim() : recipientEmail.split('@')[0];

    const baseUrl = origin && !origin.includes('localhost') ? origin : 'https://vakrayan.com';

    let emailSubject = subject;
    let finalHtml = htmlContent;

    if (type === 'order_confirmation') {
      emailSubject = emailSubject || `Order Confirmed: #${data?.orderNumber || ''} | Vakrayan`;
      finalHtml = getOrderConfirmationHtml(data || {}, baseUrl);
    } else if (type === 'password_reset') {
      emailSubject = emailSubject || 'Reset Your Password | Vakrayan';
      finalHtml = getPasswordResetHtml(data || { email: recipientEmail }, baseUrl);
    } else if (type === 'campaign' || type === 'general') {
      emailSubject = emailSubject || 'Update from Vakrayan';
      finalHtml = htmlContent || `<div style="font-family:sans-serif;padding:20px;">${escapeHtml(textContent || '')}</div>`;
    }

    if (!finalHtml) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Email content or valid template type is required.' })
      };
    }

    // Call Brevo v3 Transactional Email API
    const brevoPayload = {
      sender: {
        name: 'Vakrayan',
        email: 'noreply@vakrayan.com'
      },
      to: [
        {
          email: recipientEmail,
          name: recipientName
        }
      ],
      subject: emailSubject,
      htmlContent: finalHtml
    };

    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey.trim(),
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(brevoPayload)
    });

    const brevoData = await brevoRes.json();

    if (!brevoRes.ok) {
      console.error('[email.js] Brevo API Error:', brevoData);
      return {
        statusCode: brevoRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: brevoData.message || 'Brevo dispatch failed', details: brevoData })
      };
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, messageId: brevoData.messageId })
    };

  } catch (err) {
    console.error('[email.js] Unexpected Error:', err.message);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message })
    };
  }
}
