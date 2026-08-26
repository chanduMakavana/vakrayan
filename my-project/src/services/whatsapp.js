/**
 * WhatsApp Cloud API Service for Vakrayan
 * Supports sending Order Confirmation, Order Tracking / Shipped, and OTP notifications.
 */

const WHATSAPP_PHONE_NUMBER_ID = import.meta.env.VITE_WHATSAPP_PHONE_NUMBER_ID || '1403690629486187';
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
 * Low-level dispatch to WhatsApp API (uses Netlify serverless with direct Graph API fallback)
 */
async function dispatchWhatsAppRequest(payload) {
  // 1. Try Netlify Serverless Function
  try {
    const res = await fetch('/.netlify/functions/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: true, data };
    }
  } catch {
    // Fall back to direct Graph API
  }

  // 2. Direct Graph API Fallback
  if (!WHATSAPP_ACCESS_TOKEN) {
    return { success: false, error: 'Missing WhatsApp Access Token' };
  }

  try {
    const url = `https://graph.facebook.com/v22.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
    let requestPayload;

    if (payload.action === 'template' && payload.templateName) {
      requestPayload = {
        messaging_product: 'whatsapp',
        to: payload.phone,
        type: 'template',
        template: {
          name: payload.templateName,
          language: { code: payload.languageCode || 'en_US' },
          ...(payload.components ? { components: payload.components } : {})
        }
      };
    } else {
      requestPayload = {
        messaging_product: 'whatsapp',
        to: payload.phone,
        type: 'text',
        text: { body: payload.messageText || '' }
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestPayload)
    });

    const data = await response.json().catch(() => ({}));
    return { success: response.ok, data, error: data.error?.message };
  } catch (err) {
    console.error('WhatsApp API direct request error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send WhatsApp OTP to customer
 */
export async function sendWhatsAppOTP(phone, otpCode) {
  const formattedPhone = formatWhatsAppNumber(phone);
  if (!formattedPhone || formattedPhone.length < 12) {
    return { success: false, error: 'Invalid phone number.' };
  }

  const currentTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const messageText = `🔐 *VAKRAYAN VERIFICATION CODE*\n\n` +
    `Your OTP is: *${otpCode}*\n\n` +
    `⏱️ *Time:* ${currentTime}\n` +
    `⏳ *Validity:* 10 Minutes\n\n` +
    `_Please enter this code on checkout to confirm your order._\n\n` +
    `*VAKRAYAN // Premium Apparel* ✨`;

  return await dispatchWhatsAppRequest({
    action: 'text',
    phone: formattedPhone,
    messageText,
    otpCode
  });
}

/**
 * Send WhatsApp Order Confirmation notification to customer
 */
export async function sendWhatsAppOrderConfirmation(payload) {
  if (!payload || !payload.phone) return { success: false, error: 'Missing phone' };
  const formattedPhone = formatWhatsAppNumber(payload.phone);
  if (!formattedPhone) return { success: false, error: 'Invalid phone' };

  const rawItems = Array.isArray(payload.items) ? payload.items : [];
  const itemsText = rawItems.length > 0
    ? rawItems.map(i => `• *${i.name || 'Product'}* (Size: ${i.size || 'M'}) x${i.quantity || 1} — ₹${i.price || 0}`).join('\n')
    : '• 1x Vakrayan Apparel Item';

  const orderNum = payload.orderNumber || payload.orderId || 'NEW';
  const totalAmount = Math.round(Number(payload.total) || 0);
  const paymentMethod = payload.paymentMethod ? String(payload.paymentMethod).toUpperCase() : 'ONLINE';
  const customerName = payload.customerName ? payload.customerName.trim() : 'Customer';

  const messageText = `🛍️ *VAKRAYAN — ORDER CONFIRMED!* 🛍️\n\n` +
    `Hi *${customerName}*,\n` +
    `Thank you for shopping with Vakrayan! Your order has been placed successfully.\n\n` +
    `📋 *Order Summary:*\n` +
    `• *Order ID:* #${orderNum}\n` +
    `• *Total Amount:* ₹${totalAmount}\n` +
    `• *Payment Method:* ${paymentMethod}\n\n` +
    `📦 *Items Ordered:*\n${itemsText}\n\n` +
    `🚚 *Shipping Address:*\n${payload.shippingAddress || 'Your delivery address'}\n\n` +
    `🔗 *Live Order Tracking:*\nhttps://vakrayan.com/order/${payload.orderId || ''}\n\n` +
    `_Thank you for choosing Vakrayan Premium Apparel!_ ✨`;

  return await dispatchWhatsAppRequest({
    action: 'text',
    phone: formattedPhone,
    messageText
  });
}

/**
 * Send WhatsApp Order Shipped / In-Transit tracking update
 */
export async function sendWhatsAppOrderShipped(payload) {
  if (!payload || !payload.phone) return { success: false, error: 'Missing phone' };
  const formattedPhone = formatWhatsAppNumber(payload.phone);
  if (!formattedPhone) return { success: false, error: 'Invalid phone' };

  const orderNum = payload.orderNumber || payload.orderId || '';
  const courierName = payload.courierName || 'Shiprocket / Delhivery';
  const trackingNumber = payload.trackingNumber || payload.awbCode || 'N/A';
  const trackingUrl = payload.trackingUrl || `https://vakrayan.com/order/${payload.orderId}`;
  const customerName = payload.customerName ? payload.customerName.trim() : 'Customer';

  const messageText = `🚚 *YOUR VAKRAYAN ORDER HAS SHIPPED!* 📦\n\n` +
    `Hi *${customerName}*,\n` +
    `Great news! Your order *#${orderNum}* has been dispatched and is on its way to you.\n\n` +
    `🚀 *Shipping Details:*\n` +
    `• *Courier Partner:* ${courierName}\n` +
    `• *Tracking / AWB:* \`${trackingNumber}\`\n\n` +
    `🔗 *Live Tracking Link:*\n${trackingUrl}\n\n` +
    `_VAKRAYAN // Premium Apparel_`;

  return await dispatchWhatsAppRequest({
    action: 'text',
    phone: formattedPhone,
    messageText
  });
}

/**
 * Generic text message sender
 */
export async function sendWhatsAppTextMessage(phone, messageText) {
  const formattedPhone = formatWhatsAppNumber(phone);
  if (!formattedPhone) return { success: false, error: 'Invalid phone' };

  return await dispatchWhatsAppRequest({
    action: 'text',
    phone: formattedPhone,
    messageText
  });
}

export default {
  sendWhatsAppOTP,
  sendWhatsAppOrderConfirmation,
  sendWhatsAppOrderShipped,
  sendWhatsAppTextMessage,
  formatWhatsAppNumber
};
