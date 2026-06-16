/* eslint-disable */
import fs from 'fs';
import path from 'path';

import readline from 'readline';

// Function to prompt user
function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans.trim());
    }));
}

// Parse .env manually to avoid extra dependencies
const envPath = path.resolve(process.cwd(), '.env');
if (!fs.existsSync(envPath)) {
    console.error("❌ .env file not found! Please create it first.");
    process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
        let val = match[2] || '';
        // Remove quotes if present
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        env[match[1]] = val.trim();
    }
});

let API_KEY = env.VITE_APPWRITE_API_KEY;
const ENDPOINT = env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = env.VITE_APPWRITE_PROJECT_ID;
const DATABASE_ID = env.VITE_APPWRITE_DATABASE_ID;

// ----- Automatic Storage Bucket Creation -----
const BUCKET_ID = env.VITE_APPWRITE_BUCKET_ID || 'images';
async function ensureBucketExists() {
    const url = `${ENDPOINT}/storage/buckets`;
    try {
        await callAPI(url, {
            method: 'POST',
            body: JSON.stringify({
                bucketId: BUCKET_ID,
                name: BUCKET_ID,
                permissions: [
                    'read("any")',
                    'write("any")'
                ]
            })
        });
        console.log(`   ✅ Storage bucket "${BUCKET_ID}" created successfully.`);
    } catch (err) {
        if (err.message.includes('already exists') || err.message.includes('Conflict')) {
            console.log(`   ℹ️ Storage bucket "${BUCKET_ID}" already exists.`);
        } else {
            console.error(`   ❌ Failed to create storage bucket: ${err.message}`);
        }
    }
}

// -------------------------------------------

if (!PROJECT_ID || !DATABASE_ID) {
    console.error("❌ VITE_APPWRITE_PROJECT_ID or VITE_APPWRITE_DATABASE_ID is missing in .env.");
    process.exit(1);
}

let headers = {};

