import { ID, Databases, Query } from "../firebase/adapter.js";
import { client } from "./client";
import { conf } from "./conf/conf";

export class WishlistService {
    databases;

    constructor() {
        this.databases = new Databases(client);
    }

    // Get all wishlist documents for a specific user
    async getUserWishlist(userId) {
        try {
            if (!userId || !conf.firebaseWishlistCollectionId) return [];
            const response = await this.databases.listDocuments(
                conf.firebaseDatabaseId,
                conf.firebaseWishlistCollectionId,
                [Query.equal("userId", userId)]
            );
            return response.documents;
        } catch (error) {
            console.error("Firebase service :: getUserWishlist :: error", error.message);
            return [];
        }
    }

    // Add a single item to the cloud wishlist
    async addToWishlist(userId, productId) {
        try {
            if (!userId || !productId || !conf.firebaseWishlistCollectionId) return null;
            
            // Check if item already exists in cloud
            const existing = await this.databases.listDocuments(
                conf.firebaseDatabaseId,
                conf.firebaseWishlistCollectionId,
                [Query.equal("userId", userId), Query.equal("productId", productId)]
            );
            if (existing.documents.length > 0) {
                return existing.documents[0];
            }

            return await this.databases.createDocument(
                conf.firebaseDatabaseId,
                conf.firebaseWishlistCollectionId,
                ID.unique(),
                {
                    userId,
                    productId
                }
            );
        } catch (error) {
            console.error("Firebase service :: addToWishlist :: error", error.message);
            return null;
        }
    }

    // Remove a single item from the cloud wishlist
    async removeFromWishlist(userId, productId) {
        try {
            if (!userId || !productId || !conf.firebaseWishlistCollectionId) return false;
            const response = await this.databases.listDocuments(
                conf.firebaseDatabaseId,
                conf.firebaseWishlistCollectionId,
                [Query.equal("userId", userId), Query.equal("productId", productId)]
            );
            if (response.documents.length > 0) {
                await this.databases.deleteDocument(
                    conf.firebaseDatabaseId,
                    conf.firebaseWishlistCollectionId,
                    response.documents[0].$id
                );
                return true;
            }
            return false;
        } catch (error) {
            console.error("Firebase service :: removeFromWishlist :: error", error.message);
            return false;
        }
    }

    // Sync local storage wishlist to the cloud, merging both directions
    async syncWishlist(userId, localItems) {
        try {
            if (!userId || !conf.firebaseWishlistCollectionId) return localItems;
            
            const cloudDocs = await this.getUserWishlist(userId);
            const cloudProductIds = cloudDocs.map(doc => doc.productId);
            
            // 1. Upload local items that are missing in the cloud
            for (const item of localItems) {
                const itemId = item.$id || item.id;
                if (itemId && !cloudProductIds.includes(itemId)) {
                    await this.addToWishlist(userId, itemId);
                }
            }

            // 2. Fetch updated cloud wishlist and merge back to local structure format
            const finalCloudDocs = await this.getUserWishlist(userId);
            return finalCloudDocs;
        } catch (error) {
            console.error("Firebase service :: syncWishlist :: error", error.message);
            return localItems;
        }
    }
}

const wishlistService = new WishlistService();
export default wishlistService;
