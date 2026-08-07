export async function handler(event) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': 'https://vakrayan.in',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const { text, parseMode, replyMarkup, channelRoute } = payload;

    // Bot token is server-side only (no VITE_ prefix — never sent to client)
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    // Resolve target chat ID based on channel route
    const chatIdMap = {
      order: process.env.TELEGRAM_ORDER_CHAT_ID,
      event: process.env.TELEGRAM_EVENT_CHAT_ID,
      cancel: process.env.TELEGRAM_CANCEL_CHAT_ID,
    };
    const targetChatId = chatIdMap[channelRoute] || process.env.TELEGRAM_ORDER_CHAT_ID;

    if (!botToken || !targetChatId) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': 'https://vakrayan.in' },
        body: JSON.stringify({ error: 'Telegram bot token or chat ID is not configured on the server.' })
      };
    }

    const telegramUrl = `https://api.telegram.org/bot${botToken.trim()}/sendMessage`;
    const requestBody = {
      chat_id: targetChatId,
      text: text,
      parse_mode: parseMode || 'HTML'
    };

    if (replyMarkup) {
      requestBody.reply_markup = replyMarkup;
    }

    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const result = await response.json();
    return {
      statusCode: response.ok ? 200 : 400,
      headers: {
        'Access-Control-Allow-Origin': 'https://vakrayan.in',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(result)
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': 'https://vakrayan.in',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: err.message })
    };
  }
}
