

export const conf ={
    appwriteurl: String(import.meta.env.VITE_APPWRITE_ENDPOINT || "").trim(),
    appwriteProjectId: String(import.meta.env.VITE_APPWRITE_PROJECT_ID || "").trim(),
    appwriteDatabaseId: String(import.meta.env.VITE_APPWRITE_DATABASE_ID || "").trim(),
    appwriteProductsCollectionId: String(import.meta.env.VITE_APPWRITE_PRODUCTS_COLLECTION_ID || "").trim(),
    appwriteCartCollectionId: String(import.meta.env.VITE_APPWRITE_CART_COLLECTION_ID || "").trim(),
    appwriteOrdersCollectionId: String(import.meta.env.VITE_APPWRITE_ORDERS_COLLECTION_ID || "").trim(),
    appwriteCouponsCollectionId: String(import.meta.env.VITE_APPWRITE_COUPONS_COLLECTION_ID || "").trim(),
    appwriteCampaignsCollectionId: String(import.meta.env.VITE_APPWRITE_CAMPAIGNS_COLLECTION_ID || "").trim(),
    appwriteAddressesCollectionId: String(import.meta.env.VITE_APPWRITE_ADDRESSES_COLLECTION_ID || "").trim(),
    appwriteReviewsCollectionId: String(import.meta.env.VITE_APPWRITE_REVIEWS_COLLECTION_ID || import.meta.env.VITE_APPWRITE_REVIWES_COLLECTION_ID || "").trim(),
    appwriteSettingsCollectionId: String(import.meta.env.VITE_APPWRITE_SETTINGS_COLLECTION_ID || "").trim(),
}