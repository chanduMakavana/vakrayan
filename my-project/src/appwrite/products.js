import { Client, ID, Databases, Query } from "appwrite";
import { conf } from "./conf/conf";

export class ProductsService {
    client = new Client();
    databases;

    constructor() {
        this.client
            .setEndpoint(conf.appwriteurl)
            .setProject(conf.appwriteProjectId);
        this.databases = new Databases(this.client);
    }

    // Create a new product entry
    async createProduct(data) {
        try {
            return await this.databases.createDocument(
                conf.appwriteDatabaseId,
                conf.appwriteProductsCollectionId,
                ID.unique(),
                data
            );
        }
        catch (error) {
            console.error("Appwrite service :: createProduct :: error", error.message);
            throw error;
        }
    }

    // Retrieve all available products (max 100 — add cursor pagination when catalog exceeds this)
    async getProducts() {
        try {
            const response = await this.databases.listDocuments(
                conf.appwriteDatabaseId,
                conf.appwriteProductsCollectionId,
                [
                    Query.orderDesc("$createdAt"),
                    Query.limit(100) // Explicit cap — Appwrite defaults silently to 25
                ]
            );
            return response.documents;
        }
        catch (error) {
            console.error("Appwrite service :: getProducts :: error", error.message);
            throw error;
        }
    }

    // Update an existing product document
    async updateProduct(documentId, data) {
        try {
            return await this.databases.updateDocument(
                conf.appwriteDatabaseId,
                conf.appwriteProductsCollectionId,
                documentId,
                data
            );
        } catch (error) {
            console.error("Appwrite service :: updateProduct :: error", error.message);
            throw error;
        }
    }

    // Delete a product document
    async deleteProduct(documentId) {
        try {
            await this.databases.deleteDocument(
                conf.appwriteDatabaseId,
                conf.appwriteProductsCollectionId,
                documentId
            );
            return true; // Success validation flag
        } catch (error) {
            console.error("Appwrite service :: deleteProduct :: error", error.message);
            throw error;
        }
    }
    // Retrieve details for a specific product by ID
    async getProductById(documentId) {
        try {
            return await this.databases.getDocument(
                conf.appwriteDatabaseId,
                conf.appwriteProductsCollectionId,
                documentId
            );
        } catch (error) {
            console.error("Appwrite service :: getProductById :: error", error.message);
            throw error;
        }
    }

    // Retrieve details for a specific product by slug or ID
    async getProductBySlugOrId(idOrSlug) {
        try {
            // First try listing documents by slug
            const response = await this.databases.listDocuments(
                conf.appwriteDatabaseId,
                conf.appwriteProductsCollectionId,
                [
                    Query.equal('slug', idOrSlug),
                    Query.limit(1)
                ]
            );
            if (response.documents && response.documents.length > 0) {
                return response.documents[0];
            }
            // Fallback to getProductById
            return await this.getProductById(idOrSlug);
        } catch (error) {
            console.warn("Slug lookup failed, falling back to ID lookup:", error.message);
            try {
                return await this.getProductById(idOrSlug);
            } catch {
                throw error;
            }
        }
    }

    // Log query search analytics for marketing insight
    async logSearch(query, resultsCount, userId) {
        const payload = {
            query: String(query).trim(),
            results_count: Number(resultsCount),
            userId: userId || 'GUEST',
            searched_at: new Date().toISOString()
        };
        try {
            const collectionId = import.meta.env.VITE_APPWRITE_SEARCH_LOGS_COLLECTION_ID || 'search_logs';
            return await this.databases.createDocument(
                conf.appwriteDatabaseId,
                collectionId,
                ID.unique(),
                payload
            );
        } catch (error) {
            console.warn("Appwrite search logs collection unavailable. Storing locally.", error.message);
            const logs = JSON.parse(localStorage.getItem('search_logs')) || [];
            logs.push(payload);
            localStorage.setItem('search_logs', JSON.stringify(logs));
            return payload;
        }
    }
}

const productsService = new ProductsService();
export default productsService;