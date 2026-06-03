/* eslint-disable */
import fs from 'fs';
import path from 'path';

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

const API_KEY = env.VITE_APPWRITE_API_KEY;
const ENDPOINT = env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = env.VITE_APPWRITE_PROJECT_ID;
const DATABASE_ID = env.VITE_APPWRITE_DATABASE_ID;

if (!API_KEY) {
    console.error("❌ VITE_APPWRITE_API_KEY is missing in your .env file! Please follow Step 1.");
    process.exit(1);
}
if (!PROJECT_ID || !DATABASE_ID) {
    console.error("❌ VITE_APPWRITE_PROJECT_ID or VITE_APPWRITE_DATABASE_ID is missing in .env.");
    process.exit(1);
}

const headers = {
    'Content-Type': 'application/json',
    'X-Appwrite-Project': PROJECT_ID,
    'X-Appwrite-Key': API_KEY
};

// Define ALL 10 collections and their schema attributes dynamically mapping .env values
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
            { key: 'fabric_gsm', type: 'string', size: 100, required: false, default: '' }
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
            { key: 'razorpay_payment_id', type: 'string', size: 255, required: false, default: '' }
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
            { key: 'comment', type: 'string', size: 4000, required: true }
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
            { key: 'pincode', type: 'string', size: 50, required: true }
        ]
    },
    {
        id: env.VITE_APPWRITE_COUPONS_COLLECTION_ID || 'coupons_',
        name: 'Coupons',
        attributes: [
            { key: 'code', type: 'string', size: 100, required: true },
            { key: 'discount', type: 'integer', required: true },
            { key: 'coupon_usage', type: 'string', size: 255, required: false, default: '' }
        ]
    },
    {
        id: env.VITE_APPWRITE_SETTINGS_COLLECTION_ID || 'settings',
        name: 'Settings',
        attributes: [
            { key: 'announcementText', type: 'string', size: 2000, required: true }
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
    console.log("⚡ Starting Appwrite Automatic Schema Deployment Protocol...");
    console.log(`📡 Connection URL: ${ENDPOINT}`);
    console.log(`🔒 Project ID: ${PROJECT_ID}`);
    console.log(`🗃️ Database ID: ${DATABASE_ID}\n`);

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
