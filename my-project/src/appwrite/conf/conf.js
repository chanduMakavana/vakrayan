

export const conf ={
    appwriteurl: String(import.meta.env.VITE_APPWRITE_ENDPOINT),
    appwriteProjectId: String(import.meta.env.VITE_APPWRITE_PROJECT_ID),
    appwriteDatabaseId: String(import.meta.env.VITE_APPWRITE_DATABASE_ID),
    appwriteProductsCollectionId: String(import.meta.env.VITE_APPWRITE_PRODUCTS_COLLECTION_ID),
    appwriteCartCollectionId: String(import.meta.env.VITE_APPWRITE_CART_COLLECTION_ID),
    
}