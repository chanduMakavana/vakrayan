# Vakrayan Website Audit Report

Date: 2026-08-23

Scope: scan-only audit. No source code fixes were applied.

## Verification Summary

| Check | Status | Notes |
| --- | --- | --- |
| `npm run build` | VERIFIED | Production build completed successfully. |
| `npm run lint` | VERIFIED FAIL | 208 errors and 9 warnings. |
| Production preview | VERIFIED | `/`, `/product/test-slug`, and `/checkout` returned HTTP 200 locally. |
| Android real-device testing | NOT TESTABLE | No Android browser/device available in this environment. |
| iOS Safari/Chrome real-device testing | NOT TESTABLE | No iOS browser/device available in this environment. |
| Live Google login | NOT TESTABLE | Requires real Firebase auth domain and browser OAuth flow. |
| Live payment | NOT TESTABLE | Requires real Razorpay credentials and payment environment. |
| Live Firestore data/rules deployment | STATICALLY ANALYZED | Rules and code were inspected locally only. |

## Critical Issues

### 1. Online Payment Can Finalize Orders Without Server-Side Razorpay Verification

- File: `src/componets/page/Checkout.jsx`
- Exact location: around lines 500-503
- Root cause: Razorpay success handler calls `processFinalizeOrder(data, 'ONLINE', 'PAID', payId, ordId)` directly from the browser.
- Why it happens: Existing verification functions exist in `netlify/functions/razorpay.js` and `workers/razorpay-verify/index.js`, but checkout does not call them before creating the order.
- Affected platform: Desktop, Android, iOS, all production checkout flows.
- Severity: Critical
- Recommended fix: Create the Razorpay order server-side, pass the returned Razorpay `order_id` to Checkout, and verify `razorpay_signature` server-side before Firestore order creation.
- Expected result after fix: Paid orders are created only after verified Razorpay payment signatures.

### 2. Sandbox Payment Fallback Can Create Paid Online Orders

- File: `src/componets/page/Checkout.jsx`
- Exact location: around lines 527 and 1325
- Root cause: If the Razorpay SDK/key path fails, checkout opens `RazorpaySandboxModal`, then finalizes the order as `ONLINE` and `PAID`.
- Why it happens: Sandbox fallback is available in the production component without an explicit development/test environment guard.
- Affected platform: Production checkout on any browser if fallback path is reachable.
- Severity: Critical
- Recommended fix: Disable sandbox modal in production. Allow it only behind an explicit dev/test env flag.
- Expected result after fix: Production users cannot create fake paid orders through the simulator.

### 3. Wallet Debit Happens After Order Creation and Is Non-Blocking

- File: `src/componets/page/Checkout.jsx`
- Exact location: around line 684
- Root cause: Wallet debit is started after the order is already created and errors are only logged.
- Why it happens: `walletService.createWalletTransaction(...).catch(...)` is backgrounded instead of being part of an atomic checkout operation.
- Affected platform: Wallet checkout.
- Severity: Critical
- Recommended fix: Move wallet debit and order creation into a trusted server-side transaction. Fail order creation if wallet debit fails.
- Expected result after fix: Wallet orders cannot be created unless wallet balance is debited successfully.

### 4. Client-Side Stock Decrement Is Race-Prone

- File: `src/componets/page/Checkout.jsx`
- Exact location: around line 635
- Root cause: Stock is validated and decremented from browser-side code using independent product updates.
- Why it happens: There is no server-side transaction covering stock validation, stock decrement, order creation, and cart cleanup.
- Affected platform: Checkout during concurrent purchases.
- Severity: Critical
- Recommended fix: Use a Firestore transaction or server function for stock validation, stock decrement, order creation, wallet/payment status, and cart conversion.
- Expected result after fix: Concurrent checkout cannot oversell stock.

## High Priority Issues

### 5. Firestore Query Fallback Can Read Whole Collections

- File: `src/firebase/adapter.js`
- Exact location: around lines 370-379
- Root cause: When indexed Firestore queries fail, the adapter falls back to broad collection reads and client-side sorting/filtering.
- Why it happens: The legacy adapter tries to hide missing index/query errors by reading more data.
- Affected platform: Orders, cart, wallet, products, wishlist.
- Severity: High
- Recommended fix: Add required Firestore indexes and remove full-collection fallback for private or high-volume collections.
- Expected result after fix: Lower read cost, more predictable performance, and reduced private-data exposure risk.

### 6. Lint Fails Across the Project

- File: `eslint.config.js`
- Exact location: whole config
- Root cause: Browser globals are applied to Node functions/scripts/service worker files, and real app errors are mixed with environment config errors.
- Why it happens: ESLint config has one generic browser-targeted rule set for all JS/JSX files.
- Affected platform: Development and CI quality gate.
- Severity: High
- Recommended fix: Split ESLint config by browser app, Netlify functions, scripts, Cloudflare workers, and service worker contexts. Then fix remaining real lint errors.
- Expected result after fix: `npm run lint` becomes a reliable production gate.

