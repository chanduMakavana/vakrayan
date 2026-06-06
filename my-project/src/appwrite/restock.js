import { Client, ID, Databases } from "appwrite";
import { conf } from "./conf/conf";

export class RestockService {
    client = new Client();
    databases;

    constructor() {
        this.client
            .setEndpoint(conf.appwriteurl)
            .setProject(conf.appwriteProjectId);
        this.databases = new Databases(this.client);
    }

    // Capture customer request for size restocking
    async requestRestockNotification(email, productId, size) {
        try {
            if (!email || !productId || !size || !conf.appwriteRestockCollectionId) {
                console.warn("⚠️ appwriteRestockCollectionId or inputs missing. Skipping database save.");
                return null;
            }

            return await this.databases.createDocument(
                conf.appwriteDatabaseId,
                conf.appwriteRestockCollectionId,
                ID.unique(),
                {
                    email: email.trim().toLowerCase(),
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
