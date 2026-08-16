/**
 * Netlify Edge Function: product-og
 * Dynamically serves rich Open Graph preview tags (Product Title, Price, Description, and High-Res Image)
 * to social media crawlers and chat link preview bots (WhatsApp, Telegram, Facebook, Twitter, Discord, iMessage, Pinterest).
 *
 * Regular human users are passed through transparently to the React SPA (context.next()) with zero latency penalty.
 */

export default async (request, context) => {
  const userAgent = (request.headers.get("user-agent") || "").toLowerCase();
  
  // Detect social crawlers and preview bots
  const isBot = /bot|crawler|spider|facebookexternalhit|whatsapp|telegram|twitterbot|slackbot|discordbot|pinterest|linkedin|applebot|bingbot|google/i.test(userAgent);
  
  if (!isBot) {
    return context.next();
  }

  const url = new URL(request.url);
  const match = url.pathname.match(/\/product\/([^/?#]+)/);
  if (!match) {
    return context.next();
  }

  const slugOrId = decodeURIComponent(match[1]);

  try {
    // 1. Query Firestore REST API for product by slug
    const firestoreUrl = "https://firestore.googleapis.com/v1/projects/vakrayan-9ce25/databases/(default)/documents:runQuery";
    
    const queryBody = {
      structuredQuery: {
        from: [{ collectionId: "products" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "slug" },
            op: "EQUAL",
            value: { stringValue: slugOrId }
          }
        },
        limit: 1
      }
    };

    const res = await fetch(firestoreUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(queryBody)
    });

    let productDoc = null;
    if (res.ok) {
      const results = await res.json();
      if (Array.isArray(results) && results[0]?.document) {
        productDoc = results[0].document;
      }
    }

    // 2. Fallback: If not found by slug, query direct document by ID
    if (!productDoc) {
      const directRes = await fetch(`https://firestore.googleapis.com/v1/projects/vakrayan-9ce25/databases/(default)/documents/products/${slugOrId}`);
      if (directRes.ok) {
        productDoc = await directRes.json();
      }
    }

    if (!productDoc || !productDoc.fields) {
      return context.next();
    }

    const fields = productDoc.fields;
    const name = fields.name?.stringValue || "Vakrayan Premium Apparel";
    const rawPrice = fields.price?.stringValue || fields.price?.integerValue || "";
    const price = rawPrice ? `₹${rawPrice}` : "";
    const rawDesc = fields.description?.stringValue || "Premium heavyweight drops crafted for contemporary street culture.";
    const cleanDesc = rawDesc
      .replace(/\[SIZE_CHART\]:[^\n]+/gi, "")
      .replace(/[-#*_`]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    
    const description = price 
      ? `Price: ${price} | ${cleanDesc.slice(0, 140)}` 
      : cleanDesc.slice(0, 150);

    const rawImage = fields.front_image_link?.stringValue 
      || fields.image_url?.stringValue 
      || fields.image?.stringValue 
      || "https://vakrayan.com/og-image.jpg";
    
    // Ensure the image URL is properly formatted for social crawlers (JPEG / WebP under 300KB)
    let ogImage = rawImage;
    if (ogImage.includes("workers.dev") || ogImage.includes("vakrayan.com")) {
      const baseUrl = ogImage.split("?")[0];
      ogImage = `${baseUrl}?w=800&q=80&f=jpeg`;
    }

    const productUrl = `https://vakrayan.com/product/${slugOrId}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(name)} | Vakrayan</title>
  <meta name="description" content="${escapeHtml(description)}">

  <!-- Open Graph / WhatsApp / Facebook / Telegram / Discord -->
  <meta property="og:type" content="product">
  <meta property="og:site_name" content="Vakrayan">
  <meta property="og:title" content="${escapeHtml(name)} | Vakrayan">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:image:secure_url" content="${ogImage}">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="800">
  <meta property="og:image:height" content="1000">
  <meta property="og:image:alt" content="${escapeHtml(name)}">
  <meta property="og:url" content="${productUrl}">
  <meta property="product:price:amount" content="${rawPrice || '0'}">
  <meta property="product:price:currency" content="INR">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@vakrayan_official">
  <meta name="twitter:title" content="${escapeHtml(name)} | Vakrayan">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${ogImage}">
  <meta name="twitter:image:alt" content="${escapeHtml(name)}">

  <!-- Fallback meta refresh if opened directly in browser -->
  <meta http-equiv="refresh" content="0;url=${productUrl}">
</head>
<body style="background:#0D1A14;color:#F0FDF4;font-family:sans-serif;text-align:center;padding:40px;">
  <h1>${escapeHtml(name)}</h1>
  <p>${escapeHtml(description)}</p>
  <p><a href="${productUrl}" style="color:#34D399;text-decoration:underline;">Click here if not redirected automatically</a></p>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });

  } catch (err) {
    return context.next();
  }
};

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
