/**
 * b2-upload-gateway — Vakrayan Image CDN Worker v2
 *
 * Improvements over v1:
 *  - B2 auth token cached in memory (saves 200-400ms per request)
 *  - Real image transformation via wsrv.nl (free, no CF paid plan needed)
 *    ?w=800&q=75  → serves WebP ~150KB instead of 3.36MB PNG
 *  - Cloudflare edge cache (1 year, immutable)
 *  - Strict CORS allowlist instead of open wildcard
 *
 * All existing env vars work unchanged:
 *   B2_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET_NAME, B2_BUCKET_ID
 */

// ── Module-level auth cache ───────────────────────────────────────────────────
// Persists across requests in same Worker instance — avoids re-auth every time.
let _cachedAuth = null;
let _authExpiry = 0;

async function getB2Auth(env) {
  if (_cachedAuth && Date.now() < _authExpiry) return _cachedAuth;

  const res = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
    headers: { 'Authorization': 'Basic ' + btoa(env.B2_KEY_ID + ':' + env.B2_APPLICATION_KEY) }
  });
  const data = await res.json();
  if (!res.ok) throw new Error('B2 Auth Failed: ' + (data.message || ''));

  _cachedAuth = data;
  _authExpiry = Date.now() + 23 * 60 * 60 * 1000; // Cache 23 hours (token valid 24h)
  return _cachedAuth;
}

