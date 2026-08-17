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
  const logoUrl = `${origin}/vakrayan-merged-logo.png`;

  const itemRows = (items || []).map(item => `
    <tr>
      <td style="padding: 16px 12px; border-bottom: 1px solid #E2E8F0; color: #0F172A; font-size: 14px;">
        <strong style="color: #0F172A; font-size: 14px;">${escapeHtml(item.name || 'Product')}</strong>
        ${item.size ? `<span style="display:block; color:#64748B; font-size:12px; margin-top:3px; font-weight: 500;">Size: ${escapeHtml(item.size)}</span>` : ''}
      </td>
      <td style="padding: 16px 12px; border-bottom: 1px solid #E2E8F0; color: #475569; font-size: 14px; text-align: center; font-weight: 600;">
        x${item.quantity || 1}
      </td>
      <td style="padding: 16px 12px; border-bottom: 1px solid #E2E8F0; color: #047857; font-size: 15px; text-align: right; font-weight: 700;">
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
    <title>Order Confirmed - Vakrayan</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F172A;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F1F5F9; padding: 40px 12px;">
      <tr>
        <td align="center">
          <table width="100%" style="max-width: 600px; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.06);">
            
            <!-- Brand Header with Merged Logo -->
            <tr>
              <td style="padding: 28px 30px; text-align: center; border-bottom: 1px solid #F1F5F9; background-color: #FAFAFA;">
                <a href="${origin}" style="text-decoration: none; display: inline-block;">
                  <img src="${logoUrl}" alt="Vakrayan" style="max-height: 52px; width: auto; display: block; margin: 0 auto; border: 0;" />
                </a>
              </td>
            </tr>

            <!-- Status Banner -->
            <tr>
              <td style="padding: 32px 32px 12px; text-align: center;">
                <div style="display: inline-block; background-color: #ECFDF5; border: 1px solid #A7F3D0; color: #047857; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; padding: 6px 16px; border-radius: 999px; text-transform: uppercase;">
                  ✓ ORDER CONFIRMED
                </div>
                <h2 style="margin: 18px 0 8px; font-size: 24px; font-weight: 900; color: #0F172A; letter-spacing: -0.5px;">
                  Thank you for your order, ${escapeHtml(customerName)}!
                </h2>
                <p style="margin: 0; font-size: 14px; color: #64748B; line-height: 1.5;">
                  We have received your order and our warehouse is getting it ready for dispatch.
                </p>
              </td>
            </tr>

            <!-- Order Info Summary Box -->
            <tr>
              <td style="padding: 18px 32px;">
                <table width="100%" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px;">
                  <tr>
                    <td style="padding: 5px 8px; font-size: 13px; color: #64748B; font-weight: 500;">Order ID:</td>
                    <td style="padding: 5px 8px; font-size: 13px; color: #0F172A; font-weight: 800; text-align: right; letter-spacing: 0.5px;">#${escapeHtml(orderNumber)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 8px; font-size: 13px; color: #64748B; font-weight: 500;">Payment Method:</td>
                    <td style="padding: 5px 8px; font-size: 13px; color: #0F172A; font-weight: 600; text-align: right;">${escapeHtml(paymentMethod)}</td>
                  </tr>
                  ${shippingAddress ? `
                  <tr>
                    <td style="padding: 5px 8px; font-size: 13px; color: #64748B; font-weight: 500; vertical-align: top;">Shipping To:</td>
                    <td style="padding: 5px 8px; font-size: 13px; color: #334155; text-align: right; line-height: 1.4;">${escapeHtml(shippingAddress)}</td>
                  </tr>` : ''}
                </table>
              </td>
            </tr>

            <!-- Items Table -->
            <tr>
              <td style="padding: 8px 32px 20px;">
                <h3 style="margin: 0 0 12px; font-size: 13px; font-weight: 800; color: #0F172A; letter-spacing: 1px; text-transform: uppercase;">
                  ORDER DETAILS
                </h3>
                <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                  <thead>
                    <tr style="border-bottom: 2px solid #E2E8F0; background-color: #F8FAFC;">
                      <th style="padding: 10px 12px; text-align: left; font-size: 11px; color: #64748B; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Item</th>
                      <th style="padding: 10px 12px; text-align: center; font-size: 11px; color: #64748B; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Qty</th>
                      <th style="padding: 10px 12px; text-align: right; font-size: 11px; color: #64748B; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemRows}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colspan="2" style="padding: 18px 12px 6px; font-size: 15px; font-weight: 800; color: #0F172A; text-transform: uppercase;">Total Paid:</td>
                      <td style="padding: 18px 12px 6px; font-size: 19px; font-weight: 900; color: #047857; text-align: right;">₹${Number(total).toLocaleString('en-IN')}</td>
                    </tr>
                  </tfoot>
                </table>
              </td>
            </tr>

            <!-- Call to Action Button -->
            <tr>
              <td style="padding: 16px 32px 36px; text-align: center;">
                <a href="${orderUrl}" style="display: inline-block; background-color: #059669; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #FFFFFF; text-decoration: none; font-size: 13px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; padding: 14px 34px; border-radius: 10px; box-shadow: 0 6px 16px rgba(5, 150, 105, 0.28);">
                  Track Your Order &rarr;
                </a>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding: 24px 32px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; text-align: center; color: #64748B; font-size: 12px; line-height: 1.6;">
                <p style="margin: 0 0 6px;">Need help? Reach our team at <a href="mailto:support@vakrayan.com" style="color: #059669; text-decoration: none; font-weight: 600;">support@vakrayan.com</a></p>
                <p style="margin: 0; font-size: 11px; color: #94A3B8;">&copy; ${new Date().getFullYear()} Vakrayan Premium Apparel &bull; All rights reserved.</p>
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
  const logoUrl = `${origin}/vakrayan-merged-logo.png`;

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password - Vakrayan</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F172A;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F1F5F9; padding: 40px 12px;">
      <tr>
        <td align="center">
          <table width="100%" style="max-width: 540px; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.06);">
            
            <!-- Header with Merged Logo -->
            <tr>
              <td style="padding: 28px 30px; text-align: center; border-bottom: 1px solid #F1F5F9; background-color: #FAFAFA;">
                <a href="${origin}" style="text-decoration: none; display: inline-block;">
                  <img src="${logoUrl}" alt="Vakrayan" style="max-height: 52px; width: auto; display: block; margin: 0 auto; border: 0;" />
                </a>
              </td>
            </tr>

            <!-- Content -->
            <tr>
              <td style="padding: 36px 32px 24px; text-align: center;">
                <div style="font-size: 44px; margin-bottom: 14px;">🔒</div>
                <h2 style="margin: 0 0 12px; font-size: 22px; font-weight: 900; color: #0F172A;">
                  Reset Your Password
                </h2>
                <p style="margin: 0 0 28px; font-size: 14px; color: #64748B; line-height: 1.6;">
                  We received a password reset request for your account (<strong>${escapeHtml(email)}</strong>). Click the button below to choose a new password:
                </p>

                <a href="${targetUrl}" style="display: inline-block; background-color: #059669; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #FFFFFF; text-decoration: none; font-size: 13px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; padding: 14px 36px; border-radius: 10px; box-shadow: 0 6px 16px rgba(5, 150, 105, 0.28);">
                  Reset Password &rarr;
                </a>

                <p style="margin: 28px 0 0; font-size: 12px; color: #94A3B8; line-height: 1.5;">
                  If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
                </p>
              </td>
            </tr>

            <!-- Security Footer Note -->
            <tr>
              <td style="padding: 16px 32px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; text-align: center; color: #64748B; font-size: 11px;">
                This link will expire in 1 hour for security purposes.
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
