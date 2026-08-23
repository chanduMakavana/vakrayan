/**
 * Centralized utility helper to dispatch notifications to Discord Webhook and Telegram Bot.
 * Supports auto-formatting and channel routing based on event types.
 */
const escapeHtml = (unsafe) => {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
};

export const sendWebhookNotification = async (event, payload) => {
  // 1. Resolve Discord target Webhook URL
  const getDiscordUrl = (evt) => {
    const orderUrl = import.meta.env.VITE_ORDER_WEBHOOK_URL;
    const eventUrl = import.meta.env.VITE_EVENT_WEBHOOK_URL;
    const cancelUrl = import.meta.env.VITE_CANCEL_WEBHOOK_URL;
    
    if (evt === 'order.cancelled') {
      return (cancelUrl && cancelUrl.trim()) || (orderUrl && orderUrl.trim()) || (eventUrl && eventUrl.trim());
    }
    if (evt === 'order.created') {
      return (orderUrl && orderUrl.trim()) || (eventUrl && eventUrl.trim());
    }
    return (eventUrl && eventUrl.trim()) || (orderUrl && orderUrl.trim());
  };

  const webhookUrl = getDiscordUrl(event);
  if (webhookUrl) {
    try {
      let bodyPayload = {
        event,
        timestamp: new Date().toISOString(),
        ...payload
      };

      if (webhookUrl.includes('discord.com/api/webhooks')) {
        let content = '';
        if (event === 'order.created') {
          const itemsList = (payload.items || []).map(i => `• ${i.name} (Size: ${i.size}) x${i.quantity} @ ₹${i.price}`).join('\n');
          content = `🚨 **NEW VAKRAYAN ORDER RECEIVED!** 🚨\n\n` +
                   `**Order Number:** \`${payload.orderNumber}\`\n` +
                   `**Customer Name:** ${payload.customerName}\n` +
                   `**Email:** ${payload.email}\n` +
                   `**Phone:** ${payload.phone}\n` +
                   `**Payment Method:** ${payload.paymentMethod}\n` +
                   `**Total Amount:** ₹${payload.total}\n` +
                   `**Shipping Address:** ${payload.shippingAddress}\n\n` +
                   `**Items Ordered:**\n${itemsList}`;
        } else if (event === 'order.reactivated') {
          const itemsList = (payload.items || []).map(i => `• ${i.name} (Size: ${i.size}) x${i.quantity} @ ₹${i.price}`).join('\n');
          content = `🔄 **VAKRAYAN ORDER REACTIVATED / RESTORED!** 🔄\n\n` +
                   `**Order Number:** \`${payload.orderNumber}\`\n` +
                   `**Customer Name:** ${payload.customerName}\n` +
                   `**Email:** ${payload.email}\n` +
                   `**Payment Method:** ${payload.paymentMethod}\n` +
                   `**Total Amount:** ₹${payload.total}\n` +
                   `**Note:** Reactivated by customer within 24h (Cancellation Locked)\n\n` +
                   `**Items in Reactivated Order:**\n${itemsList}`;
        } else if (event === 'order.cancelled') {
          const itemsList = (payload.items || []).map(i => `• ${i.name} (Size: ${i.size}) x${i.quantity}`).join('\n');
          content = `🚫 **VAKRAYAN ORDER CANCELLED BY CUSTOMER** 🚫\n\n` +
                   `**Order Number:** \`${payload.orderNumber}\`\n` +
                   `**Customer Name:** ${payload.customerName}\n` +
                   `**Email:** ${payload.email}\n` +
                   `**Total Refund Amount:** ₹${payload.total}\n` +
                   `**Reason for Cancellation:** *${payload.reason}*\n\n` +
                   `**Items in Cancelled Order:**\n${itemsList}`;
        } else if (event === 'user.signup') {
          content = `👤 **NEW USER REGISTERED!** 👤\n\n` +
                   `**Name:** ${payload.name}\n` +
                   `**Email:** ${payload.email}\n` +
                   `**User ID:** \`${payload.userId}\``;
        } else if (event === 'newsletter.subscribe') {
          content = `📧 **NEW NEWSLETTER SUBSCRIPTION!** 📧\n\n` +
                   `**Email Address:** ${payload.email}`;
        } else if (event === 'restock.requested') {
          content = `🔄 **RESTOCK NOTIFICATION REQUESTED!** 🔄\n\n` +
                   `**Product:** ${payload.productName} (ID: \`${payload.productId}\`)\n` +
                   `**Size Requested:** \`${payload.size}\`\n` +
                   `**Email:** ${payload.email}`;
        } else if (event === 'return.requested') {
          content = `📦 **RETURN/EXCHANGE REQUESTED!** 📦\n\n` +
                   `**Order Number:** \`${payload.orderNumber}\`\n` +
                   `**Type:** ${payload.type} (Return or Exchange)\n` +
                   `**Reason:** ${payload.reason}\n` +
                   `**Customer Email:** ${payload.email}`;
        } else {
          content = `🔔 **WEBSITE EVENT: ${event.toUpperCase()}** 🔔\n\n` +
                   `Details:\n${JSON.stringify(payload, null, 2)}`;
        }
        bodyPayload = { content };
      }

      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      }).catch(() => {});
    } catch {
      // Silently catch dispatcher errors
    }
  }

  // 2. Send Telegram notification via server-side Netlify function
  // Bot token and chat IDs are stored as server-side env vars (no VITE_ prefix)
  // and are NOT available in the client-side bundle.
  try {
    let text = '';
    if (event === 'order.created') {
      const itemsList = (payload.items || []).map(i => `• ${escapeHtml(i.name)} (Size: ${escapeHtml(i.size)}) x${i.quantity} @ ₹${i.price}`).join('\n');
      text = `<b>🚨 NEW VAKRAYAN ORDER RECEIVED! 🚨</b>\n\n` +
             `<b>Order Number:</b> <code>${escapeHtml(payload.orderNumber)}</code>\n` +
             `<b>Customer Name:</b> ${escapeHtml(payload.customerName)}\n` +
             `<b>Email:</b> ${escapeHtml(payload.email)}\n` +
             `<b>Phone:</b> ${escapeHtml(payload.phone)}\n` +
             `<b>Payment Method:</b> ${escapeHtml(payload.paymentMethod)}\n` +
             `<b>Total Amount:</b> ₹${payload.total}\n` +
             `<b>Shipping Address:</b> ${escapeHtml(payload.shippingAddress)}\n\n` +
             `<b>Items Ordered:</b>\n${itemsList}`;
    } else if (event === 'order.reactivated') {
      const itemsList = (payload.items || []).map(i => `• ${escapeHtml(i.name)} (Size: ${escapeHtml(i.size)}) x${i.quantity} @ ₹${i.price}`).join('\n');
      text = `<b>🔄 VAKRAYAN ORDER REACTIVATED / RESTORED! 🔄</b>\n\n` +
             `<b>Order Number:</b> <code>${escapeHtml(payload.orderNumber)}</code>\n` +
             `<b>Customer Name:</b> ${escapeHtml(payload.customerName)}\n` +
             `<b>Email:</b> ${escapeHtml(payload.email)}\n` +
             `<b>Payment Method:</b> ${escapeHtml(payload.paymentMethod)}\n` +
             `<b>Total Amount:</b> ₹${payload.total}\n` +
             `<b>Note:</b> Reactivated by customer within 24h (Cancellation Locked)\n\n` +
             `<b>Items in Reactivated Order:</b>\n${itemsList}`;
    } else if (event === 'order.cancelled') {
      const itemsList = (payload.items || []).map(i => `• ${escapeHtml(i.name)} (Size: ${escapeHtml(i.size)}) x${i.quantity}`).join('\n');
      text = `<b>🚫 VAKRAYAN ORDER CANCELLED BY CUSTOMER 🚫</b>\n\n` +
             `<b>Order Number:</b> <code>${escapeHtml(payload.orderNumber)}</code>\n` +
             `<b>Customer Name:</b> ${escapeHtml(payload.customerName)}\n` +
             `<b>Email:</b> ${escapeHtml(payload.email)}\n` +
             `<b>Total Refund Amount:</b> ₹${payload.total}\n` +
             `<b>Reason for Cancellation:</b> <i>${escapeHtml(payload.reason)}</i>\n\n` +
             `<b>Items in Cancelled Order:</b>\n${itemsList}`;
    } else if (event === 'user.signup') {
      text = `<b>👤 NEW USER REGISTERED! 👤</b>\n\n` +
             `<b>Name:</b> ${escapeHtml(payload.name)}\n` +
             `<b>Email:</b> ${escapeHtml(payload.email)}\n` +
             `<b>User ID:</b> <code>${escapeHtml(payload.userId)}</code>`;
    } else if (event === 'newsletter.subscribe') {
      text = `<b>📧 NEW NEWSLETTER SUBSCRIPTION! 📧</b>\n\n` +
             `<b>Email Address:</b> ${escapeHtml(payload.email)}`;
    } else if (event === 'restock.requested') {
      text = `<b>🔄 RESTOCK NOTIFICATION REQUESTED! 🔄</b>\n\n` +
             `<b>Product:</b> ${escapeHtml(payload.productName)} (ID: <code>${escapeHtml(payload.productId)}</code>)\n` +
             `<b>Size Requested:</b> <code>${escapeHtml(payload.size)}</code>\n` +
             `<b>Email:</b> ${escapeHtml(payload.email)}`;
    } else if (event === 'return.requested') {
      text = `<b>📦 RETURN/EXCHANGE REQUESTED! 📦</b>\n\n` +
             `<b>Order Number:</b> <code>${escapeHtml(payload.orderNumber)}</code>\n` +
             `<b>Type:</b> ${escapeHtml(payload.type)} (Return or Exchange)\n` +
             `<b>Reason:</b> ${escapeHtml(payload.reason)}\n` +
             `<b>Customer Email:</b> ${escapeHtml(payload.email)}`;
    } else if (event === 'system.error') {
      text = `<b>🚨 CRITICAL WEBSITE ERROR CAUGHT! 🚨</b>\n\n` +
             `<b>Error Message:</b> <code>${escapeHtml(payload.errorMessage)}</code>\n` +
             `<b>Location URL:</b> ${escapeHtml(payload.url)}\n` +
             `<b>User Agent:</b> <i>${escapeHtml(payload.userAgent)}</i>\n\n` +
             `<b>Component Stack Trace:</b>\n<pre>${escapeHtml((payload.stack || '').substring(0, 1500))}</pre>`;
    } else {
      text = `<b>🔔 WEBSITE EVENT: ${event.toUpperCase()} 🔔</b>\n\n` +
             `<pre>${escapeHtml(JSON.stringify(payload, null, 2))}</pre>`;
    }

    // Build inline keyboard for Telegram
    let replyMarkup = null;
    let baseUrl = 'https://vakrayan.com';
    if (typeof window !== 'undefined' && window.location) {
      const origin = window.location.origin;
      if (!origin.includes('localhost') && !origin.includes('127.0.0.1')) {
        baseUrl = origin;
      }
    }
    const inlineKeyboard = [];
    if ((event === 'order.created' || event === 'order.reactivated' || event === 'return.requested' || event === 'order.cancelled') && payload.orderId) {
      inlineKeyboard.push([
        { text: '👁️ View Order', url: `${baseUrl}/order/${payload.orderId}` },
        { text: '⚙️ Manage in Admin', url: `${baseUrl}/admin` }
      ]);
    } else if (event === 'restock.requested' && payload.productId) {
      inlineKeyboard.push([{ text: '🛍️ View Product', url: `${baseUrl}/product/${payload.productId}` }]);
    }
    if (inlineKeyboard.length > 0) replyMarkup = { inline_keyboard: inlineKeyboard };

    // Route the event type to the correct Telegram channel
    const channelRoute = event === 'order.cancelled' ? 'cancel'
                       : event === 'order.created' ? 'order'
                       : 'event';

    // Send via Netlify serverless function only.
    // Bot token and chat IDs are stored as server-side environment variables.
    // There is no client-side fallback — the bot token must NEVER be in the JS bundle.
    try {
      await fetch('/.netlify/functions/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, parseMode: 'HTML', replyMarkup, channelRoute })
      });
    } catch {
      // Silently catch — notification delivery failure is non-critical
    }
  } catch {
    // Silently catch dispatcher errors
  }

  // 3. Send Customer Email via Brevo Serverless Netlify Function
  if (event === 'order.created' && payload && payload.email) {
    try {
      fetch('/.netlify/functions/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'order_confirmation',
          to: {
            email: payload.email,
            name: payload.customerName || 'Valued Customer'
          },
          data: {
            orderNumber: payload.orderNumber,
            orderId: payload.orderId,
            customerName: payload.customerName,
            items: payload.items || [],
            total: payload.total || 0,
            paymentMethod: payload.paymentMethod || 'Online Payment',
            shippingAddress: payload.shippingAddress || ''
          }
        })
      }).catch((emailErr) => {
        console.warn('⚠️ Order confirmation email dispatch failed:', emailErr.message);
      });
    } catch {
      // Non-blocking
    }
  }
};