// ── Generates a signed B2 URL that wsrv.nl can access ────────────────────────
async function getSignedUrl(auth, env, fileName) {
  const res = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_download_authorization`, {
    method: 'POST',
    headers: {
      'Authorization': auth.authorizationToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      bucketId: env.B2_BUCKET_ID,
      fileNamePrefix: fileName,
      validDurationInSeconds: 604800, // 7 days — long enough for wsrv.nl to process
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error('B2 Download Auth Failed');

  // This URL is publicly accessible for 7 days — safe to pass to wsrv.nl
  return `${auth.downloadUrl}/file/${env.B2_BUCKET_NAME}/${encodeURIComponent(fileName)}?Authorization=${data.authorizationToken}`;
}

// ── Config ────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://vakrayan.com',
  'https://www.vakrayan.com',
  'https://vakrayan.in',
  'https://www.vakrayan.in',
  'https://vakrayan.netlify.app',
  'http://localhost:5173',
  'http://localhost:3000',
];
const CACHE_TTL  = 60 * 60 * 24 * 365; // 1 year
const IMAGE_EXTS = /\.(jpe?g|png|gif|webp|avif|bmp|tiff?)$/i;

export default {
  async fetch(request, env, ctx) {
    const url    = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const isAllowed = ALLOWED_ORIGINS.includes(origin);

    const corsHeaders = {
      'Access-Control-Allow-Origin' : isAllowed ? origin : 'https://vakrayan.com',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Filename',
      'Access-Control-Max-Age'      : '86400',
      'Vary'                        : 'Origin, Accept',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // ════════════════════════════════════════════════════════════════════════
    //  GET  — Serve image (with optional transform)
    // ════════════════════════════════════════════════════════════════════════
    if (request.method === 'GET') {
      const path = url.pathname;
      if (!path.startsWith('/file/')) return new Response('Not Found', { status: 404 });

      const fileName = decodeURIComponent(path.replace('/file/', ''));
      if (!fileName) return new Response('Filename missing', { status: 400, headers: corsHeaders });

      // ── Parse transform params ─────────────────────────────────────────────
      const p      = url.searchParams;
      const rawW   = parseInt(p.get('w')   || '0',  10);
      const rawH   = parseInt(p.get('h')   || '0',  10);
      const rawQ   = parseInt(p.get('q')   || '80', 10);
      const rawDpr = parseFloat(p.get('dpr') || '1');
      const rawFit = p.get('fit') || 'inside';
      const rawFmt = p.get('f')   || 'webp';

      const dpr    = Math.min(2, Math.max(1, rawDpr));
      const width  = rawW ? Math.min(Math.round(rawW * dpr),  3840) : 0;
      const height = rawH ? Math.min(Math.round(rawH * dpr),  3840) : 0;
      const quality= Math.min(100, Math.max(1, rawQ));

      const isImage      = IMAGE_EXTS.test(fileName);
      const needsTransform = isImage && (width || height);

      // ── Cloudflare edge cache check ────────────────────────────────────────
      const cache    = caches.default;
      const cacheKey = new Request(url.toString(), { method: 'GET' });
      const cached   = await cache.match(cacheKey);
      if (cached) {
        const h = new Headers(cached.headers);
        Object.entries(corsHeaders).forEach(([k, v]) => h.set(k, v));
        h.set('X-Cache', 'HIT');
        return new Response(cached.body, { status: cached.status, headers: h });
      }

      try {
        const auth = await getB2Auth(env);
        let response;

        if (needsTransform) {
          // ── Route through wsrv.nl with signed B2 URL ─────────────────────
          // wsrv.nl fetches the private B2 file using the signed URL,
          // resizes it, converts to WebP, and returns the optimised image.
          const signedUrl  = await getSignedUrl(auth, env, fileName);
          const wsrvParams = new URLSearchParams({
            url   : signedUrl,
            q     : String(quality),
            output: rawFmt,    // webp / avif / jpeg
            fit   : rawFit,
            we    : '1',       // Without enlargement
            il    : '1',       // Interlace / progressive JPEG
            n     : '-1',      // Strip EXIF metadata
          });
          if (width)  wsrvParams.set('w', String(width));
          if (height) wsrvParams.set('h', String(height));

          response = await fetch(`https://wsrv.nl/?${wsrvParams}`, {
            headers: {
              'Accept'    : request.headers.get('Accept') || 'image/webp,image/avif,image/*,*/*;q=0.8',
              'User-Agent': 'VakrayanCDN/2.0',
            },
            cf: { cacheTtl: CACHE_TTL, cacheEverything: true },
          });

          // Fallback: if wsrv.nl fails, serve raw file from B2
          if (!response.ok) {
            response = await fetch(
              `${auth.downloadUrl}/file/${env.B2_BUCKET_NAME}/${encodeURIComponent(fileName)}`,
              { headers: { 'Authorization': auth.authorizationToken } }
            );
          }
        } else {
          // ── No transform — direct B2 passthrough ─────────────────────────
          response = await fetch(
            `${auth.downloadUrl}/file/${env.B2_BUCKET_NAME}/${encodeURIComponent(fileName)}`,
            {
              headers: { 'Authorization': auth.authorizationToken },
              cf: { cacheTtl: CACHE_TTL, cacheEverything: true },
            }
          );
        }

        if (!response.ok) {
          return new Response('File not found or access denied', {
            status: response.status, headers: corsHeaders,
          });
        }

        // ── Build final response ───────────────────────────────────────────
        const rh = new Headers(response.headers);
        Object.entries(corsHeaders).forEach(([k, v]) => rh.set(k, v));
        rh.set('Cache-Control', `public, max-age=${CACHE_TTL}, immutable`);
        rh.set('X-Cache',     'MISS');
        rh.set('X-Transform', needsTransform ? 'wsrv' : 'passthrough');
        // Strip internal Backblaze headers
        ['x-bz-content-sha1','x-bz-file-id','x-bz-file-name',
         'x-bz-info-src_last_modified_millis','x-bz-upload-timestamp']
          .forEach(h => rh.delete(h));

        const final = new Response(response.body, { status: 200, headers: rh });
        ctx.waitUntil(cache.put(cacheKey, final.clone())); // Non-blocking cache store
        return final;

      } catch (err) {
        return new Response(err.message, { status: 500, headers: corsHeaders });
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    //  POST  — Upload file to B2  (unchanged from v1)
    // ════════════════════════════════════════════════════════════════════════
    if (request.method === 'POST') {
      try {
        const contentType = request.headers.get('content-type') || '';
        let fileData, fileName, mimeType;

        if (contentType.includes('multipart/form-data')) {
          const formData = await request.formData();
          const file = formData.get('file');
          if (!file) return new Response('No file uploaded', { status: 400 });
          fileData  = await file.arrayBuffer();
          fileName  = file.name;
          mimeType  = file.type;
        } else {
          fileData  = await request.arrayBuffer();
          fileName  = request.headers.get('x-filename') || `upload_${Date.now()}.jpg`;
          mimeType  = contentType || 'image/jpeg';
        }

        const auth = await getB2Auth(env);

        const uploadUrlRes = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_upload_url`, {
          method : 'POST',
          headers: {
            'Authorization': auth.authorizationToken,
            'Content-Type' : 'application/json',
          },
          body: JSON.stringify({ bucketId: env.B2_BUCKET_ID }),
        });
        const uploadUrlData = await uploadUrlRes.json();
        if (!uploadUrlRes.ok) throw new Error('Get Upload URL Failed');

        const cleanName      = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const uniqueFileName = `${Date.now()}_${cleanName}`;

        const uploadRes = await fetch(uploadUrlData.uploadUrl, {
          method : 'POST',
          headers: {
            'Authorization'  : uploadUrlData.authorizationToken,
            'X-Bz-File-Name' : encodeURIComponent(uniqueFileName),
            'Content-Type'   : mimeType,
            'Content-Length' : fileData.byteLength.toString(),
            'X-Bz-Content-Sha1': 'do_not_verify',
          },
          body: fileData,
        });
        if (!uploadRes.ok) {
          const d = await uploadRes.json();
          throw new Error('Upload Failed: ' + (d.message || ''));
        }

        return new Response(
          JSON.stringify({ success: true, url: `https://${url.host}/file/${uniqueFileName}` }),
          { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );

      } catch (err) {
        return new Response(
          JSON.stringify({ success: false, error: err.message }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
    }

    return new Response('Not Found', { status: 404 });
  },
};
