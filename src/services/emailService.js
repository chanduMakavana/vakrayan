/**
 * Client-side email service connecting to Netlify serverless Brevo function.
 * Keeps Brevo API keys completely hidden from client bundle.
 */

export const emailService = {
  /**
   * Dispatch Order Confirmation Email to customer
   * @param {Object} payload - { to, customerName, orderNumber, orderId, items, total, paymentMethod, shippingAddress }
   */
  async sendOrderConfirmation(payload) {
    try {
      const response = await fetch('/.netlify/functions/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'order_confirmation',
          to: {
            email: payload.email || payload.to,
            name: payload.customerName || payload.name || 'Valued Customer'
          },
          data: {
            orderNumber: payload.orderNumber,
            orderId: payload.orderId,
            customerName: payload.customerName,
            items: payload.items || [],
            total: payload.total || 0,
            paymentMethod: payload.paymentMethod || 'Online',
            shippingAddress: payload.shippingAddress || ''
          }
        })
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.warn('⚠️ Order confirmation email dispatch warning:', result.error || response.statusText);
        return { success: false, error: result.error };
      }
      return { success: true, messageId: result.messageId };
    } catch (err) {
      console.warn('⚠️ Failed to dispatch order confirmation email:', err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Dispatch Password Reset Email to user
   * @param {string} email - Recipient email
   * @param {string} resetUrl - Complete password reset link with token
   */
  async sendPasswordResetEmail(email, resetUrl) {
    try {
      const response = await fetch('/.netlify/functions/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'password_reset',
          to: email,
          data: {
            email: email,
            resetUrl: resetUrl
          }
        })
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || 'Failed to send password reset email');
      }
      return { success: true, messageId: result.messageId };
    } catch (err) {
      console.error('Email service :: sendPasswordResetEmail error:', err.message);
      throw err;
    }
  },

  /**
   * Dispatch Admin Campaign / Newsletter Email
   * @param {string} to - Recipient email
   * @param {string} subject - Email Subject
   * @param {string} body - Email Body / HTML
   */
  async sendCampaignEmail(to, subject, body) {
    try {
      const response = await fetch('/.netlify/functions/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'campaign',
          to: to,
          subject: subject,
          htmlContent: `
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="margin:0;padding:0;background:#0A0F0D;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#E2E8F0;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0F0D;padding:30px 10px;">
                <tr><td align="center">
                  <table width="100%" max-width="600" style="max-width:600px;background:#0F1714;border:1px solid #1E2D27;border-radius:14px;overflow:hidden;">
                    <tr>
                      <td style="padding:28px 24px;text-align:center;border-bottom:1px solid #1A2822;background:#13221B;">
                        <h1 style="margin:0;font-size:22px;font-weight:900;letter-spacing:3px;color:#FFFFFF;text-transform:uppercase;">VAKRAYAN</h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:28px 24px;line-height:1.6;font-size:14px;color:#CBD5E1;">
                        ${body.replace(/\n/g, '<br/>')}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:16px 24px;background:#0B120F;border-top:1px solid #1E2D27;text-align:center;color:#64748B;font-size:11px;">
                        &copy; ${new Date().getFullYear()} Vakrayan Premium Apparel &bull; <a href="https://vakrayan.com" style="color:#34D399;text-decoration:none;">vakrayan.com</a>
                      </td>
                    </tr>
                  </table>
                </td></tr>
              </table>
            </body>
            </html>
          `,
          textContent: body
        })
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || 'Failed to dispatch campaign email');
      }
      return { success: true, messageId: result.messageId };
    } catch (err) {
      console.error('Email service :: sendCampaignEmail error:', err.message);
      throw err;
    }
  }
};

export default emailService;
