import { ID, Databases, Query } from "appwrite";
import { client } from "./client";
import { conf } from "./conf/conf";

export class AddressService {
    databases;

    constructor() {
        this.databases = new Databases(client);
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

    // Helper: Local fallback address list getter
    getLocalAddresses(userId) {
        return JSON.parse(localStorage.getItem(`userAddresses_${userId}`)) || [];
    }

    // Helper: Local fallback address list setter
    saveLocalAddresses(userId, list) {
        localStorage.setItem(`userAddresses_${userId}`, JSON.stringify(list));
        return list;
    }

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
            console.warn("⚠️ Appwrite Addresses unavailable.", error.message);
            return null;
        }
    }

    // ➡️ 2. Retrieve all saved addresses for a user
    async getUserAddresses(userId) {
        try {
            if (!userId) return [];
            if (!conf.appwriteAddressesCollectionId) {
                return this.getLocalAddresses(userId);
            }
            
            const response = await this.databases.listDocuments(
                conf.appwriteDatabaseId,
                conf.appwriteAddressesCollectionId,
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
            console.warn("⚠️ Appwrite Addresses unavailable. Reading addresses locally.", error.message);
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

        // Extended payload — tries to write is_default if Appwrite schema has it
        const extendedPayload = {
            ...payload
        };

        const docId = addressData.$id || addressData.id;

        try {
            if (!conf.appwriteAddressesCollectionId) {
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
                        conf.appwriteDatabaseId,
                        conf.appwriteAddressesCollectionId,
                        docId,
                        extendedPayload
                    );
                } catch (err) {
                    console.warn("Schema missing state/country/is_default — retrying update with base fields only:", err.message);
                    result = await this.databases.updateDocument(
                        conf.appwriteDatabaseId,
                        conf.appwriteAddressesCollectionId,
                        docId,
                        payload
                    );
                }
            } else {
                // Create a new address document
                try {
                    result = await this.databases.createDocument(
                        conf.appwriteDatabaseId,
                        conf.appwriteAddressesCollectionId,
                        ID.unique(),
                        extendedPayload
                    );
                } catch (err) {
                    console.warn("Schema missing state/country/is_default — retrying create with base fields only:", err.message);
                    result = await this.databases.createDocument(
                        conf.appwriteDatabaseId,
                        conf.appwriteAddressesCollectionId,
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
            console.warn("⚠️ Appwrite saveAddress error. Saving locally.", error.message);
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
            if (!conf.appwriteAddressesCollectionId || addressId.startsWith('addr-')) {
                const local = this.getLocalAddresses(userId).filter(a => a.$id !== addressId && a.id !== addressId);
                this.saveLocalAddresses(userId, local);
                return true;
            }
            await this.databases.deleteDocument(
                conf.appwriteDatabaseId,
                conf.appwriteAddressesCollectionId,
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

    // Helper: Sync defaults on Appwrite DB by clearing is_default on other nodes
    async syncDefaultAddress(userId, defaultId) {
        try {
            if (!conf.appwriteAddressesCollectionId) return;
            const response = await this.databases.listDocuments(
                conf.appwriteDatabaseId,
                conf.appwriteAddressesCollectionId,
                [
                    Query.equal("userId", userId),
                    Query.limit(100)
                ]
            );
            for (const doc of response.documents) {
                if (doc.$id !== defaultId) {
                    try {
                        await this.databases.updateDocument(
                            conf.appwriteDatabaseId,
                            conf.appwriteAddressesCollectionId,
                            doc.$id,
                            { is_default: false }
                        );
                    } catch (err) {
                        console.warn("Failed to reset is_default on document:", doc.$id, err.message);
                    }
                }
            }
        } catch (err) {
            console.warn("Default syncing issue:", err.message);
        }
    }
}

const addressService = new AddressService();
export default addressService;
