
export const conf = {
    appwriteurl: String(import.meta.env.VITE_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1").trim(),
    appwriteProjectId: String(import.meta.env.VITE_APPWRITE_PROJECT_ID || "").trim(),
    appwriteDatabaseId: String(import.meta.env.VITE_APPWRITE_DATABASE_ID || "").trim(),
    appwriteProductsCollectionId: String(import.meta.env.VITE_APPWRITE_PRODUCTS_COLLECTION_ID || "").trim(),
    appwriteCartCollectionId: String(import.meta.env.VITE_APPWRITE_CART_COLLECTION_ID || "").trim(),
    appwriteOrdersCollectionId: String(import.meta.env.VITE_APPWRITE_ORDERS_COLLECTION_ID || "").trim(),
    appwriteCouponsCollectionId: String(import.meta.env.VITE_APPWRITE_COUPONS_COLLECTION_ID || "").trim(),
    appwriteCampaignsCollectionId: String(import.meta.env.VITE_APPWRITE_CAMPAIGNS_COLLECTION_ID || "").trim(),
    appwriteAddressesCollectionId: String(import.meta.env.VITE_APPWRITE_ADDRESSES_COLLECTION_ID || "").trim(),
    // Fixed: removed REVIWES typo fallback — use only the correctly-spelled env var
    appwriteReviewsCollectionId: String(import.meta.env.VITE_APPWRITE_REVIEWS_COLLECTION_ID || "").trim(),
    appwriteSettingsCollectionId: String(import.meta.env.VITE_APPWRITE_SETTINGS_COLLECTION_ID || "").trim(),
    // Fixed: fallback was "wishlist" / "coupon_usage" / "restock_notifications" (wrong collection IDs)
    // Empty string correctly triggers the guard checks in each service: if (!conf.appwriteXCollectionId) return
    appwriteWishlistCollectionId: String(import.meta.env.VITE_APPWRITE_WISHLIST_COLLECTION_ID || "").trim(),
    appwriteCouponUsageCollectionId: String(import.meta.env.VITE_APPWRITE_COUPON_USAGE_COLLECTION_ID || "").trim(),
    appwriteRestockCollectionId: String(import.meta.env.VITE_APPWRITE_RESTOCK_COLLECTION_ID || "").trim(),
    appwriteSlidesCollectionId: String(import.meta.env.VITE_APPWRITE_SLIDES_COLLECTION_ID || "slides").trim(),
    appwriteOffersCollectionId: String(import.meta.env.VITE_APPWRITE_OFFERS_COLLECTION_ID || "offers").trim(),
    appwriteWalletCollectionId: String(import.meta.env.VITE_APPWRITE_WALLET_COLLECTION_ID || "wallet").trim(),
    appwriteCategoryConfigsCollectionId: String(import.meta.env.VITE_APPWRITE_CATEGORY_CONFIGS_COLLECTION_ID || "category_configs").trim(),
    appwriteBucketId: String(import.meta.env.VITE_APPWRITE_BUCKET_ID || "images").trim(),
    appwriteApiKey: String(import.meta.env.VITE_APPWRITE_API_KEY || "").trim(),
    appwriteCloudflareWorkerUrl: String(import.meta.env.VITE_CLOUDFLARE_WORKER_URL || "").trim(),
}