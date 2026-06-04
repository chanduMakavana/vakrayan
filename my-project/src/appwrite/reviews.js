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
            
            const onlineReviews = response.documents || [];
            const localReviews = this.getLocalReviews(productId) || [];

            // Deduplicate reviews by ID
            const seenIds = new Set();
            const merged = [];

            const getRevId = (r) => r.$id || r.id;

            for (const rev of onlineReviews) {
                const id = getRevId(rev);
                if (id) seenIds.add(id);
                merged.push(rev);
            }

            for (const rev of localReviews) {
                const id = getRevId(rev);
                if (!id || !seenIds.has(id)) {
                    if (id) seenIds.add(id);
                    merged.push(rev);
                }
            }

            // Sort by $createdAt descending
            merged.sort((a, b) => {
                const dateA = new Date(a.$createdAt || a.createdAt || 0);
                const dateB = new Date(b.$createdAt || b.createdAt || 0);
                return dateB - dateA;
            });

            return merged;
        } catch (error) {
            console.warn("⚠️ Appwrite Reviews unavailable. Reading reviews locally.", error.message);
            return this.getLocalReviews(productId);
        }
    }

    // ➡️ 2. Save a new product review
    async createReview({ productId, userId, userName, rating, comment, title = '', images = [], is_verified_purchase = false, fit = '', comfort = 0, quality = 0, breathable = 0 }) {
        const serializedComment = JSON.stringify({
            title: String(title).trim(),
            comment: String(comment || '').trim(),
            images: Array.isArray(images) ? images : [],
            is_verified_purchase: !!is_verified_purchase,
            fit: String(fit).trim(),
            comfort: Number(comfort) || 0,
            quality: Number(quality) || 0,
            breathable: Number(breathable) || 0
        });

        const payload = {
            productId: String(productId).trim(),
            userId: String(userId).trim(),
            userName: String(userName || 'Anonymous').trim(),
            rating: String(rating), // saved as String to match text attribute in DB
            comment: serializedComment
        };

        const extendedPayload = {
            ...payload,
            title: String(title).trim(),
            images: Array.isArray(images) ? JSON.stringify(images) : '[]',
            is_verified_purchase: !!is_verified_purchase
        };

        try {
            if (!conf.appwriteReviewsCollectionId) {
                throw new Error("appwriteReviewsCollectionId is missing.");
            }
            try {
                return await this.databases.createDocument(
                    conf.appwriteDatabaseId,
                    conf.appwriteReviewsCollectionId,
                    ID.unique(),
                    extendedPayload
                );
            } catch (err) {
                console.warn("Direct attributes missing from schema, writing to basic payload:", err.message);
                return await this.databases.createDocument(
                    conf.appwriteDatabaseId,
                    conf.appwriteReviewsCollectionId,
                    ID.unique(),
                    payload
                );
            }
        } catch (error) {
            console.warn("⚠️ Appwrite Reviews offline. Saving review in local sandbox.", error.message);
            const mockDoc = {
                $id: 'rev-' + Date.now(),
                $createdAt: new Date().toISOString(),
                ...extendedPayload,
                comment: serializedComment
            };
            return this.saveLocalReview(productId, mockDoc);
        }
    }
}

const reviewsService = new ReviewsService();
export default reviewsService;
