import { Client, ID, Databases, Query } from "appwrite";
import { conf } from "./conf/conf";

export class CategoryService {
    client = new Client();
    databases;

    constructor() {
        this.client
            .setEndpoint(conf.appwriteurl)
            .setProject(conf.appwriteProjectId);
        this.databases = new Databases(this.client);
    }

    // Get all category configs
    async getCategoryConfigs() {
        try {
            if (!conf.appwriteCategoryConfigsCollectionId) {
                return [];
            }
            const response = await this.databases.listDocuments(
                conf.appwriteDatabaseId,
                conf.appwriteCategoryConfigsCollectionId,
                [Query.limit(100)]
            );
            return response.documents || [];
        } catch (error) {
            console.error("Appwrite service :: getCategoryConfigs :: error", error.message);
            return [];
        }
    }

    // Get config for a specific category
    async getCategoryConfig(category) {
        try {
            if (!conf.appwriteCategoryConfigsCollectionId) {
                return null;
            }
            const cleanCategory = category.trim().toLowerCase();
            const response = await this.databases.listDocuments(
                conf.appwriteDatabaseId,
                conf.appwriteCategoryConfigsCollectionId,
                [Query.equal("category", cleanCategory), Query.limit(1)]
            );
            if (response.documents && response.documents.length > 0) {
                return response.documents[0];
            }
            return null;
        } catch (error) {
            console.error("Appwrite service :: getCategoryConfig :: error", error.message);
            return null;
        }
    }

    // Save or update cover image for a category
    async saveCategoryImage(category, imageUrl) {
        try {
            if (!conf.appwriteCategoryConfigsCollectionId) {
                throw new Error("appwriteCategoryConfigsCollectionId is not configured.");
            }
            const cleanCategory = category.trim().toLowerCase();
            const existing = await this.getCategoryConfig(cleanCategory);
            
            if (existing) {
                return await this.databases.updateDocument(
                    conf.appwriteDatabaseId,
                    conf.appwriteCategoryConfigsCollectionId,
                    existing.$id,
                    { imageUrl: imageUrl.trim() }
                );
            } else {
                return await this.databases.createDocument(
                    conf.appwriteDatabaseId,
                    conf.appwriteCategoryConfigsCollectionId,
                    ID.unique(),
                    { 
                        category: cleanCategory, 
                        imageUrl: imageUrl.trim(),
                        isDeleted: false
                    }
                );
            }
        } catch (error) {
            console.error("Appwrite service :: saveCategoryImage :: error", error.message);
            throw error;
        }
    }

    // Delete (hide) a category
    async deleteCategory(category) {
        try {
            if (!conf.appwriteCategoryConfigsCollectionId) {
                throw new Error("appwriteCategoryConfigsCollectionId is not configured.");
            }
            const cleanCategory = category.trim().toLowerCase();
            const existing = await this.getCategoryConfig(cleanCategory);
            
            if (existing) {
                return await this.databases.updateDocument(
                    conf.appwriteDatabaseId,
                    conf.appwriteCategoryConfigsCollectionId,
                    existing.$id,
                    { isDeleted: true }
                );
            } else {
                return await this.databases.createDocument(
                    conf.appwriteDatabaseId,
                    conf.appwriteCategoryConfigsCollectionId,
                    ID.unique(),
                    { 
                        category: cleanCategory, 
                        imageUrl: "",
                        isDeleted: true
                    }
                );
            }
        } catch (error) {
            console.error("Appwrite service :: deleteCategory :: error", error.message);
            throw error;
        }
    }

    // Restore category (set isDeleted to false)
    async restoreCategory(category) {
        try {
            if (!conf.appwriteCategoryConfigsCollectionId) {
                throw new Error("appwriteCategoryConfigsCollectionId is not configured.");
            }
            const cleanCategory = category.trim().toLowerCase();
            const existing = await this.getCategoryConfig(cleanCategory);
            
            if (existing) {
                return await this.databases.updateDocument(
                    conf.appwriteDatabaseId,
                    conf.appwriteCategoryConfigsCollectionId,
                    existing.$id,
                    { isDeleted: false }
                );
            }
        } catch (error) {
            console.error("Appwrite service :: restoreCategory :: error", error.message);
            throw error;
        }
    }

    // Restore all deleted categories
    async restoreAllCategories() {
        try {
            if (!conf.appwriteCategoryConfigsCollectionId) {
                throw new Error("appwriteCategoryConfigsCollectionId is not configured.");
            }
            const configs = await this.getCategoryConfigs();
            const deletedConfigs = configs.filter(c => c.isDeleted);
            for (const doc of deletedConfigs) {
                await this.databases.updateDocument(
                    conf.appwriteDatabaseId,
                    conf.appwriteCategoryConfigsCollectionId,
                    doc.$id,
                    { isDeleted: false }
                );
            }
            return true;
        } catch (error) {
            console.error("Appwrite service :: restoreAllCategories :: error", error.message);
            throw error;
        }
    }

    // Rename a category config slug
    async renameCategoryConfig(oldSlug, newSlug) {
        try {
            if (!conf.appwriteCategoryConfigsCollectionId) {
                throw new Error("appwriteCategoryConfigsCollectionId is not configured.");
            }
            const cleanOld = oldSlug.trim().toLowerCase();
            const cleanNew = newSlug.trim().toLowerCase();
            
            const existingOld = await this.getCategoryConfig(cleanOld);
            const existingNew = await this.getCategoryConfig(cleanNew);

            if (existingOld) {
                const imageUrl = existingOld.imageUrl;
                const isDeleted = existingOld.isDeleted;
                
                // Delete old config document
                await this.databases.deleteDocument(
                    conf.appwriteDatabaseId,
                    conf.appwriteCategoryConfigsCollectionId,
                    existingOld.$id
                );

                if (existingNew) {
                    // Update new config document
                    await this.databases.updateDocument(
                        conf.appwriteDatabaseId,
                        conf.appwriteCategoryConfigsCollectionId,
                        existingNew.$id,
                        { 
                            imageUrl: imageUrl || existingNew.imageUrl,
                            isDeleted: isDeleted || existingNew.isDeleted
                        }
                    );
                } else {
                    // Create new config document
                    await this.databases.createDocument(
                        conf.appwriteDatabaseId,
                        conf.appwriteCategoryConfigsCollectionId,
                        ID.unique(),
                        {
                            category: cleanNew,
                            imageUrl,
                            isDeleted
                        }
                    );
                }
            }
        } catch (error) {
            console.error("Appwrite service :: renameCategoryConfig :: error", error.message);
            throw error;
        }
    }
}

const categoryService = new CategoryService();
export default categoryService;
