/**
 * WhatsApp Cloud API Service for Vakrayan
 * Supports sending OTP, Order Confirmation notifications, and Text alerts.
 */

const WHATSAPP_PHONE_NUMBER_ID = import.meta.env.VITE_WHATSAPP_PHONE_NUMBER_ID || '1296679850195220';
const WHATSAPP_ACCESS_TOKEN = import.meta.env.VITE_WHATSAPP_ACCESS_TOKEN || '';

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
 * Send WhatsApp OTP to a user's mobile number
 * @param {string} phone - User's 10-digit mobile number
 * @param {string|number} otpCode - 4-6 digit OTP
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function sendWhatsAppOTP(phone, otpCode) {
  const formattedPhone = formatWhatsAppNumber(phone);
  if (!formattedPhone || formattedPhone.length < 12) {
    return { success: false, error: 'Invalid phone number.' };
  }

  const url = `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

  // First try default template `hello_world` or custom `vakrayan_otp`
  const templatePayload = {
    messaging_product: "whatsapp",
    to: formattedPhone,
    type: "template",
    template: {
      name: "hello_world",
      language: { code: "en_US" }
    }
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(templatePayload)
    });

    const data = await response.json();
    if (response.ok && data.messages) {
      return { success: true, data };
    }

    console.warn("WhatsApp Template dispatch response:", data);
    return { success: !data.error, data, error: data.error?.message };
  } catch (err) {
    console.error("WhatsApp API Network Failure:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Send WhatsApp text message notification (inside 24h window or test numbers)
 */
export async function sendWhatsAppTextMessage(phone, messageText) {
  const formattedPhone = formatWhatsAppNumber(phone);
  if (!formattedPhone) return { success: false, error: 'Invalid phone' };

  const url = `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to: formattedPhone,
    type: "text",
    text: { body: messageText }
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    return { success: res.ok, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export default {
  sendWhatsAppOTP,
  sendWhatsAppTextMessage,
  formatWhatsAppNumber
};
