import { ID, Databases, Query } from "../firebase/adapter.js";
import { client } from "./client";
import { conf } from "./conf/conf";

export class CouponUsageService {
    databases;

    constructor() {
        this.databases = new Databases(client);
    }

    // Verify if a user has already redeemed a specific coupon code
    async checkCouponUsage(userId, couponCode) {
        try {
            if (!userId || !couponCode || !conf.firebaseCouponUsageCollectionId) return false;
            
            const response = await this.databases.listDocuments(
                conf.firebaseDatabaseId,
                conf.firebaseCouponUsageCollectionId,
                [
                    Query.equal("userId", userId),
                    Query.equal("couponCode", couponCode.trim().toUpperCase())
                ]
            );
            
            if (response.documents.length > 0) {
                // If it has been used at least once, return true
                return Number(response.documents[0].usedCount || 0) > 0;
            }
            return false;
        } catch (error) {
            if (error.message?.includes("Collection with the requested ID") || error.message?.includes("not be found")) {
                console.warn("⚠️ Firebase 'coupon_usage' collection has not been created yet in the database. Coupon validation is skipped.");
            } else {
                console.error("Firebase service :: checkCouponUsage :: error", error.message);
            }
            return false;
        }
    }

    // Log coupon usage upon successful transaction placement
    async logCouponUsage(userId, couponCode) {
        try {
            if (!userId || !couponCode || !conf.firebaseCouponUsageCollectionId) return null;
            
            const cleanedCode = couponCode.trim().toUpperCase();
            
            // Check if record exists
            const response = await this.databases.listDocuments(
                conf.firebaseDatabaseId,
                conf.firebaseCouponUsageCollectionId,
                [
                    Query.equal("userId", userId),
                    Query.equal("couponCode", cleanedCode)
                ]
            );

            if (response.documents.length > 0) {
                const doc = response.documents[0];
                return await this.databases.updateDocument(
                    conf.firebaseDatabaseId,
                    conf.firebaseCouponUsageCollectionId,
                    doc.$id,
                    {
                        usedCount: Number(doc.usedCount || 1) + 1,
                        lastUsedAt: new Date().toISOString()
                    }
                );
            } else {
                return await this.databases.createDocument(
                    conf.firebaseDatabaseId,
                    conf.firebaseCouponUsageCollectionId,
                    ID.unique(),
                    {
                        userId,
                        couponCode: cleanedCode,
                        usedCount: 1,
                        lastUsedAt: new Date().toISOString()
                    }
                );
            }
        } catch (error) {
            if (error.message?.includes("Collection with the requested ID") || error.message?.includes("not be found")) {
                console.warn("⚠️ Firebase 'coupon_usage' collection has not been created yet in the database. Coupon logging is skipped.");
            } else {
                console.error("Firebase service :: logCouponUsage :: error", error.message);
            }
        }
    }

    // Retrieve all coupon usage records for admin telemetry
    async getCouponUsages() {
        try {
            if (!conf.firebaseCouponUsageCollectionId) return [];
            const response = await this.databases.listDocuments(
                conf.firebaseDatabaseId,
                conf.firebaseCouponUsageCollectionId
            );
            return response.documents;
        } catch (error) {
            if (error.message?.includes("Collection with the requested ID") || error.message?.includes("not be found")) {
                console.warn("⚠️ Firebase 'coupon_usage' collection missing. Skipping coupon usages telemetry.");
            } else {
                console.error("Firebase service :: getCouponUsages :: error", error.message);
            }
            return [];
        }
    }
}

const couponUsageService = new CouponUsageService();
export default couponUsageService;