// Define ALL collections and their schema attributes dynamically mapping .env values
const schema = [
    {
        id: env.VITE_APPWRITE_PRODUCTS_COLLECTION_ID || 'products',
        name: 'Products',
        attributes: [
            { key: 'name', type: 'string', size: 255, required: true },
            { key: 'price', type: 'string', size: 50, required: true },
            { key: 'front_image_link', type: 'string', size: 500, required: true },
            { key: 'description', type: 'string', size: 2000, required: false, default: '' },
            { key: 'category', type: 'string', size: 100, required: true },
            { key: 'tags', type: 'string', size: 100, required: false, array: true },
            { key: 'sizes', type: 'string', size: 50, required: false, array: true },
            { key: 'back_image_links', type: 'string', size: 500, required: false, array: true },
            { key: 'sizes_stock', type: 'string', size: 2000, required: false, default: '{}' },
            { key: 'tag', type: 'string', size: 100, required: false, default: '' },
            { key: 'discount_percent', type: 'integer', required: false, default: 0 },
            { key: 'color_group_id', type: 'string', size: 100, required: false, default: '' },
            { key: 'color_name', type: 'string', size: 100, required: false, default: '' },
            { key: 'color_hex', type: 'string', size: 50, required: false, default: '' },
            { key: 'fit_type', type: 'string', size: 100, required: false, default: '' },
            { key: 'fabric_gsm', type: 'string', size: 100, required: false, default: '' },
            { key: 'compare_at_price', type: 'integer', required: false, default: 0 },
            { key: 'is_featured', type: 'boolean', required: false, default: false },
            { key: 'is_vip_only', type: 'boolean', required: false, default: false },
            { key: 'total_sold', type: 'integer', required: false, default: 0 },
            { key: 'slug', type: 'string', size: 255, required: false, default: '' },
            { key: 'is_live', type: 'boolean', required: false, default: false }
        ]
    },
    {
        id: env.VITE_APPWRITE_CART_COLLECTION_ID || 'cart',
        name: 'Cart',
        attributes: [
            { key: 'userId', type: 'string', size: 255, required: true },
            { key: 'name', type: 'string', size: 255, required: true },
            { key: 'size', type: 'string', size: 50, required: true },
            { key: 'price', type: 'float', required: true },
            { key: 'quantity', type: 'integer', required: false, default: 1 },
            { key: 'subtotal', type: 'float', required: true },
            { key: 'product_id', type: 'string', size: 255, required: true },
            { key: 'product_Image', type: 'string', size: 500, required: true },
            { key: 'cart_status', type: 'string', size: 100, required: false, default: 'active' }
        ]
    },
    {
        id: env.VITE_APPWRITE_ORDERS_COLLECTION_ID || 'orders',
        name: 'Orders',
        attributes: [
            { key: 'userId', type: 'string', size: 255, required: true },
            { key: 'customerName', type: 'string', size: 255, required: true },
            { key: 'email', type: 'string', size: 255, required: true },
            { key: 'phone', type: 'string', size: 50, required: true },
            { key: 'address', type: 'string', size: 2000, required: true },
            { key: 'items', type: 'string', size: 8000, required: true },
            { key: 'total', type: 'float', required: true },
            { key: 'status', type: 'string', size: 100, required: false, default: 'PENDING' },
            { key: 'paymentMethod', type: 'string', size: 100, required: true },
            { key: 'paymentStatus', type: 'string', size: 100, required: false, default: 'PENDING' },
            { key: 'payment_status', type: 'string', size: 100, required: false, default: 'PENDING' },
            { key: 'paymentProvider', type: 'string', size: 100, required: false, default: 'NONE' },
            { key: 'couponApplied', type: 'string', size: 100, required: false, default: 'NONE' },
            { key: 'coupon_code', type: 'string', size: 100, required: false, default: 'NONE' },
            { key: 'discountAmount', type: 'float', required: false, default: 0 },
            { key: 'discount_amount', type: 'float', required: false, default: 0 },
            { key: 'discount_applied', type: 'string', size: 100, required: false, default: 'false' },
            { key: 'razorpayOrderId', type: 'string', size: 255, required: false, default: '' },
            { key: 'razorpay_order_id', type: 'string', size: 255, required: false, default: '' },
            { key: 'razorpayPaymentId', type: 'string', size: 255, required: false, default: '' },
            { key: 'razorpay_payment_id', type: 'string', size: 255, required: false, default: '' },
            { key: 'order_number', type: 'string', size: 100, required: false, default: '' },
            { key: 'tracking_number', type: 'string', size: 100, required: false, default: '' },
            { key: 'tracking_url', type: 'string', size: 500, required: false, default: '' },
            { key: 'tax_amount', type: 'float', required: false, default: 0 },
            { key: 'subtotal', type: 'float', required: false, default: 0 },
            { key: 'shipping_charge', type: 'float', required: false, default: 0 }
        ]
    },
    {
        id: env.VITE_APPWRITE_WISHLIST_COLLECTION_ID || 'wishlist',
        name: 'Wishlist',
        attributes: [
            { key: 'userId', type: 'string', size: 255, required: true },
            { key: 'productId', type: 'string', size: 255, required: true }
        ]
    },
    {
        id: env.VITE_APPWRITE_COUPON_USAGE_COLLECTION_ID || 'coupon_usage',
        name: 'Coupon Usage',
        attributes: [
            { key: 'userId', type: 'string', size: 255, required: true },
            { key: 'couponCode', type: 'string', size: 100, required: true },
            { key: 'usedCount', type: 'integer', required: false, default: 1 },
            { key: 'lastUsedAt', type: 'string', size: 100, required: false }
        ]
    },
    {
        id: env.VITE_APPWRITE_RESTOCK_NOTIFICATION_COLLECTION_ID || 'restock_notifications',
        name: 'Restock Notifications',
        attributes: [
            { key: 'email', type: 'string', size: 255, required: true },
            { key: 'productId', type: 'string', size: 255, required: true },
            { key: 'size', type: 'string', size: 20, required: true },
            { key: 'notified', type: 'boolean', required: false, default: false },
            { key: 'requestedAt', type: 'string', size: 100, required: false }
        ]
    },
    {
        id: env.VITE_APPWRITE_REVIEWS_COLLECTION_ID || 'reviews',
        name: 'Reviews',
        attributes: [
            { key: 'productId', type: 'string', size: 255, required: true },
            { key: 'userId', type: 'string', size: 255, required: true },
            { key: 'userName', type: 'string', size: 255, required: false, default: 'Anonymous' },
            { key: 'rating', type: 'string', size: 20, required: true, default: '5' },
            { key: 'comment', type: 'string', size: 4000, required: true },
            { key: 'title', type: 'string', size: 255, required: false, default: '' },
            { key: 'images', type: 'string', size: 500, required: false, array: true },
            { key: 'is_verified_purchase', type: 'boolean', required: false, default: false }
        ]
    },
    {
        id: env.VITE_APPWRITE_ADDRESSES_COLLECTION_ID || 'addresses',
        name: 'Addresses',
        attributes: [
            { key: 'userId', type: 'string', size: 255, required: true },
            { key: 'customerName', type: 'string', size: 255, required: true },
            { key: 'phone', type: 'string', size: 50, required: true },
            { key: 'addressLine', type: 'string', size: 2000, required: true },
            { key: 'city', type: 'string', size: 255, required: true },
            { key: 'pincode', type: 'string', size: 50, required: true },
            { key: 'state', type: 'string', size: 100, required: false, default: '' },
            { key: 'country', type: 'string', size: 100, required: false, default: 'India' },
            { key: 'is_default', type: 'boolean', required: false, default: false }
        ]
    },
    {
        id: env.VITE_APPWRITE_COUPONS_COLLECTION_ID || 'coupons_',
        name: 'Coupons',
        attributes: [
            { key: 'code', type: 'string', size: 100, required: true },
            { key: 'discount', type: 'integer', required: true },
            { key: 'coupon_usage', type: 'string', size: 255, required: false, default: '' },
            { key: 'min_order_value', type: 'float', required: false, default: 0 },
            { key: 'valid_until', type: 'string', size: 100, required: false, default: '' }
        ]
    },
    {
        id: env.VITE_APPWRITE_SETTINGS_COLLECTION_ID || 'settings',
        name: 'Settings',
        attributes: [
            { key: 'announcementText', type: 'string', size: 2000, required: true }
        ]
    },
    {
        id: env.VITE_APPWRITE_SEARCH_LOGS_COLLECTION_ID || 'search_logs',
        name: 'Search Logs',
        attributes: [
            { key: 'query', type: 'string', size: 255, required: true },
            { key: 'results_count', type: 'integer', required: true },
            { key: 'userId', type: 'string', size: 255, required: false, default: 'GUEST' },
            { key: 'searched_at', type: 'string', size: 100, required: false }
        ]
    },
    {
        id: env.VITE_APPWRITE_NEWSLETTER_COLLECTION_ID || 'newsletter',
        name: 'Newsletter',
        attributes: [
            { key: 'email', type: 'string', size: 255, required: true },
            { key: 'subscribedAt', type: 'string', size: 100, required: false }
        ]
    },
    {
        id: env.VITE_APPWRITE_SLIDES_COLLECTION_ID || 'slides',
        name: 'Slides',
        attributes: [
            { key: 'image', type: 'string', size: 500, required: true },
            { key: 'mobileImage', type: 'string', size: 500, required: false, default: '' },
            { key: 'link', type: 'string', size: 500, required: false, default: '' }
        ]
    },
    {
        id: env.VITE_APPWRITE_OFFERS_COLLECTION_ID || 'offers',
        name: 'Offers',
        attributes: [
            { key: 'name', type: 'string', size: 255, required: true },
            { key: 'qty', type: 'integer', required: true },
            { key: 'price', type: 'integer', required: true },
            { key: 'is_active', type: 'boolean', required: false, default: true },
            { key: 'productIds', type: 'string', size: 255, required: false, array: true },
            { key: 'category', type: 'string', size: 100, required: false, default: '' },
            { key: 'tag', type: 'string', size: 100, required: false, default: '' }
        ]
    },
    {
        id: env.VITE_APPWRITE_WALLET_COLLECTION_ID || 'wallet',
        name: 'Wallet',
        attributes: [
            { key: 'userId', type: 'string', size: 255, required: true },
            { key: 'amount', type: 'float', required: true },
            { key: 'type', type: 'string', size: 50, required: true },
            { key: 'title', type: 'string', size: 255, required: true },
            { key: 'referenceId', type: 'string', size: 255, required: false, default: '' }
        ]
    },
    {
        id: env.VITE_APPWRITE_CATEGORY_CONFIGS_COLLECTION_ID || 'category_configs',
        name: 'Category Configs',
        attributes: [
            { key: 'category', type: 'string', size: 255, required: true },
            { key: 'imageUrl', type: 'string', size: 500, required: false, default: '' },
            { key: 'isDeleted', type: 'boolean', required: false, default: false }
        ]
    }
];

