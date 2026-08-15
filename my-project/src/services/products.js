import { ID, Databases, Query } from "../firebase/adapter.js";
import { client } from "./client";
import { conf } from "./conf/conf";
import { fixLegacyWorkerUrl } from "../utils/imageOptimizer.js";

const sanitizeProduct = (p) => {
    if (!p) return p;
    if (p.front_image_link) p.front_image_link = fixLegacyWorkerUrl(p.front_image_link);
    if (p.image_url) p.image_url = fixLegacyWorkerUrl(p.image_url);
    if (p.image) p.image = fixLegacyWorkerUrl(p.image);
    if (Array.isArray(p.back_image_links)) {
        p.back_image_links = p.back_image_links.map(fixLegacyWorkerUrl);
    }
    if (p.size_chart_image) p.size_chart_image = fixLegacyWorkerUrl(p.size_chart_image);
    return p;
};

export class ProductsService {
    databases;

    constructor() {
        this.databases = new Databases(client);
    }

    // Create a new product entry
    async createProduct(data) {
        try {
            return await this.databases.createDocument(
                conf.firebaseDatabaseId,
                conf.firebaseProductsCollectionId,
                ID.unique(),
                data
            );
        }
        catch (error) {
            console.error("Firebase service :: createProduct :: error", error.message);
            throw error;
        }
    }

    _getProductsPromise = null;

    // Retrieve all available products (max 100 — add cursor pagination when catalog exceeds this)
    async getProducts() {
        if (this._getProductsPromise) {
            return this._getProductsPromise;
        }

        this._getProductsPromise = (async () => {
            try {
                const response = await this.databases.listDocuments(
                    conf.firebaseDatabaseId,
                    conf.firebaseProductsCollectionId,
                    [
                        Query.orderDesc("$createdAt"),
                        Query.limit(500) // Raised from 100 to prevent silent catalog truncation
                    ]
                );
                return (response.documents || []).map(sanitizeProduct);
            }
            catch (error) {
                console.error("Firebase service :: getProducts :: error", error.message);
                throw error;
            }
            finally {
                this._getProductsPromise = null;
            }
        })();

        return this._getProductsPromise;
    }

    // Update an existing product document
    async updateProduct(documentId, data) {
        try {
            return await this.databases.updateDocument(
                conf.firebaseDatabaseId,
                conf.firebaseProductsCollectionId,
                documentId,
                data
            );
        } catch (error) {
            console.error("Firebase service :: updateProduct :: error", error.message);
            throw error;
        }
    }

    // Delete a product document
    async deleteProduct(documentId) {
        try {
            await this.databases.deleteDocument(
                conf.firebaseDatabaseId,
                conf.firebaseProductsCollectionId,
                documentId
            );
            return true; // Success validation flag
        } catch (error) {
            console.error("Firebase service :: deleteProduct :: error", error.message);
            throw error;
        }
    }
    // Retrieve details for a specific product by ID
    async getProductById(documentId) {
        try {
            const product = await this.databases.getDocument(
                conf.firebaseDatabaseId,
                conf.firebaseProductsCollectionId,
                documentId
            );
            return sanitizeProduct(product);
        } catch (error) {
            console.error("Firebase service :: getProductById :: error", error.message);
            throw error;
        }
    }

    // Retrieve details for a specific product by slug or ID
    async getProductBySlugOrId(idOrSlug) {
        try {
            // First try listing documents by slug
            const response = await this.databases.listDocuments(
                conf.firebaseDatabaseId,
                conf.firebaseProductsCollectionId,
                [
                    Query.equal('slug', idOrSlug),
                    Query.limit(1)
                ]
            );
            if (response.documents && response.documents.length > 0) {
                return sanitizeProduct(response.documents[0]);
            }
            // Fallback to getProductById
            const fallbackProd = await this.getProductById(idOrSlug);
            return sanitizeProduct(fallbackProd);
        } catch (error) {
            console.warn("Slug lookup failed, falling back to ID lookup:", error.message);
            try {
                const fallbackProd = await this.getProductById(idOrSlug);
                return sanitizeProduct(fallbackProd);
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
            const collectionId = import.meta.env.VITE_FIREBASE_SEARCH_LOGS_COLLECTION_ID || import.meta.env.VITE_APPWRITE_SEARCH_LOGS_COLLECTION_ID || 'search_logs';
            return await this.databases.createDocument(
                conf.firebaseDatabaseId,
                collectionId,
                ID.unique(),
                payload
            );
        } catch (error) {
            console.warn("Firebase search logs collection unavailable. Storing locally.", error.message);
            const logs = JSON.parse(localStorage.getItem('search_logs')) || [];
            logs.push(payload);
            localStorage.setItem('search_logs', JSON.stringify(logs));
            return payload;
        }
    }
}

const productsService = new ProductsService();
export default productsService;