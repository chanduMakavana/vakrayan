import { ID, Databases, Query } from "../firebase/adapter.js";
import { client } from "./client";
import { conf } from "./conf/conf";

export class OffersService {
    databases;

    constructor() {
        this.databases = new Databases(client);
    }

    getLocalOffers() {
        try {
            return JSON.parse(localStorage.getItem('shop_offers')) || [];
        } catch {
            return [];
        }
    }

    saveLocalOffers(offers) {
        localStorage.setItem('shop_offers', JSON.stringify(offers));
    }

    async getOffers() {
        try {
            if (!conf.firebaseOffersCollectionId) {
                return this.getLocalOffers();
            }
            const response = await this.databases.listDocuments(
                conf.firebaseDatabaseId,
                conf.firebaseOffersCollectionId,
                [Query.orderDesc("$createdAt")]
            );
            return response.documents || [];
        } catch (error) {
            console.warn("OffersService :: getOffers :: database offline/error, using local offers", error.message);
            return this.getLocalOffers();
        }
    }

    async createOffer(data) {
        const payload = {
            name: data.name,
            qty: Number(data.qty),
            price: Number(data.price),
            is_active: data.is_active !== false,
            productIds: data.productIds || [],
            category: data.category || '',
            tag: data.tag || ''
        };

        try {
            if (!conf.firebaseOffersCollectionId) {
                throw new Error("firebaseOffersCollectionId is missing.");
            }
            return await this.databases.createDocument(
                conf.firebaseDatabaseId,
                conf.firebaseOffersCollectionId,
                ID.unique(),
                payload
            );
        } catch (error) {
            console.warn("OffersService :: createOffer :: database error, fallback to local storage", error.message);
            const local = this.getLocalOffers();
            const newDoc = {
                $id: 'local-' + Date.now(),
                $createdAt: new Date().toISOString(),
                ...payload
            };
            local.push(newDoc);
            this.saveLocalOffers(local);
            return newDoc;
        }
    }

    async updateOffer(documentId, data) {
        const payload = {};
        if (data.name !== undefined) payload.name = data.name;
        if (data.qty !== undefined) payload.qty = Number(data.qty);
        if (data.price !== undefined) payload.price = Number(data.price);
        if (data.is_active !== undefined) payload.is_active = !!data.is_active;
        if (data.productIds !== undefined) payload.productIds = data.productIds;
        if (data.category !== undefined) payload.category = data.category;
        if (data.tag !== undefined) payload.tag = data.tag;

        try {
            if (!conf.firebaseOffersCollectionId) {
                throw new Error("firebaseOffersCollectionId is missing.");
            }
            return await this.databases.updateDocument(
                conf.firebaseDatabaseId,
                conf.firebaseOffersCollectionId,
                documentId,
                payload
            );
        } catch (error) {
            console.warn("OffersService :: updateOffer :: database error, fallback to local storage", error.message);
            const local = this.getLocalOffers();
            const idx = local.findIndex(o => o.$id === documentId);
            if (idx !== -1) {
                local[idx] = { ...local[idx], ...payload };
                this.saveLocalOffers(local);
                return local[idx];
            }
            throw error;
        }
    }

    async deleteOffer(documentId) {
        try {
            if (!conf.firebaseOffersCollectionId) {
                throw new Error("firebaseOffersCollectionId is missing.");
            }
            await this.databases.deleteDocument(
                conf.firebaseDatabaseId,
                conf.firebaseOffersCollectionId,
                documentId
            );
            return true;
        } catch (error) {
            console.warn("OffersService :: deleteOffer :: database error, fallback to local storage", error.message);
            const local = this.getLocalOffers();
            const filtered = local.filter(o => o.$id !== documentId);
            this.saveLocalOffers(filtered);
            return true;
        }
    }
}

const offersService = new OffersService();
export default offersService;
