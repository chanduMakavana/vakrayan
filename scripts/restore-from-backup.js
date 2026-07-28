/**
 * Firebase Firestore JSON Restore Script
 * 
 * This script imports a JSON backup file back into Firebase Firestore.
 * 
 * Usage:
 * 1. Make sure you have 'serviceAccountKey.json' in your project root.
 * 2. Run:
 *    node scripts/restore-from-backup.js ./scripts/firestore_backup_xxxx.json
 */

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// Check for backup file argument
const backupFilePath = process.argv[2];
if (!backupFilePath) {
  console.error("❌ Please provide the path to your backup JSON file.");
  console.error("Example: node scripts/restore-from-backup.js ./scripts/firestore_backup_2026-06-30.json");
  process.exit(1);
}

const resolvedPath = path.resolve(backupFilePath);
if (!fs.existsSync(resolvedPath)) {
  console.error(`❌ Backup file not found at: ${resolvedPath}`);
  process.exit(1);
}

// 1. Initialize Firebase Admin SDK
let serviceAccount;
try {
  serviceAccount = require("../serviceAccountKey.json");
} catch (err) {
  console.error("❌ Firebase service account key ('serviceAccountKey.json') not found in project root.");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// 2. Read and Parse Backup JSON
console.log(`📖 Reading backup file: ${resolvedPath}...`);
const backupRaw = fs.readFileSync(resolvedPath, "utf-8");
const backupData = JSON.parse(backupRaw);

// 3. Restore Data to Firestore
async function restoreBackup() {
  try {
    const collections = Object.keys(backupData);
    console.log(`🚀 Found collections in backup: [${collections.join(", ")}]. Starting restore...`);

    for (const colName of collections) {
      const documents = backupData[colName];
      const docIds = Object.keys(documents);
      console.log(`📁 Restoring collection '${colName}' (${docIds.length} documents)...`);

      // Use Firestore Batched Writes (max 500 operations per batch)
      let batch = db.batch();
      let opCount = 0;

      for (const docId of docIds) {
        const docData = documents[docId];
        const docRef = db.collection(colName).doc(docId);
        
        batch.set(docRef, docData);
        opCount++;

        // Commit batch if it reaches the 500 limit
        if (opCount === 500) {
          console.log(`⏳ Committing batch of 500 documents to '${colName}'...`);
          await batch.commit();
          batch = db.batch();
          opCount = 0;
        }
      }

      // Commit remaining documents in batch
      if (opCount > 0) {
        console.log(`⏳ Committing final ${opCount} documents to '${colName}'...`);
        await batch.commit();
      }

      console.log(`✓ Collection '${colName}' restored successfully!`);
    }

    console.log("🎉 Database Restore Completed Successfully!");
  } catch (error) {
    console.error("💥 Restore failed:", error);
    process.exit(1);
  }
}

restoreBackup();
