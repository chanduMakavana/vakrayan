export async function handler(event) {
  const allowOrigin = (event.headers && (event.headers.origin || event.headers.Origin)) || '*';
  const corsHeaders = {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const { action, email, password, token, orderData, awb } = payload;

    const shiprocketEmail = email || process.env.SHIPROCKET_EMAIL;
    const shiprocketPassword = password || process.env.SHIPROCKET_PASSWORD;

    // 1. Authenticate with Shiprocket API
    if (action === 'auth') {
      if (!shiprocketEmail || !shiprocketPassword) {
        return {
          statusCode: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Shiprocket email or password is not provided.' })
        };
      }

      const res = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: shiprocketEmail.trim(),
          password: shiprocketPassword.trim()
        })
      });

      const data = await res.json();
      return {
        statusCode: res.ok ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      };
    }

    // 2. Create Adhoc Order in Shiprocket
    if (action === 'create_order') {
      let authToken = token;
      
      // Auto login if token is missing but credentials available
      if (!authToken && shiprocketEmail && shiprocketPassword) {
        const authRes = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: shiprocketEmail.trim(), password: shiprocketPassword.trim() })
        });
        const authData = await authRes.json();
        if (authData.token) {
          authToken = authData.token;
        }
      }

      if (!authToken) {
        return {
          statusCode: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Shiprocket Auth Token missing. Please log in to Shiprocket first.' })
        };
      }

      const res = await fetch('https://apiv2.shiprocket.in/v1/external/orders/create/adhoc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(orderData)
      });

      const data = await res.json();
      return {
        statusCode: res.ok ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      };
    }

    // 3. Track Shipment Status by AWB
    if (action === 'track') {
      if (!awb) {
        return {
          statusCode: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'AWB tracking number is required.' })
        };
      }

      const trackingUrl = `https://apiv2.shiprocket.in/v1/external/courier/track/awb/${encodeURIComponent(awb)}`;
      const res = await fetch(trackingUrl, {
        headers: {
          'Authorization': `Bearer ${token || ''}`
        }
      });
      const data = await res.json();
      return {
        statusCode: res.ok ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      };
    }

    // 4. Generate Official Shiprocket Label PDF
    if (action === 'generate_label') {
      const { shipment_id } = payload;
      let authToken = token;

      if (!authToken && shiprocketEmail && shiprocketPassword) {
        const authRes = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: shiprocketEmail.trim(), password: shiprocketPassword.trim() })
        });
        const authData = await authRes.json();
        if (authData.token) {
          authToken = authData.token;
        }
      }

      if (!authToken) {
        return {
          statusCode: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Shiprocket Auth Token missing.' })
        };
      }

      const res = await fetch('https://apiv2.shiprocket.in/v1/external/courier/generate/label', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ shipment_id: [shipment_id] })
      });

      const data = await res.json();
      return {
        statusCode: res.ok ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      };
    }

    return {
      statusCode: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid action requested.' })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message })
    };
  }
}
