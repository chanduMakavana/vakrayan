import { ID, Databases, Query } from "../firebase/adapter.js";
import { client } from "./client";
import { conf } from "./conf/conf";

export class SlidesService {
    databases;

    constructor() {
        this.databases = new Databases(client);
    }

    // Retrieve all active hero slides
    async getSlides() {
        try {
            if (!conf.firebaseSlidesCollectionId) return [];
            const response = await this.databases.listDocuments(
                conf.firebaseDatabaseId,
                conf.firebaseSlidesCollectionId,
                [Query.orderDesc("$createdAt")]
            );
            return response.documents || [];
        } catch (error) {
            console.error("Firebase service :: getSlides :: error", error.message);
            return [];
        }
    }

    // Create a new slide
    async createSlide(data) {
        try {
            if (!conf.firebaseSlidesCollectionId) throw new Error("Slides Collection ID is missing.");
            return await this.databases.createDocument(
                conf.firebaseDatabaseId,
                conf.firebaseSlidesCollectionId,
                ID.unique(),
                data
            );
        } catch (error) {
            console.error("Firebase service :: createSlide :: error", error.message);
            throw error;
        }
    }

    // Delete an existing slide document
    async deleteSlide(documentId) {
        try {
            if (!conf.firebaseSlidesCollectionId) throw new Error("Slides Collection ID is missing.");
            await this.databases.deleteDocument(
                conf.firebaseDatabaseId,
                conf.firebaseSlidesCollectionId,
                documentId
            );
            return true;
        } catch (error) {
            console.error("Firebase service :: deleteSlide :: error", error.message);
            throw error;
        }
    }
}

const slidesService = new SlidesService();
export default slidesService;
