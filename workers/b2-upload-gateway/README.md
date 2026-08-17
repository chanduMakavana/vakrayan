# b2-upload-gateway — Vakrayan Image CDN Worker

Real-time image transformation Worker for Cloudflare.
Converts PNG/JPEG → WebP/AVIF, resizes, compresses on the fly.

## Expected Impact
| Metric       | Before  | After Target |
|--------------|---------|--------------|
| LCP Image    | 3.36 MB | ~150-200 KB  |
| LCP Time     | 5.28 s  | ~1.5 s       |
| Page Weight  | 17.3 MB | ~4-5 MB      |

---

## Prerequisites

### 1. Enable Cloudflare Image Resizing on your Zone
Cloudflare Dashboard → vakrayan.com → Speed → Optimization
→ **Image Resizing** → Turn ON

> Without this, the `cf.image` transform in the Worker is silently ignored.

---

## Deploy Steps

### Step 1 — Install Wrangler (one-time)
```bash
npm install -g wrangler
wrangler login
```

### Step 2 — Set the B2 Bucket URL secret
```bash
cd workers/b2-upload-gateway
wrangler secret put B2_BUCKET_URL
```
When prompted, enter your full B2 public bucket URL:
```
https://f005.backblazeb2.com/file/vakrayan-images
```
> Find this in Backblaze → Buckets → your bucket → Bucket Settings → Public URL

### Step 3 — Deploy
```bash
wrangler deploy
```

That's it. The Worker replaces the existing b2-upload-gateway automatically
since it uses the same name in wrangler.toml.

---

## Verify It's Working

After deploy, test in browser:
```
https://b2-upload-gateway.vakrayan.workers.dev/file/YOUR_IMAGE.png?w=800&q=75
```

Check response headers:
- `Content-Type: image/webp`  ← format converted ✅
- `X-Transform: yes`          ← transformation applied ✅
- `X-Cache: MISS` (first hit), `HIT` (subsequent hits) ✅
- `Cache-Control: public, max-age=31536000, immutable` ✅

---

## No Code Changes Needed in React App

The existing `imageOptimizer.js` already adds `?w=` and `?q=` params —
those same params now actually work after this Worker deploy.

The hero image preloads in `index.html` already use:
```
?w=800&dpr=2&q=75   (mobile)
?w=1600&dpr=2&q=75  (desktop)
```
These will now serve ~150-200 KB WebP instead of 3.36 MB PNG.
