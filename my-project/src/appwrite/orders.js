import { Client, ID, Databases, Query } from "appwrite";
import { conf } from "./conf/conf";

export class OrdersService {
    client = new Client();
    databases;

    constructor() {
        this.client
            .setEndpoint(conf.appwriteurl)
            .setProject(conf.appwriteProjectId);
        this.databases = new Databases(this.client);
    }

    // ➡️ 1. Create a new customer order entry
    async createOrder(data) {
        try {
            if (!conf.appwriteOrdersCollectionId) {
                console.warn("⚠️ appwriteOrdersCollectionId is missing. Skipping database push.");
                return null;
            }
            return await this.databases.createDocument(
                conf.appwriteDatabaseId,
                conf.appwriteOrdersCollectionId,
                ID.unique(),
                data
            );
        }
        catch (error) {
            console.error("Appwrite service :: createOrder :: error", error.message);
            throw error;
        }
    }

    // ➡️ 2. Retrieve all active orders (For Admin Dashboard)
    async getOrders() {
        try {
            if (!conf.appwriteOrdersCollectionId) return [];
            const response = await this.databases.listDocuments(
                conf.appwriteDatabaseId,
                conf.appwriteOrdersCollectionId,
                [
                    Query.orderDesc("$createdAt") // Show newest orders first
                ]
            );
            return response.documents;
        }
        catch (error) {
            console.error("Appwrite service :: getOrders :: error", error.message);
            throw error;
        }
    }

    // ➡️ 3. Retrieve orders for a specific user (For User Order History dashboard)
    async getUserOrders(userId) {
        try {
            if (!userId) return [];
            if (!conf.appwriteOrdersCollectionId) {
                const localOrders = JSON.parse(localStorage.getItem('ordersData')) || [];
                return localOrders.filter(o => o.userId === userId);
            }
            const response = await this.databases.listDocuments(
                conf.appwriteDatabaseId,
                conf.appwriteOrdersCollectionId,
                [
                    Query.equal("userId", userId),
                    Query.orderDesc("$createdAt")
                ]
            );
            
            const dbOrders = response.documents || [];
            const localOrders = JSON.parse(localStorage.getItem('ordersData')) || [];
            const matchedLocal = localOrders.filter(o => o.userId === userId);

            const seenIds = new Set();
            const merged = [];

            dbOrders.forEach(o => {
                const id = o.$id || o.id;
                if (id) seenIds.add(id);
                merged.push(o);
            });

            matchedLocal.forEach(o => {
                const id = o.$id || o.id;
                if (id && !seenIds.has(id)) {
                    merged.push(o);
                } else if (!id) {
                    merged.push(o);
                }
            });

            merged.sort((a, b) => new Date(b.$createdAt || b.createdAt || 0) - new Date(a.$createdAt || a.createdAt || 0));
            return merged;
        }
        catch (error) {
            console.error("Appwrite service :: getUserOrders :: error", error.message);
            const localOrders = JSON.parse(localStorage.getItem('ordersData')) || [];
            return localOrders.filter(o => o.userId === userId);
        }
    }

    // ➡️ 4. Update the order delivery status
    async updateOrderStatus(documentId, status) {
        try {
            if (!conf.appwriteOrdersCollectionId) return null;
            return await this.databases.updateDocument(
                conf.appwriteDatabaseId,
                conf.appwriteOrdersCollectionId,
                documentId,
                {
                    status
                }
            );
        } catch (error) {
            console.error("Appwrite service :: updateOrderStatus :: error", error.message);
            throw error;
        }
    }

    // ➡️ 5. Retrieve details for a specific order by ID
    async getOrderById(documentId) {
        try {
            if (!documentId) return null;
            if (!conf.appwriteOrdersCollectionId || documentId.startsWith('ORD-')) {
                const localOrders = JSON.parse(localStorage.getItem('ordersData')) || [];
                return localOrders.find(o => o.$id === documentId || o.id === documentId) || null;
            }
            return await this.databases.getDocument(
                conf.appwriteDatabaseId,
                conf.appwriteOrdersCollectionId,
                documentId
            );
        } catch (error) {
            console.error("Appwrite service :: getOrderById :: error", error.message);
            const localOrders = JSON.parse(localStorage.getItem('ordersData')) || [];
            return localOrders.find(o => o.$id === documentId || o.id === documentId) || null;
        }
    }
}

const ordersService = new OrdersService();
export default ordersService;
