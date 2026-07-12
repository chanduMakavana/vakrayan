/**
 * Centralized utility helper to dispatch notifications to Discord Webhook and Telegram Bot.
 * Supports auto-formatting and channel routing based on event types.
 */
const escapeHtml = (unsafe) => {
  if (!unsafe) return '';
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
    } catch (err) {
      // Silently catch dispatcher errors
    }
  }

  // 2. Resolve Telegram Bot settings
  const telegramToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
  const getTelegramChatId = (evt) => {
    const orderChatId = import.meta.env.VITE_TELEGRAM_ORDER_CHAT_ID || import.meta.env.VITE_TELEGRAM_CHAT_ID_ORDERS;
    const eventChatId = import.meta.env.VITE_TELEGRAM_EVENT_CHAT_ID || import.meta.env.VITE_TELEGRAM_CHAT_ID_EVENTS;
    const cancelChatId = import.meta.env.VITE_TELEGRAM_CANCEL_CHAT_ID || import.meta.env.VITE_TELEGRAM_CHAT_ID_CANCEL;
    const defaultChatId = import.meta.env.VITE_TELEGRAM_CHAT_ID;
    
    if (evt === 'order.cancelled') {
      return (cancelChatId && cancelChatId.trim()) || (orderChatId && orderChatId.trim()) || (defaultChatId && defaultChatId.trim()) || (eventChatId && eventChatId.trim());
    }
    if (evt === 'order.created') {
      return (orderChatId && orderChatId.trim()) || (defaultChatId && defaultChatId.trim()) || (eventChatId && eventChatId.trim());
    }
    return (eventChatId && eventChatId.trim()) || (defaultChatId && defaultChatId.trim()) || (orderChatId && orderChatId.trim());
  };

  const telegramChatId = getTelegramChatId(event);
  if (!telegramToken || !telegramToken.trim() || !telegramChatId) {
    // Silently skip if misconfigured

  } else {
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
               `<b>Component Stack Trace:</b>\n<pre>${escapeHtml(payload.stack.substring(0, 1500))}</pre>`;
      } else {
        text = `<b>🔔 WEBSITE EVENT: ${event.toUpperCase()} 🔔</b>\n\n` +
               `<pre>${escapeHtml(JSON.stringify(payload, null, 2))}</pre>`;
      }

      const getTelegramReplyMarkup = (evt, pld) => {
        let baseUrl = 'https://vakrayan.in'; // Default to production domain so links work on mobile and satisfy Telegram's URL validation
        
        if (typeof window !== 'undefined' && window.location) {
          const origin = window.location.origin;
          // Use current origin only if it's a public domain (not localhost / local IP)
          if (!origin.includes('localhost') && !origin.includes('127.0.0.1')) {
            baseUrl = origin;
          }
        }

        const inlineKeyboard = [];

        if (evt === 'order.created' && pld.orderId) {
          inlineKeyboard.push([
            { text: '👁️ View Order', url: `${baseUrl}/order/${pld.orderId}` },
            { text: '⚙️ Manage in Admin', url: `${baseUrl}/admin` }
          ]);
        } else if (evt === 'return.requested' && pld.orderId) {
          inlineKeyboard.push([
            { text: '👁️ View Order Info', url: `${baseUrl}/order/${pld.orderId}` },
            { text: '⚙️ Manage in Admin', url: `${baseUrl}/admin` }
          ]);
        } else if (evt === 'restock.requested' && pld.productId) {
          inlineKeyboard.push([
            { text: '🛍️ View Product', url: `${baseUrl}/product/${pld.productId}` }
          ]);
        } else if (evt === 'order.cancelled' && pld.orderId) {
          inlineKeyboard.push([
            { text: '👁️ View Order Details', url: `${baseUrl}/order/${pld.orderId}` }
          ]);
        }

        return inlineKeyboard.length > 0 ? { inline_keyboard: inlineKeyboard } : null;
      };

      const telegramUrl = `https://api.telegram.org/bot${telegramToken.trim()}/sendMessage`;
      const replyMarkup = getTelegramReplyMarkup(event, payload);
      
      const requestBody = {
        chat_id: telegramChatId,
        text,
        parse_mode: 'HTML'
      };

      if (replyMarkup) {
        requestBody.reply_markup = replyMarkup;
      }

      fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })
      .then(async (res) => {
        // Silently handle success or API errors
      })
      .catch(() => {});
    } catch (err) {
      // Silently catch dispatcher errors
    }
  }
};
