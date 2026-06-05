import { Client, ID, Databases, Query } from "appwrite";
import { conf } from "./conf/conf";

export class SlidesService {
    client = new Client();
    databases;

    constructor() {
        this.client
            .setEndpoint(conf.appwriteurl)
            .setProject(conf.appwriteProjectId);
        this.databases = new Databases(this.client);
    }

    // Retrieve all active hero slides
    async getSlides() {
        try {
            if (!conf.appwriteSlidesCollectionId) return [];
            const response = await this.databases.listDocuments(
                conf.appwriteDatabaseId,
                conf.appwriteSlidesCollectionId,
                [Query.orderDesc("$createdAt")]
            );
            return response.documents || [];
        } catch (error) {
            console.error("Appwrite service :: getSlides :: error", error.message);
            return [];
        }
    }

    // Create a new slide
    async createSlide(data) {
        try {
            if (!conf.appwriteSlidesCollectionId) throw new Error("Slides Collection ID is missing.");
            return await this.databases.createDocument(
                conf.appwriteDatabaseId,
                conf.appwriteSlidesCollectionId,
                ID.unique(),
                data
            );
        } catch (error) {
            console.error("Appwrite service :: createSlide :: error", error.message);
            throw error;
        }
    }

    // Delete an existing slide document
    async deleteSlide(documentId) {
        try {
            if (!conf.appwriteSlidesCollectionId) throw new Error("Slides Collection ID is missing.");
            await this.databases.deleteDocument(
                conf.appwriteDatabaseId,
                conf.appwriteSlidesCollectionId,
                documentId
            );
            return true;
        } catch (error) {
            console.error("Appwrite service :: deleteSlide :: error", error.message);
            throw error;
        }
    }
}

const slidesService = new SlidesService();
export default slidesService;