### 7. UserProfile Has a Likely Runtime Missing Import

- File: `src/componets/page/UserProfile.jsx`
- Exact location: lint reported around line 597
- Root cause: `sendWebhookNotification` is referenced but not defined/imported.
- Why it happens: The component uses the helper without importing it.
- Affected platform: Profile/order action flows where that code path executes.
- Severity: High
- Recommended fix: Import `sendWebhookNotification` from `../../utils/webhookHelper` or remove the call if no longer needed.
- Expected result after fix: No runtime `ReferenceError` in the affected user-profile flow.

### 8. Google Login Requires Live iOS/Authorized-Domain Validation

- File: `src/firebase/adapter.js`, `netlify.toml`
- Exact location: `adapter.js` around lines 185-202, `netlify.toml` around line 10
- Root cause: iOS/Safari redirect handling exists, but success depends on deployed proxy behavior and Firebase authorized domains.
- Why it happens: Firebase OAuth redirect flows are environment-sensitive and cannot be fully validated statically.
- Affected platform: iOS Safari, iOS Chrome, Safari.
- Severity: High
- Recommended fix: Test on deployed production domain with real iOS devices and verify Firebase Console authorized domains include all production and preview domains.
- Expected result after fix: Google redirect login completes reliably on iOS.

## Medium Priority Issues

### 9. Large Firebase Vendor Chunk

- File: `vite.config.js`
- Exact location: manual chunking config around line 18
- Root cause: Firebase is manually chunked, but the resulting `vendor-firebase` bundle remains large.
- Why it happens: Firebase auth/firestore/storage/messaging modules are imported in app startup paths.
- Affected platform: Mobile and slow networks.
- Severity: Medium
- Build result: `vendor-firebase-B2-gKEHD.js` is 693.61 kB minified and 204.82 kB gzip.
- Recommended fix: Lazy-load Firebase messaging/storage/admin-only paths and avoid importing unused Firebase modules in initial route code.
- Expected result after fix: Smaller initial JavaScript and better startup performance.

### 10. Firebase Config Fallback Values Are Hardcoded

- File: `src/firebase/config.js`, `public/firebase-messaging-sw.js`
- Exact location: `config.js` around line 7, service worker around line 7
- Root cause: Production Firebase config values are embedded as fallbacks.
- Why it happens: The app falls back to production project values if env vars are missing.
- Affected platform: Environment isolation, staging, local development.
- Severity: Medium
- Recommended fix: Require env config during build where possible. Generate service worker config per environment.
- Expected result after fix: Staging/dev builds cannot accidentally point at production Firebase.

### 11. Duplicate Firestore Rules Files Differ

- File: `firestore.rules` and root `../firestore.rules`
- Exact location: restock/wallet rules differ around lines 66-78
- Root cause: There are two rules files with different access controls.
- Why it happens: `firebase.json` deploys `my-project/firestore.rules`, but the root rules file remains stale.
- Affected platform: Security reviews and deployment clarity.
- Severity: Medium
- Recommended fix: Remove the stale root rules file or sync it with the deployable project-local rules.
- Expected result after fix: One clear source of truth for Firestore security rules.

### 12. Production Checkout Shows Sandbox Copy

- File: `src/componets/page/Checkout.jsx`
- Exact location: around line 1148
- Root cause: Checkout UI displays “Razorpay Secured Sandbox Active”.
- Why it happens: Test/sandbox messaging is rendered in the normal checkout component.
- Affected platform: Production checkout UX.
- Severity: Medium
- Recommended fix: Gate sandbox copy by environment or remove it from production.
- Expected result after fix: Production payment UI looks trustworthy and does not mention sandbox.

## Low Priority Issues

### 13. SEO Metadata Is Manually Managed and Easy to Drift

- File: `index.html`, `src/componets/page/ProductDetail.jsx`
- Exact location: `index.html` around canonical/meta tags, `ProductDetail.jsx` dynamic JSON-LD/title effect.
- Root cause: Static and route-level SEO metadata are managed manually in different places.
- Why it happens: No central route metadata abstraction exists.
- Affected platform: SEO consistency.
- Severity: Low
- Recommended fix: Centralize metadata handling per route.
- Expected result after fix: Less duplicated or stale metadata.

## Authentication Test Results

