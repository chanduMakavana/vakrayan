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

    // Bot token — check both naming conventions:
    //   TELEGRAM_BOT_TOKEN  (preferred, server-side only)
    //   VITE_TELEGRAM_BOT_TOKEN (legacy — set in Netlify Dashboard 3+ months ago)
    // Netlify functions can read VITE_-prefixed vars too; the VITE_ prefix only
    // affects what gets bundled into the client-side JS by Vite.
    const botToken =
      process.env.TELEGRAM_BOT_TOKEN ||
      process.env.VITE_TELEGRAM_BOT_TOKEN;

    // Resolve target chat ID based on channel route (check both prefixes)
    const chatIdMap = {
      order : process.env.TELEGRAM_ORDER_CHAT_ID  || process.env.VITE_TELEGRAM_ORDER_CHAT_ID,
      event : process.env.TELEGRAM_EVENT_CHAT_ID  || process.env.VITE_TELEGRAM_EVENT_CHAT_ID,
      cancel: process.env.TELEGRAM_CANCEL_CHAT_ID || process.env.VITE_TELEGRAM_CANCEL_CHAT_ID,
    };
    const targetChatId =
      chatIdMap[channelRoute] ||
      process.env.TELEGRAM_ORDER_CHAT_ID ||
      process.env.VITE_TELEGRAM_ORDER_CHAT_ID;

    if (!botToken || !targetChatId) {
      const missing = [];
      if (!botToken)     missing.push('TELEGRAM_BOT_TOKEN (or VITE_TELEGRAM_BOT_TOKEN)');
      if (!targetChatId) missing.push(`TELEGRAM_${channelRoute.toUpperCase()}_CHAT_ID (or VITE_ variant)`);
      console.error('[telegram.js] Missing env vars:', missing.join(', '));
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Telegram env vars not configured on server.',
          missing
        })
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
