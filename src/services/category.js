import { ID, Databases, Query } from "../firebase/adapter.js";
import { client } from "./client";
import { conf } from "./conf/conf";
import { fixLegacyWorkerUrl } from "../utils/imageOptimizer.js";

export class CategoryService {
    databases;

    constructor() {
        this.databases = new Databases(client);
    }

    // Get all category configs
    async getCategoryConfigs() {
        try {
            if (!conf.firebaseCategoryConfigsCollectionId) {
                return [];
            }
            const response = await this.databases.listDocuments(
                conf.firebaseDatabaseId,
                conf.firebaseCategoryConfigsCollectionId,
                [Query.limit(100)]
            );
            return (response.documents || []).map(cfg => {
                if (cfg.imageUrl) cfg.imageUrl = fixLegacyWorkerUrl(cfg.imageUrl);
                return cfg;
            });
        } catch (error) {
            console.error("Firebase service :: getCategoryConfigs :: error", error.message);
            return [];
        }
    }

    // Get config for a specific category
    async getCategoryConfig(category) {
        try {
            if (!conf.firebaseCategoryConfigsCollectionId) {
                return null;
            }
            const cleanCategory = category.trim().toLowerCase();
            const response = await this.databases.listDocuments(
                conf.firebaseDatabaseId,
                conf.firebaseCategoryConfigsCollectionId,
                [Query.equal("category", cleanCategory), Query.limit(1)]
            );
            if (response.documents && response.documents.length > 0) {
                const cfg = response.documents[0];
                if (cfg.imageUrl) cfg.imageUrl = fixLegacyWorkerUrl(cfg.imageUrl);
                return cfg;
            }
            return null;
        } catch (error) {
            console.error("Firebase service :: getCategoryConfig :: error", error.message);
            return null;
        }
    }

    // Save or update cover image for a category
    async saveCategoryImage(category, imageUrl) {
        try {
            if (!conf.firebaseCategoryConfigsCollectionId) {
                throw new Error("firebaseCategoryConfigsCollectionId is not configured.");
            }
            const cleanCategory = category.trim().toLowerCase();
            const existing = await this.getCategoryConfig(cleanCategory);
            
            if (existing) {
                return await this.databases.updateDocument(
                    conf.firebaseDatabaseId,
                    conf.firebaseCategoryConfigsCollectionId,
                    existing.$id,
                    { imageUrl: imageUrl.trim() }
                );
            } else {
                return await this.databases.createDocument(
                    conf.firebaseDatabaseId,
                    conf.firebaseCategoryConfigsCollectionId,
                    ID.unique(),
                    { 
                        category: cleanCategory, 
                        imageUrl: imageUrl.trim(),
                        isDeleted: false
                    }
                );
            }
        } catch (error) {
            console.error("Firebase service :: saveCategoryImage :: error", error.message);
            throw error;
        }
    }

    // Delete (hide) a category
    async deleteCategory(category) {
        try {
            if (!conf.firebaseCategoryConfigsCollectionId) {
                throw new Error("firebaseCategoryConfigsCollectionId is not configured.");
            }
            const cleanCategory = category.trim().toLowerCase();
            const existing = await this.getCategoryConfig(cleanCategory);
            
            if (existing) {
                return await this.databases.updateDocument(
                    conf.firebaseDatabaseId,
                    conf.firebaseCategoryConfigsCollectionId,
                    existing.$id,
                    { isDeleted: true }
                );
            } else {
                return await this.databases.createDocument(
                    conf.firebaseDatabaseId,
                    conf.firebaseCategoryConfigsCollectionId,
                    ID.unique(),
                    { 
                        category: cleanCategory, 
                        imageUrl: "",
                        isDeleted: true
                    }
                );
            }
        } catch (error) {
            console.error("Firebase service :: deleteCategory :: error", error.message);
            throw error;
        }
    }

    // Restore category (set isDeleted to false)
    async restoreCategory(category) {
        try {
            if (!conf.firebaseCategoryConfigsCollectionId) {
                throw new Error("firebaseCategoryConfigsCollectionId is not configured.");
            }
            const cleanCategory = category.trim().toLowerCase();
            const existing = await this.getCategoryConfig(cleanCategory);
            
            if (existing) {
                return await this.databases.updateDocument(
                    conf.firebaseDatabaseId,
                    conf.firebaseCategoryConfigsCollectionId,
                    existing.$id,
                    { isDeleted: false }
                );
            }
        } catch (error) {
            console.error("Firebase service :: restoreCategory :: error", error.message);
            throw error;
        }
    }

    // Restore all deleted categories
    async restoreAllCategories() {
        try {
            if (!conf.firebaseCategoryConfigsCollectionId) {
                throw new Error("firebaseCategoryConfigsCollectionId is not configured.");
            }
            const configs = await this.getCategoryConfigs();
            const deletedConfigs = configs.filter(c => c.isDeleted);
            await Promise.all(
                deletedConfigs.map(doc =>
                    this.databases.updateDocument(
                        conf.firebaseDatabaseId,
                        conf.firebaseCategoryConfigsCollectionId,
                        doc.$id,
                        { isDeleted: false }
                    )
                )
            );
            return true;
        } catch (error) {
            console.error("Firebase service :: restoreAllCategories :: error", error.message);
            throw error;
        }
    }

    // Rename a category config slug
    async renameCategoryConfig(oldSlug, newSlug) {
        try {
            if (!conf.firebaseCategoryConfigsCollectionId) {
                throw new Error("firebaseCategoryConfigsCollectionId is not configured.");
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
                    conf.firebaseDatabaseId,
                    conf.firebaseCategoryConfigsCollectionId,
                    existingOld.$id
                );

                if (existingNew) {
                    // Update new config document
                    await this.databases.updateDocument(
                        conf.firebaseDatabaseId,
                        conf.firebaseCategoryConfigsCollectionId,
                        existingNew.$id,
                        { 
                            imageUrl: imageUrl || existingNew.imageUrl,
                            isDeleted: isDeleted || existingNew.isDeleted
                        }
                    );
                } else {
                    // Create new config document
                    await this.databases.createDocument(
                        conf.firebaseDatabaseId,
                        conf.firebaseCategoryConfigsCollectionId,
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
            console.error("Firebase service :: renameCategoryConfig :: error", error.message);
            throw error;
        }
    }
}

const categoryService = new CategoryService();
export default categoryService;
