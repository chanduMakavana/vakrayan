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
}

const restockService = new RestockService();
export default restockService;
