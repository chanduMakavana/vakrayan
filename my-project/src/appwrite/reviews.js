import { Client, ID, Databases, Query } from "appwrite";
import { conf } from "./conf/conf";

export class ReviewsService {
    client = new Client();
    databases;

    constructor() {
        this.client
            .setEndpoint(conf.appwriteurl)
            .setProject(conf.appwriteProjectId);
        this.databases = new Databases(this.client);
    }

    // Helper: Local fallback reviews getter
    getLocalReviews(productId) {
        return JSON.parse(localStorage.getItem(`productReviews_${productId}`)) || [];
    }

    // Helper: Local fallback reviews setter
    saveLocalReview(productId, review) {
        const local = this.getLocalReviews(productId);
        local.unshift(review);
        localStorage.setItem(`productReviews_${productId}`, JSON.stringify(local));
        return review;
    }

    // ➡️ 1. Fetch reviews for a specific product
    async getReviewsByProductId(productId) {
        try {
            if (!productId) return [];
            if (!conf.appwriteReviewsCollectionId) {
                return this.getLocalReviews(productId);
            }
            const response = await this.databases.listDocuments(
                conf.appwriteDatabaseId,
                conf.appwriteReviewsCollectionId,
                [
                    Query.equal("productId", productId),
                    Query.orderDesc("$createdAt")
                ]
            );
            
            if (response.documents && response.documents.length > 0) {
                return response.documents;
            }
            return this.getLocalReviews(productId);
        } catch (error) {
            console.warn("⚠️ Appwrite Reviews unavailable. Reading reviews locally.", error.message);
            return this.getLocalReviews(productId);
        }
    }

    // ➡️ 2. Save a new product review
    async createReview({ productId, userId, userName, rating, comment }) {
        const payload = {
            productId: String(productId).trim(),
            userId: String(userId).trim(),
            userName: String(userName || 'Anonymous').trim(),
            rating: String(rating), // saved as String to match text attribute in DB
            comment: String(comment || '').trim()
        };

        try {
            if (!conf.appwriteReviewsCollectionId) {
                throw new Error("appwriteReviewsCollectionId is missing.");
            }
            return await this.databases.createDocument(
                conf.appwriteDatabaseId,
                conf.appwriteReviewsCollectionId,
                ID.unique(),
                payload
            );
        } catch (error) {
            console.warn("⚠️ Appwrite Reviews offline. Saving review in local sandbox.", error.message);
            const mockDoc = {
                $id: 'rev-' + Date.now(),
                $createdAt: new Date().toISOString(),
                ...payload
            };
            return this.saveLocalReview(productId, mockDoc);
        }
    }
}

const reviewsService = new ReviewsService();
export default reviewsService;
