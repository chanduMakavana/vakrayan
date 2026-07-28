/**
 * Firebase to Backblaze B2 Automatic Backup Script
 * 
 * Dependencies to install:
 * npm install firebase-admin @aws-sdk/client-s3
 */

const admin = require("firebase-admin");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const fs = require("fs");
const path = require("path");

// Load local .env if it exists (for local testing without pushing to GitHub)
try {
  const envPath = path.join(__dirname, "../.env");
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf-8");
    envConfig.split("\n").forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = (match[2] || "").trim();
        // Remove quotes if present
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        if (!process.env[key]) process.env[key] = value;
      }
    });
  }
} catch (err) {
  console.warn("Could not load local .env file:", err.message);
}

// 1. Initialize Firebase Admin SDK
// You can use a local JSON file or pass credentials via Environment Variables (recommended for GitHub Actions)
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  try {
    serviceAccount = require("../serviceAccountKey.json");
  } catch (err) {
    console.error("❌ Firebase service account key not found. Put 'serviceAccountKey.json' in the root or set FIREBASE_SERVICE_ACCOUNT env var.");
    process.exit(1);
  }
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// 2. Initialize Backblaze B2 S3 Client
const b2KeyId = process.env.B2_APPLICATION_KEY_ID;
const b2AppKey = process.env.B2_APPLICATION_KEY;
const b2Endpoint = process.env.B2_ENDPOINT; // e.g., 'https://s3.us-east-005.backblazeb2.com'
const b2BucketName = process.env.B2_BUCKET_NAME;

if (!b2KeyId || !b2AppKey || !b2Endpoint || !b2BucketName) {
  console.error("❌ Missing Backblaze B2 environment variables: B2_APPLICATION_KEY_ID, B2_APPLICATION_KEY, B2_ENDPOINT, B2_BUCKET_NAME");
  process.exit(1);
}

const s3Client = new S3Client({
  endpoint: b2Endpoint,
  region: "us-east-1", // Backblaze uses a dummy region like us-east-1 or similar
  credentials: {
    accessKeyId: b2KeyId,
    secretAccessKey: b2AppKey
  }
});

// Helper to upload a file to Backblaze B2
async function uploadToB2(localFilePath, remoteFileName) {
  const fileContent = fs.readFileSync(localFilePath);
  const params = {
    Bucket: b2BucketName,
    Key: remoteFileName,
    Body: fileContent,
    ContentType: "application/json"
  };

  try {
    await s3Client.send(new PutObjectCommand(params));
    console.log(`✓ Uploaded ${remoteFileName} successfully to Backblaze B2!`);
  } catch (error) {
    console.error(`❌ Error uploading ${remoteFileName} to B2:`, error);
    throw error;
  }
}

// 3. Backup Firestore Collections
async function backupFirestore() {
  console.log("🔄 Starting Firestore Backup...");
  const collections = ["users", "orders", "products"]; // Add any other collections you want to back up
  const backupData = {};

  for (const collectionName of collections) {
    const snapshot = await db.collection(collectionName).get();
    const collectionData = {};
    snapshot.forEach(doc => {
      collectionData[doc.id] = doc.data();
    });
    backupData[collectionName] = collectionData;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const localPath = path.join(__dirname, `firestore_backup_${timestamp}.json`);
  
  fs.writeFileSync(localPath, JSON.stringify(backupData, null, 2));
  console.log(`✓ Created local Firestore backup: ${localPath}`);
  
  // Upload to Backblaze
  const remoteName = `firestore/backup_${timestamp}.json`;
  await uploadToB2(localPath, remoteName);
  
  // Clean up local file
  fs.unlinkSync(localPath);
}

// 4. Backup Auth Users
async function backupAuthUsers() {
  console.log("🔄 Starting Firebase Auth Users Backup...");
  const users = [];
  
  async function listAllUsers(nextPageToken) {
    const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
    listUsersResult.users.forEach(userRecord => {
      users.push(userRecord.toJSON());
    });
    if (listUsersResult.pageToken) {
      await listAllUsers(listUsersResult.pageToken);
    }
  }

  await listAllUsers();

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const localPath = path.join(__dirname, `auth_users_backup_${timestamp}.json`);
  
  fs.writeFileSync(localPath, JSON.stringify(users, null, 2));
  console.log(`✓ Created local Auth backup: ${localPath}`);

  // Upload to Backblaze
  const remoteName = `auth/users_backup_${timestamp}.json`;
  await uploadToB2(localPath, remoteName);

  // Clean up local file
  fs.unlinkSync(localPath);
}

// Run Main Backup Process
async function runBackup() {
  try {
    await backupFirestore();
    await backupAuthUsers();
    console.log("🎉 Firebase Daily Backup to Backblaze Completed Successfully!");
  } catch (error) {
    console.error("💥 Backup job failed:", error);
    process.exit(1);
  }
}

runBackup();
