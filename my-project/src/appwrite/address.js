import { Client, ID, Databases, Query } from "appwrite";
import { conf } from "./conf/conf";

export class AddressService {
    client = new Client();
    databases;

    constructor() {
        this.client
            .setEndpoint(conf.appwriteurl)
            .setProject(conf.appwriteProjectId);
        this.databases = new Databases(this.client);
    }

    // Helper: Local fallback address getter
    getLocalAddress(userId) {
        return JSON.parse(localStorage.getItem(`userAddress_${userId}`)) || null;
    }

    // Helper: Local fallback address setter
    saveLocalAddress(userId, data) {
        localStorage.setItem(`userAddress_${userId}`, JSON.stringify(data));
        return data;
    }

    // ➡️ 1. Get saved address for a user
    async getUserAddress(userId) {
        try {
            if (!userId) return null;
            if (!conf.appwriteAddressesCollectionId) {
                return this.getLocalAddress(userId);
            }
            
            const response = await this.databases.listDocuments(
                conf.appwriteDatabaseId,
                conf.appwriteAddressesCollectionId,
                [
                    Query.equal("userId", userId),
                    Query.limit(1)
                ]
            );

            if (response.documents && response.documents.length > 0) {
                return response.documents[0];
            }
            return this.getLocalAddress(userId);
        } catch (error) {
            console.warn("⚠️ Appwrite Addresses unavailable. Reading address locally.", error.message);
            return this.getLocalAddress(userId);
        }
    }

    // ➡️ 2. Save or Update address for a user
    async saveAddress(userId, addressData) {
        if (!userId) return null;
        
        const payload = {
            userId: userId,
            customerName: String(addressData.name || '').trim(),
            phone: String(addressData.phone || '').trim(),
            addressLine: String(addressData.address || '').trim(),
            city: String(addressData.city || '').trim(),
            pincode: String(addressData.pincode || '').trim()
        };

        try {
            if (!conf.appwriteAddressesCollectionId) {
                return this.saveLocalAddress(userId, payload);
            }

            // Check if address already exists in DB
            const response = await this.databases.listDocuments(
                conf.appwriteDatabaseId,
                conf.appwriteAddressesCollectionId,
                [
                    Query.equal("userId", userId),
                    Query.limit(1)
                ]
            );

            if (response.documents && response.documents.length > 0) {
                // Update existing address
                const docId = response.documents[0].$id;
                return await this.databases.updateDocument(
                    conf.appwriteDatabaseId,
                    conf.appwriteAddressesCollectionId,
                    docId,
                    payload
                );
            } else {
                // Create a new address document
                return await this.databases.createDocument(
                    conf.appwriteDatabaseId,
                    conf.appwriteAddressesCollectionId,
                    ID.unique(),
                    payload
                );
            }
        } catch (error) {
            console.warn("⚠️ Appwrite Addresses offline. Saving address in local sandbox.", error.message);
            return this.saveLocalAddress(userId, payload);
        }
    }
}

const addressService = new AddressService();
export default addressService;
