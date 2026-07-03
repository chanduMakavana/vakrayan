/**
 * Cloudflare Worker: Firebase to Backblaze B2 Daily Backup
 * 
 * This script runs entirely on Cloudflare Workers (on a Cron Trigger).
 * It requires no npm dependencies. It uses Web Crypto for JWT signing 
 * to fetch Firestore data, and B2 native REST APIs to save the backup.
 * 
 * Setup in Cloudflare Dashboard:
 * 1. Create a new Cloudflare Worker.
 * 2. Paste this code into the Worker editor.
 * 3. Go to Settings > Variables and add the following Environment Variables:
 *    - B2_APPLICATION_KEY_ID: (Your B2 Key ID)
 *    - B2_APPLICATION_KEY: (Your B2 Application Key)
 *    - B2_BUCKET_ID: (Your B2 Bucket ID - Note: B2 upload API needs Bucket ID, not just Bucket Name)
 *    - FIREBASE_PROJECT_ID: (Your Firebase Project ID)
 *    - FIREBASE_SERVICE_ACCOUNT_JSON: (The entire contents of your serviceAccountKey.json file)
 * 4. Go to Triggers > Cron Triggers > Add Trigger:
 *    - Set it to: `30 6 * * *` (Which is 12:00 PM Indian Standard Time / 6:30 AM UTC daily)
 */

export default {
  // 1. Cron Trigger entry point
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runBackupJob(env));
  },

  // 2. HTTP Request entry point (allows manual trigger via browser or webhook)
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/run-backup") {
      try {
        const result = await runBackupJob(env);
        return new Response(JSON.stringify({ success: true, message: result }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    return new Response("Firebase to Backblaze B2 Backup Worker. Run /run-backup to trigger manually.");
  }
};

// Core Backup Orchestrator
async function runBackupJob(env) {
  const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
  
  console.log("🔐 Generating Google OAuth2 token...");
  const oauthToken = await getGoogleAuthToken(serviceAccount);
  
  console.log("🔄 Fetching Firestore collections...");
  const collections = ["users", "orders", "products"];
  const backupData = {};

  for (const col of collections) {
    const docs = await fetchFirestoreCollection(env.FIREBASE_PROJECT_ID, col, oauthToken);
    backupData[col] = docs;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `firestore/backup_${timestamp}.json`;
  const fileBody = JSON.stringify(backupData, null, 2);

  console.log("☁️ Uploading to Backblaze B2...");
  await uploadToB2(env, filename, fileBody);
  
  return `Backup of collections [${collections.join(", ")}] uploaded successfully as ${filename}`;
}

// 1. Google OAuth2 JWT RS256 Web Crypto Signer
async function getGoogleAuthToken(serviceAccount) {
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  
  // Format private key to DER format
  const pemContents = serviceAccount.private_key
    .replace(pemHeader, "")
    .replace(pemFooter, "")
    .replace(/\s+/g, "");
  
  const binaryDerString = atob(pemContents);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }

  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    
  const now = Math.floor(Date.now() / 1000);
  const claim = btoa(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  })).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const tokenInput = `${header}.${claim}`;
  const signatureBuffer = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(tokenInput)
  );
  
  const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const jwt = `${tokenInput}.${signature}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Google Auth Token request failed: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

// 2. Fetch documents from Firestore REST API
async function fetchFirestoreCollection(projectId, collectionName, token) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Failed to fetch collection ${collectionName}: ${JSON.stringify(data)}`);
  }

  // Format documents to key-value maps
  const documents = {};
  if (data.documents) {
    for (const doc of data.documents) {
      const nameParts = doc.name.split("/");
      const docId = nameParts[nameParts.length - 1];
      documents[docId] = formatFirestoreFields(doc.fields || {});
    }
  }
  return documents;
}

// Helper to flatten Firestore REST API format to simple JSON
function formatFirestoreFields(fields) {
  const result = {};
  for (const [key, val] of Object.entries(fields)) {
    if ("stringValue" in val) result[key] = val.stringValue;
    else if ("integerValue" in val) result[key] = parseInt(val.integerValue, 10);
    else if ("doubleValue" in val) result[key] = parseFloat(val.doubleValue);
    else if ("booleanValue" in val) result[key] = val.booleanValue;
    else if ("nullValue" in val) result[key] = null;
    else if ("mapValue" in val) result[key] = formatFirestoreFields(val.mapValue.fields || {});
    else if ("arrayValue" in val) {
      result[key] = (val.arrayValue.values || []).map(v => {
        if ("stringValue" in v) return v.stringValue;
        if ("integerValue" in v) return parseInt(v.integerValue, 10);
        if ("mapValue" in v) return formatFirestoreFields(v.mapValue.fields || {});
        return v;
      });
    } else {
      result[key] = val;
    }
  }
  return result;
}

// 3. Upload file to Backblaze B2 using B2 Native REST API
async function uploadToB2(env, filename, fileBody) {
  // Step A: Authorize Account
  const authHeader = "Basic " + btoa(`${env.B2_APPLICATION_KEY_ID}:${env.B2_APPLICATION_KEY}`);
  const authResponse = await fetch("https://api.backblazeb2.com/b2api/v2/b2_authorize_account", {
    headers: { Authorization: authHeader }
  });
  
  const authData = await authResponse.json();
  if (!authResponse.ok) {
    throw new Error(`Backblaze Auth failed: ${JSON.stringify(authData)}`);
  }

  const { apiUrl, authorizationToken } = authData;

  // Step B: Get Upload URL
  const uploadUrlResponse = await fetch(`${apiUrl}/b2api/v2/b2_get_upload_url`, {
    method: "POST",
    headers: {
      Authorization: authorizationToken,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ bucketId: env.B2_BUCKET_ID })
  });

  const uploadUrlData = await uploadUrlResponse.json();
  if (!uploadUrlResponse.ok) {
    throw new Error(`Backblaze Get Upload URL failed: ${JSON.stringify(uploadUrlData)}`);
  }

  const { uploadUrl, authorizationToken: uploadAuthToken } = uploadUrlData;

  // Step C: Upload File
  // B2 Native REST upload requires SHA-1 checksum
  const sha1 = await getSHA1(fileBody);
  
  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: uploadAuthToken,
      "X-Bz-File-Name": encodeURIComponent(filename),
      "Content-Type": "application/json",
      "X-Bz-Content-Sha1": sha1
    },
    body: fileBody
  });

  const uploadResult = await uploadResponse.json();
  if (!uploadResponse.ok) {
    throw new Error(`Backblaze File Upload failed: ${JSON.stringify(uploadResult)}`);
  }
  return uploadResult;
}

// Helper to compute SHA-1 hash for Backblaze validation
async function getSHA1(str) {
  const buffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-1", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}
