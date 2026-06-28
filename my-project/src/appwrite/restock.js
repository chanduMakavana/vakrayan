import { ID, Databases, Query } from "appwrite";
import { client } from "./client";
import { conf } from "./conf/conf";

export class RestockService {
    databases;

    constructor() {
        this.databases = new Databases(client);
    }

    // Capture customer request for size restocking
    async requestRestockNotification(email, productId, size) {
        try {
            if (!email || !productId || !size || !conf.appwriteRestockCollectionId) {
                console.warn("⚠️ appwriteRestockCollectionId or inputs missing. Skipping database save.");
                return null;
            }

            const cleanEmail = email.trim().toLowerCase();

            // Check if there is an existing, unresolved restock alert for this email + productId + size
            let isAlreadyRegistered = false;
            try {
                const response = await this.databases.listDocuments(
                    conf.appwriteDatabaseId,
                    conf.appwriteRestockCollectionId,
                    [
                        Query.equal("email", cleanEmail),
                        Query.equal("productId", productId),
                        Query.equal("size", size),
                        Query.equal("notified", false)
                    ]
                );
                if (response.documents && response.documents.length > 0) {
                    isAlreadyRegistered = true;
                }
            } catch {
                // Fallback: list documents and filter locally if indexes are not configured
                try {
                    const response = await this.databases.listDocuments(
                        conf.appwriteDatabaseId,
                        conf.appwriteRestockCollectionId,
                        [Query.limit(100)]
                    );
                    const match = response.documents.find(doc => 
                        doc.email === cleanEmail && 
                        doc.productId === productId && 
                        doc.size === size && 
                        doc.notified === false
                    );
                    if (match) {
                        isAlreadyRegistered = true;
                    }
                } catch (innerError) {
                    console.warn("⚠️ Appwrite check failed, checking local fallback:", innerError.message);
                }
            }

            if (isAlreadyRegistered) {
                throw new Error(`You have already registered a restock alert for size ${size}.`);
            }

            return await this.databases.createDocument(
                conf.appwriteDatabaseId,
                conf.appwriteRestockCollectionId,
                ID.unique(),
                {
                    email: cleanEmail,
                    productId,
                    size,
                    notified: false,
                    requestedAt: new Date().toISOString()
                }
            );
        } catch (error) {
            console.error("Appwrite service :: requestRestockNotification :: error", error.message);
            throw error;
        }
    }

    // Retrieve all restock notifications requests for admin analytics
    async getRestockNotifications() {
        try {
            if (!conf.appwriteRestockCollectionId) return [];
            const response = await this.databases.listDocuments(
                conf.appwriteDatabaseId,
                conf.appwriteRestockCollectionId
            );
            return response.documents;
        } catch (error) {
            console.error("Appwrite service :: getRestockNotifications :: error", error.message);
            return [];
        }
    }

    // Delete a restock notification request by ID
    async deleteRestockNotification(documentId) {
        try {
            if (!conf.appwriteRestockCollectionId) return null;
            return await this.databases.deleteDocument(
                conf.appwriteDatabaseId,
                conf.appwriteRestockCollectionId,
                documentId
            );
        } catch (error) {
            console.error("Appwrite service :: deleteRestockNotification :: error", error.message);
            throw error;
        }
    }

    // Update a restock notification request (e.g. to mark as notified)
    async updateRestockNotification(documentId, data) {
        try {
            if (!conf.appwriteRestockCollectionId) return null;
            return await this.databases.updateDocument(
                conf.appwriteDatabaseId,
                conf.appwriteRestockCollectionId,
                documentId,
                data
            );
        } catch (error) {
            console.error("Appwrite service :: updateRestockNotification :: error", error.message);
            throw error;
        }
    }
}

const restockService = new RestockService();
export default restockService;