| Area | Result |
| --- | --- |
| Email login | STATICALLY ANALYZED. Firebase email/password login exists. |
| Wrong password/invalid email | STATICALLY ANALYZED. Error mapping exists in `Login.jsx`. |
| Empty fields | STATICALLY ANALYZED. `react-hook-form` validation exists. |
| Logout | STATICALLY ANALYZED. Firebase sign-out path exists. |
| Session persistence | STATICALLY ANALYZED. App restores Firebase auth state on mount. |
| Google popup login | STATICALLY ANALYZED. Popup path exists for non-Safari desktop browsers. |
| Google redirect login | STATICALLY ANALYZED. Redirect path exists for iOS/Safari/CriOS. |
| Protected routes | STATICALLY ANALYZED. `/checkout`, `/profile`, `/order/:id` use `ProtectedRoute`. |
| Admin routes | STATICALLY ANALYZED. `/admin` uses `AdminRoute`; Firestore rules enforce admin writes. |
| Mobile authentication | NOT TESTABLE. Requires physical or browser-emulated device with live auth. |
| iOS authentication | NOT TESTABLE. Requires real iOS Safari/Chrome and deployed domain. |
| Android authentication | NOT TESTABLE. Requires Android Chrome/Samsung Internet testing. |

## Platform Test Results

| Platform | Result |
| --- | --- |
| Desktop local production preview | VERIFIED basic route serving. |
| Android 320-480 px | NOT TESTABLE in current environment. |
| iOS Safari/Chrome | NOT TESTABLE in current environment. |
| Firefox/Edge/Safari desktop | NOT TESTABLE in current environment. |

Static mobile risks:

- Large initial JavaScript, especially Firebase.
- Complex product-gallery touch handling with non-passive listeners.
- Multiple fixed/sticky overlays and drawers need real mobile testing.
- Google redirect login depends on deployed domain and Firebase authorized domains.

## Routing Test Results

| Route | Local Production Preview |
| --- | --- |
| `/` | HTTP 200 |
| `/product/test-slug` | HTTP 200 |
| `/checkout` | HTTP 200 |

SPA fallback is configured in:

- `netlify.toml`
- `public/_redirects`
- `vercel.json`

## Performance Results

Production build completed successfully.

Largest build artifacts:

| Asset | Minified | Gzip |
| --- | ---: | ---: |
| `vendor-firebase-B2-gKEHD.js` | 693.61 kB | 204.82 kB |
| `jspdf.es.min-JkHVZRUa.js` | 399.55 kB | 129.66 kB |
| `html2canvas-BIOACysJ.js` | 199.57 kB | 46.79 kB |
| `index-Db-27Lmc.js` | 197.97 kB | 43.81 kB |
| `AddminPanel-CBYbVsIA.js` | 194.87 kB | 38.32 kB |
| `vendor-react-CWebfFje.js` | 181.79 kB | 57.19 kB |

Major bottlenecks:

- Firebase vendor bundle is large.
- App startup warms auth, products, slides, offers, metadata, images, and fonts.
- Firestore fallback can trigger larger reads than expected.
- PDF/canvas libraries are large and should stay lazy-loaded.

Core Web Vitals risks:

- LCP risk from large JS and hero imagery.
- FCP risk from Firebase/app warmup.
- INP risk from large components and custom touch/gesture handling.
- CLS risk must be verified visually on real devices.

## Security Results

### Firebase

- Project-local Firestore rules are generally restrictive.
- Root rules file is stale/different and should be synced or removed.
- Admin writes are server-enforced by Firestore rules, not only UI.

### Authentication

- Firebase Auth is used for email/password and Google login.
- iOS redirect handling exists but must be live-tested.
- Google session expiry is custom and stored in localStorage.

### Database

- Checkout-critical writes are client initiated.
- Stock and wallet logic should move to server-side transactions.
- Firestore broad query fallback should be removed for private/high-volume collections.

### Storage

- Upload paths use Cloudflare/B2 worker fallback and Firebase Storage fallback.
- Storage rules were not found in the scanned project, so Firebase Storage authorization could not be verified.

### API / Payment

- Razorpay server verification code exists but is not wired into checkout.
- Checkout currently trusts client-side payment success.

### Frontend

- No `dangerouslySetInnerHTML` was identified in the targeted static scan.
- No Content-Security-Policy was found in `netlify.toml`.
- `.env.example` lists `VITE_TELEGRAM_*`; those should not be client-side variables.

## Build And Lint Results

### Build

Command:

```bash
npm run build
```

Result: VERIFIED PASS.

### Lint

Command:

```bash
npm run lint
```

Result: VERIFIED FAIL.

Summary:

- 217 total problems.
- 208 errors.
- 9 warnings.
- Several errors are caused by ESLint environment mismatch for Netlify functions, scripts, and service worker files.
- There are also real app-level issues, including missing definitions/imports and React compiler rule violations.

## Required Next Step

No fixes have been applied. Per the requested workflow, fixes should start only after explicit approval, for example:

```text
YES, FIX IT
```
