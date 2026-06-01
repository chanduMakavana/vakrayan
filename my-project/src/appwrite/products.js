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

    // Retrieve all available products
    async getProducts() {
        try {
            const response = await this.databases.listDocuments(
                conf.appwriteDatabaseId,
                conf.appwriteProductsCollectionId,
                [
                    Query.orderDesc("$createdAt") // Order by creation date descending to show new items first
                ]
            );
            return response.documents; // Returns raw array safely
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
}

const productsService = new ProductsService();
export default productsService;