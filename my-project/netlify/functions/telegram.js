export async function handler(event) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
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
    const { token, chatId, text, parseMode, replyMarkup } = payload;

    const botToken = (token && token.trim()) || process.env.VITE_TELEGRAM_BOT_TOKEN || "8918832059:AAEbqEa7cHG9Bs632f14nYEzmkcquP7kJD8";
    const targetChatId = (chatId && chatId.trim()) || process.env.VITE_TELEGRAM_ORDER_CHAT_ID || "-1003947210182";

    if (!botToken || !targetChatId) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Missing Telegram bot token or chat ID' })
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
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(result)
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: err.message })
    };
  }
}