// Helper to make fetch calls
async function callAPI(url, options = {}) {
    const res = await fetch(url, {
        ...options,
        headers: { ...headers, ...options.headers }
    });
    const json = await res.json();
    if (!res.ok) {
        throw new Error(json.message || `HTTP ${res.status}`);
    }
    return json;
}

// Check attribute progress helper
async function waitForAttributeReady(collectionId, attributeKey) {
    const url = `${ENDPOINT}/databases/${DATABASE_ID}/collections/${collectionId}/attributes/${attributeKey}`;
    for (let i = 0; i < 30; i++) {
        try {
            const attr = await callAPI(url);
            if (attr.status === 'available') {
                return;
            }
        } catch {}
        await new Promise(r => setTimeout(r, 1000));
    }
    throw new Error(`Attribute ${attributeKey} creation timed out`);
}

async function run() {
    if (!API_KEY) {
        console.log("\n==================================================================");
        console.log("🔑 Appwrite API Key is required to dynamically create columns!");
        console.log("To create one:");
        console.log("1. Open your Appwrite Cloud Console: https://cloud.appwrite.io/");
        console.log("2. Navigate to your Project -> Overview -> Settings -> API Keys (at bottom).");
        console.log("3. Click 'Add API Key', give it a name (e.g., 'Antigravity Setup').");
        console.log("4. Check 'Database' and 'Collections' permissions.");
        console.log("5. Copy the secret key.");
        console.log("==================================================================\n");
        
        API_KEY = await askQuestion("👉 Paste your Appwrite API Key here: ");
        if (!API_KEY) {
            console.error("❌ API Key cannot be empty. Exiting.");
            process.exit(1);
        }
        
        try {
            fs.appendFileSync(envPath, `\nVITE_APPWRITE_API_KEY="${API_KEY}"\n`);
            console.log("💾 API Key saved to your .env file for future executions.");
        } catch (e) {
            console.warn("⚠️ Could not write API Key to .env file:", e.message);
        }
    }

    headers = {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': PROJECT_ID,
        'X-Appwrite-Key': API_KEY
    };

    console.log("⚡ Starting Appwrite Automatic Schema Deployment Protocol...");
    console.log(`📡 Connection URL: ${ENDPOINT}`);
    console.log(`🔒 Project ID: ${PROJECT_ID}`);
    console.log(`🗃️ Database ID: ${DATABASE_ID}\n`);

    // Ensure storage bucket is created
    console.log("📦 Verifying storage bucket configuration...");
    await ensureBucketExists();
    console.log("");

    for (const coll of schema) {
        console.log(`🛠️ Processing collection: "${coll.name}" (${coll.id})...`);
        
        // 1. Create Collection
        let created = false;
        try {
            await callAPI(`${ENDPOINT}/databases/${DATABASE_ID}/collections`, {
                method: 'POST',
                body: JSON.stringify({
                    collectionId: coll.id,
                    name: coll.name,
                    permissions: [
                        'create("any")',
                        'read("any")',
                        'update("any")',
                        'delete("any")'
                    ]
                })
            });
            console.log(`   ✅ Collection created successfully.`);
            created = true;
        } catch (err) {
            if (err.message.includes('already exists')) {
                console.log(`   ℹ️ Collection already exists. Appending attributes.`);
            } else {
                console.error(`   ❌ Failed to create collection: ${err.message}`);
                continue;
            }
        }

        // Wait slightly for collection registry to settle
        if (created) await new Promise(r => setTimeout(r, 2000));

        // 2. Add attributes one by one
        for (const attr of coll.attributes) {
            const attrUrl = `${ENDPOINT}/databases/${DATABASE_ID}/collections/${coll.id}/attributes`;
            try {
                let body = {
                    key: attr.key,
                    required: attr.required
                };
                if (attr.default !== undefined) body.default = attr.default;
                if (attr.array !== undefined) body.array = attr.array;

                let endpointSuffix = '';
                if (attr.type === 'string') {
                    body.size = attr.size;
                    endpointSuffix = '/string';
                } else if (attr.type === 'integer') {
                    endpointSuffix = '/integer';
                } else if (attr.type === 'boolean') {
                    endpointSuffix = '/boolean';
                } else if (attr.type === 'float') {
                    endpointSuffix = '/float';
                }

                await callAPI(attrUrl + endpointSuffix, {
                    method: 'POST',
                    body: JSON.stringify(body)
                });
                console.log(`   ⏳ Creating attribute "${attr.key}"...`);
                await waitForAttributeReady(coll.id, attr.key);
                console.log(`   ✅ Attribute "${attr.key}" is ready.`);
            } catch (err) {
                if (err.message.includes('already exists') || err.message.includes('Conflict')) {
                    console.log(`   ℹ️ Attribute "${attr.key}" already exists.`);
                } else {
                    console.error(`   ❌ Attribute "${attr.key}" error: ${err.message}`);
                }
            }
        }
        console.log(`\n🎉 Collection "${coll.name}" setup complete.\n`);
    }

    console.log("🚀 Database Schema Synchronization Completed Successfully!");
}

run().catch(err => {
    console.error("\n❌ Setup crashed:", err.message);
});
