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

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  // Block requests from unknown origins
  if (!isAllowedOrigin && event.httpMethod !== 'OPTIONS') {
    return {
      statusCode: 403,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Forbidden: Origin not allowed.' })
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const { action, phone, messageText, templateName, languageCode } = payload;

    const phoneNumberId =
      process.env.WHATSAPP_PHONE_NUMBER_ID ||
      process.env.VITE_WHATSAPP_PHONE_NUMBER_ID ||
      '1403690629486187';

    const accessToken =
      process.env.WHATSAPP_ACCESS_TOKEN ||
      process.env.VITE_WHATSAPP_ACCESS_TOKEN ||
      'EAASitTFCMWMBSVqJlUBDskd2E6YQJsXxEDH8QFT8bBjgDJBUAaWRZBiZAZA4QdqFgZCRgttImXMZBBRKA8xZBTdn0TDh5NSibmupfa8Drsn6NMtYC6oEyYzQziMGUEFV9u1YxkabyO2EgaDE1PY398f5Q5TUhXXsiPztRkE9jYjavVOJGOocSbZC9232ehkO1yWwQZDZD';

    if (!accessToken) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'WhatsApp Access Token not configured on server.' })
      };
    }

    if (!phone) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Phone number is required.' })
      };
    }

    const url = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;
    let requestPayload;

    if (action === 'template' && templateName) {
      requestPayload = {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode || 'en_US' },
          ...(payload.components ? { components: payload.components } : {})
        }
      };
    } else {
      requestPayload = {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: messageText || (payload.otpCode ? `🔐 *Vakrayan OTP Code:* ${payload.otpCode}` : '') }
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestPayload)
    });

    const data = await response.json();
    return {
      statusCode: response.ok ? 200 : 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
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
