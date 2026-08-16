const ALLOWED_ORIGINS = [
  'https://vakrayan.com',
  'https://www.vakrayan.com',
  'https://vakrayan.in',
  'https://www.vakrayan.in',
  'https://vakrayan.netlify.app',
  'http://localhost:5173',
  'http://localhost:3000'
];

export async function handler(event) {
  const origin = (event.headers && (event.headers.origin || event.headers.Origin)) || '';
  const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin);

  const corsHeaders = {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : 'https://vakrayan.com',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Block requests from unknown origins
  if (!isAllowedOrigin && event.httpMethod !== 'OPTIONS') {
    return {
      statusCode: 403,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Forbidden: Origin not allowed.' })
    };
  }

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }


  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' };
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
        headers: corsHeaders,
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
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(result)
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: err.message })
    };
  }
}
