/**
 * WhatsApp Cloud API Service for Vakrayan
 * Supports sending OTP, Order Confirmation notifications, and Text alerts.
 */

/**
 * Format Indian 10-digit mobile number to international format (91XXXXXXXXXX)
 */
export function formatWhatsAppNumber(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.startsWith('91') && digits.length === 12) return digits;
  if (digits.startsWith('0') && digits.length === 11) return `91${digits.slice(1)}`;
  return digits;
}

/**
 * Send WhatsApp OTP to a user's mobile number via Netlify serverless function
 * @param {string} phone - User's 10-digit mobile number
 * @param {string|number} otpCode - 4-6 digit OTP
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function sendWhatsAppOTP(phone, otpCode) {
  const formattedPhone = formatWhatsAppNumber(phone);
  if (!formattedPhone || formattedPhone.length < 12) {
    return { success: false, error: 'Invalid phone number.' };
  }

  try {
    const response = await fetch('/.netlify/functions/whatsapp', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "otp",
        phone: formattedPhone,
        otpCode
      })
    });

    const data = await response.json().catch(() => ({}));
    if (response.ok && data.messages) {
      return { success: true, data };
    }

    return { success: response.ok, data, error: data.error };
  } catch (err) {
    console.error("WhatsApp Service Network Failure:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Send WhatsApp text message notification via Netlify serverless function
 */
export async function sendWhatsAppTextMessage(phone, messageText) {
  const formattedPhone = formatWhatsAppNumber(phone);
  if (!formattedPhone) return { success: false, error: 'Invalid phone' };

  try {
    const res = await fetch('/.netlify/functions/whatsapp', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "text",
        phone: formattedPhone,
        messageText
      })
    });
    const data = await res.json().catch(() => ({}));
    return { success: res.ok, data, error: data.error };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export default {
  sendWhatsAppOTP,
  sendWhatsAppTextMessage,
  formatWhatsAppNumber
};
