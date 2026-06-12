/**
 * Centralized utility helper to dispatch notifications to Discord Webhook and Telegram Bot.
 * Supports auto-formatting and channel routing based on event types.
 */
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
          content = `🚨 **NEW STREETWEAR ORDER RECEIVED!** 🚨\n\n` +
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
          content = `🚫 **STREETWEAR ORDER CANCELLED BY CUSTOMER** 🚫\n\n` +
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
      }).catch(err => console.warn(`Failed to dispatch ${event} Discord notification:`, err.message));
    } catch (err) {
      console.warn(`Discord dispatcher error for ${event}:`, err.message);
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
  if (telegramToken && telegramToken.trim() && telegramChatId) {
    try {
      let text = '';
      if (event === 'order.created') {
        const itemsList = (payload.items || []).map(i => `• ${i.name} (Size: ${i.size}) x${i.quantity} @ ₹${i.price}`).join('\n');
        text = `<b>🚨 NEW STREETWEAR ORDER RECEIVED! 🚨</b>\n\n` +
               `<b>Order Number:</b> <code>${payload.orderNumber}</code>\n` +
               `<b>Customer Name:</b> ${payload.customerName}\n` +
               `<b>Email:</b> ${payload.email}\n` +
               `<b>Phone:</b> ${payload.phone}\n` +
               `<b>Payment Method:</b> ${payload.paymentMethod}\n` +
               `<b>Total Amount:</b> ₹${payload.total}\n` +
               `<b>Shipping Address:</b> ${payload.shippingAddress}\n\n` +
               `<b>Items Ordered:</b>\n${itemsList}`;
      } else if (event === 'order.cancelled') {
        const itemsList = (payload.items || []).map(i => `• ${i.name} (Size: ${i.size}) x${i.quantity}`).join('\n');
        text = `<b>🚫 STREETWEAR ORDER CANCELLED BY CUSTOMER 🚫</b>\n\n` +
               `<b>Order Number:</b> <code>${payload.orderNumber}</code>\n` +
               `<b>Customer Name:</b> ${payload.customerName}\n` +
               `<b>Email:</b> ${payload.email}\n` +
               `<b>Total Refund Amount:</b> ₹${payload.total}\n` +
               `<b>Reason for Cancellation:</b> <i>${payload.reason}</i>\n\n` +
               `<b>Items in Cancelled Order:</b>\n${itemsList}`;
      } else if (event === 'user.signup') {
        text = `<b>👤 NEW USER REGISTERED! 👤</b>\n\n` +
               `<b>Name:</b> ${payload.name}\n` +
               `<b>Email:</b> ${payload.email}\n` +
               `<b>User ID:</b> <code>${payload.userId}</code>`;
      } else if (event === 'newsletter.subscribe') {
        text = `<b>📧 NEW NEWSLETTER SUBSCRIPTION! 📧</b>\n\n` +
               `<b>Email Address:</b> ${payload.email}`;
      } else if (event === 'restock.requested') {
        text = `<b>🔄 RESTOCK NOTIFICATION REQUESTED! 🔄</b>\n\n` +
               `<b>Product:</b> ${payload.productName} (ID: <code>${payload.productId}</code>)\n` +
               `<b>Size Requested:</b> <code>${payload.size}</code>\n` +
               `<b>Email:</b> ${payload.email}`;
      } else if (event === 'return.requested') {
        text = `<b>📦 RETURN/EXCHANGE REQUESTED! 📦</b>\n\n` +
               `<b>Order Number:</b> <code>${payload.orderNumber}</code>\n` +
               `<b>Type:</b> ${payload.type} (Return or Exchange)\n` +
               `<b>Reason:</b> ${payload.reason}\n` +
               `<b>Customer Email:</b> ${payload.email}`;
      } else {
        text = `<b>🔔 WEBSITE EVENT: ${event.toUpperCase()} 🔔</b>\n\n` +
               `<pre>${JSON.stringify(payload, null, 2)}</pre>`;
      }

      const telegramUrl = `https://api.telegram.org/bot${telegramToken.trim()}/sendMessage`;
      fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text,
          parse_mode: 'HTML'
        })
      }).catch(err => console.warn(`Failed to dispatch ${event} Telegram notification:`, err.message));
    } catch (err) {
      console.warn(`Telegram dispatcher error for ${event}:`, err.message);
    }
  }
};
