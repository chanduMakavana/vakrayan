import { ID, Databases, Query } from "../firebase/adapter.js";
import { client } from "./client";
import { conf } from "./conf/conf";

export class AddressService {
    databases;

    constructor() {
        this.databases = new Databases(client);
    }

    // ✅ SECURITY FIX: Removed localStorage helpers for address data.
    // Customer PII (name, address, phone, pincode) must NEVER be cached in localStorage
    // as it is accessible to any JS on the page including third-party scripts.
    // Addresses are always fetched from Firebase DB on demand.

    /** @deprecated — localStorage address caching removed for security */
    getLocalAddress(_userId) { return null; }

    /** @deprecated — localStorage address caching removed for security */
    saveLocalAddress(_userId, data) { return data; }

    /** @deprecated — localStorage address caching removed for security */
    getLocalAddresses(_userId) { return []; }

    /** @deprecated — localStorage address caching removed for security */
    saveLocalAddresses(_userId, list) { return list; }


    // ➡️ 1. Get default saved address for a user
    async getUserAddress(userId) {
        try {
            if (!userId) return null;
            const all = await this.getUserAddresses(userId);
            if (all && all.length > 0) {
                // Return default, or first one
                return all.find(a => a.is_default === true || a.isDefault === true) || all[0];
            }
            return null;
        } catch (error) {
            console.warn("⚠️ Firebase Addresses unavailable.", error.message);
            return null;
        }
    }

    // ➡️ 2. Retrieve all saved addresses for a user
    async getUserAddresses(userId) {
        try {
            if (!userId) return [];
            if (!conf.firebaseAddressesCollectionId) {
                return this.getLocalAddresses(userId);
            }
            
            const response = await this.databases.listDocuments(
                conf.firebaseDatabaseId,
                conf.firebaseAddressesCollectionId,
                [
                    Query.equal("userId", userId),
                    Query.limit(50)
                ]
            );

            if (response.documents && response.documents.length > 0) {
                return response.documents;
            }
            return this.getLocalAddresses(userId);
        } catch (error) {
            console.warn("⚠️ Firebase Addresses unavailable. Reading addresses locally.", error.message);
            return this.getLocalAddresses(userId);
        }
    }

    // ➡️ 3. Save, Create or Update a specific address document
    async saveAddress(userId, addressData) {
        if (!userId) return null;

        const isDefault = addressData.is_default !== undefined ? !!addressData.is_default : false;

        const stateVal = String(addressData.state || 'Other').trim();
        const countryVal = String(addressData.country || 'India').trim();

        // Build addressLine as plain string — embed state/country inside since schema may not have them
        const addressLinePlain = String(addressData.address || addressData.addressLine || '').trim();

        const payload = {
            userId: userId,
            customerName: String(addressData.customerName || addressData.name || '').trim(),
            phone: String(addressData.phone || '').trim(),
            addressLine: addressLinePlain,
            city: String(addressData.city || '').trim(),
            pincode: String(addressData.pincode || '').trim(),
            state: stateVal,
            country: countryVal,
            is_default: isDefault
        };

        // Extended payload — tries to write is_default if Firebase schema has it
        const extendedPayload = {
            ...payload
        };

        const docId = addressData.$id || addressData.id;

        try {
            if (!conf.firebaseAddressesCollectionId) {
                const local = this.getLocalAddresses(userId);
                let savedDoc;
                if (docId) {
                    local.forEach((item, idx) => {
                        if (item.$id === docId || item.id === docId) {
                            local[idx] = { ...item, ...extendedPayload };
                            savedDoc = local[idx];
                        }
                    });
                } else {
                    savedDoc = {
                        $id: 'addr-' + Date.now(),
                        id: 'addr-' + Date.now(),
                        $createdAt: new Date().toISOString(),
                        ...extendedPayload
                    };
                    local.push(savedDoc);
                }
                
                // Manage defaults locally
                if (isDefault) {
                    local.forEach(item => {
                        if (item.$id !== savedDoc.$id && item.id !== savedDoc.id) {
                            item.is_default = false;
                        }
                    });
                }
                this.saveLocalAddresses(userId, local);
                return savedDoc;
            }

            let result;
            if (docId) {
                // Update specific address
                try {
                    result = await this.databases.updateDocument(
                        conf.firebaseDatabaseId,
                        conf.firebaseAddressesCollectionId,
                        docId,
                        extendedPayload
                    );
                } catch (err) {
                    console.warn("Schema missing state/country/is_default — retrying update with base fields only:", err.message);
                    result = await this.databases.updateDocument(
                        conf.firebaseDatabaseId,
                        conf.firebaseAddressesCollectionId,
                        docId,
                        payload
                    );
                }
            } else {
                // Create a new address document
                try {
                    result = await this.databases.createDocument(
                        conf.firebaseDatabaseId,
                        conf.firebaseAddressesCollectionId,
                        ID.unique(),
                        extendedPayload
                    );
                } catch (err) {
                    console.warn("Schema missing state/country/is_default — retrying create with base fields only:", err.message);
                    result = await this.databases.createDocument(
                        conf.firebaseDatabaseId,
                        conf.firebaseAddressesCollectionId,
                        ID.unique(),
                        payload
                    );
                }
            }

            // Sync defaults on database in background
            if (isDefault && result) {
                this.syncDefaultAddress(userId, result.$id);
            }

            return result;
        } catch (error) {
            console.warn("⚠️ Firebase saveAddress error. Saving locally.", error.message);
            // Fallback to local
            const mockData = docId ? addressData : { $id: 'addr-' + Date.now(), ...extendedPayload };
            const local = this.getLocalAddresses(userId);
            if (docId) {
                const idx = local.findIndex(a => a.$id === docId);
                if (idx !== -1) local[idx] = mockData;
            } else {
                local.push(mockData);
            }
            this.saveLocalAddresses(userId, local);
            return mockData;
        }
    }

    // ➡️ 4. Delete an address
    async deleteAddress(userId, addressId) {
        try {
            if (!conf.firebaseAddressesCollectionId || addressId.startsWith('addr-')) {
                const local = this.getLocalAddresses(userId).filter(a => a.$id !== addressId && a.id !== addressId);
                this.saveLocalAddresses(userId, local);
                return true;
            }
            await this.databases.deleteDocument(
                conf.firebaseDatabaseId,
                conf.firebaseAddressesCollectionId,
                addressId
            );
            return true;
        } catch (error) {
            console.warn("⚠️ Address delete failed. Deleting locally.", error.message);
            const local = this.getLocalAddresses(userId).filter(a => a.$id !== addressId && a.id !== addressId);
            this.saveLocalAddresses(userId, local);
            return true;
        }
    }

    // Helper: Sync defaults on Firebase DB by clearing is_default on other nodes
    async syncDefaultAddress(userId, defaultId) {
        try {
            if (!conf.firebaseAddressesCollectionId) return;
            const response = await this.databases.listDocuments(
                conf.firebaseDatabaseId,
                conf.firebaseAddressesCollectionId,
                [
                    Query.equal("userId", userId),
                    Query.limit(100)
                ]
            );
            await Promise.all(
                response.documents
                    .filter(doc => doc.$id !== defaultId)
                    .map(doc =>
                        this.databases.updateDocument(
                            conf.firebaseDatabaseId,
                            conf.firebaseAddressesCollectionId,
                            doc.$id,
                            { is_default: false }
                        ).catch(err => console.warn("Failed to reset is_default on document:", doc.$id, err.message))
                    )
            );
        } catch (err) {
            console.warn("Default syncing issue:", err.message);
        }
    }
}

const addressService = new AddressService();
export default addressService;
