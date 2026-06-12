import { Client, ID, Databases, Query } from "appwrite";
import { conf } from "./conf/conf";

export class CampaignService {
    client = new Client();
    databases;

    constructor() {
        this.client
            .setEndpoint(conf.appwriteurl)
            .setProject(conf.appwriteProjectId);
        this.databases = new Databases(this.client);
    }

    checkIsExpired(validUntil) {
        if (!validUntil) return false;
        const expiryDate = new Date(validUntil);
        if (/^\d{4}-\d{2}-\d{2}$/.test(validUntil)) {
            expiryDate.setHours(23, 59, 59, 999);
        }
        return new Date() > expiryDate;
    }

    // Helper: Local Coupons Fallback hydration
    getLocalCoupons() {
        const local = JSON.parse(localStorage.getItem('campaignCoupons')) || [
            { id: 'local-1', code: 'STREET50', discount: 50 },
            { id: 'local-2', code: 'CREW10', discount: 10 }
        ];
        return local.map(c => ({
            ...c,
            isExpired: this.checkIsExpired(c.valid_until)
        }));
    }

    // Helper: Local Promo Announcement Fallback hydration
    getLocalPromoText() {
        return localStorage.getItem('campaignPromoText') || '⚡ FREE EXPRESS SHIPPING & 7-DAY EASY RETURNS ON ALL ORDERS ⚡';
    }

    // ➡️ 1. Fetch All Active Coupons
    async getCoupons() {
        try {
            if (!conf.appwriteCouponsCollectionId) {
                return this.getLocalCoupons();
            }
            const response = await this.databases.listDocuments(
                conf.appwriteDatabaseId,
                conf.appwriteCouponsCollectionId,
                [Query.orderDesc("$createdAt")]
            );
            
            if (response.documents && response.documents.length > 0) {
                return response.documents.map(doc => ({
                    ...doc,
                    isExpired: this.checkIsExpired(doc.valid_until)
                }));
            }
            return this.getLocalCoupons();
        } catch (error) {
            console.warn("⚠️ Appwrite Coupons DB unavailable. Falling back to local storage.", error.message);
            return this.getLocalCoupons();
        }
    }

    // ➡️ 2. Create/Activate a Promo Coupon
    async createCoupon(code, discount, extraData = {}) {
        const minOrder = extraData.min_order_value ? Number(extraData.min_order_value) : 0;
        const validUntil = extraData.valid_until || '';
        const serializedUsage = JSON.stringify({
            min_order_value: minOrder,
            valid_until: validUntil
        });

        const payload = { 
            code: code.toUpperCase(), 
            discount: Number(discount),
            min_order_value: minOrder,
            valid_until: validUntil,
            coupon_usage: serializedUsage
        };

        try {
            if (!conf.appwriteCouponsCollectionId) {
                throw new Error("appwriteCouponsCollectionId is missing.");
            }
            const doc = await this.databases.createDocument(
                conf.appwriteDatabaseId,
                conf.appwriteCouponsCollectionId,
                ID.unique(),
                payload
            );
            return { ...doc, isExpired: this.checkIsExpired(doc.valid_until) };
        } catch (error) {
            console.warn("⚠️ Appwrite Coupons offline. Saving coupon locally.", error.message);
            const local = this.getLocalCoupons();
            const newCoupon = { id: 'local-' + Date.now(), $id: 'local-' + Date.now(), ...payload };
            local.push(newCoupon);
            localStorage.setItem('campaignCoupons', JSON.stringify(local));
            return { ...newCoupon, isExpired: this.checkIsExpired(newCoupon.valid_until) };
        }
    }

    // ➡️ 2.5 Update/Edit a Promo Coupon
    async updateCoupon(documentId, code, discount, extraData = {}) {
        const minOrder = extraData.min_order_value ? Number(extraData.min_order_value) : 0;
        const validUntil = extraData.valid_until || '';
        const serializedUsage = JSON.stringify({
            min_order_value: minOrder,
            valid_until: validUntil
        });

        const payload = { 
            code: code.toUpperCase(), 
            discount: Number(discount),
            min_order_value: minOrder,
            valid_until: validUntil,
            coupon_usage: serializedUsage
        };

        try {
            if (!conf.appwriteCouponsCollectionId || documentId.startsWith('local-')) {
                throw new Error("Appwrite unavailable or local coupon update triggered.");
            }
            const doc = await this.databases.updateDocument(
                conf.appwriteDatabaseId,
                conf.appwriteCouponsCollectionId,
                documentId,
                payload
            );
            return { ...doc, isExpired: this.checkIsExpired(doc.valid_until) };
        } catch (error) {
            console.warn("⚠️ Appwrite Coupons offline. Updating coupon locally.", error.message);
            const local = this.getLocalCoupons();
            const idx = local.findIndex(c => c.code === code || c.$id === documentId || c.id === documentId);
            if (idx !== -1) {
                local[idx] = { ...local[idx], ...payload };
                localStorage.setItem('campaignCoupons', JSON.stringify(local));
                return { ...local[idx], isExpired: this.checkIsExpired(local[idx].valid_until) };
            }
            throw error;
        }
    }


    // ➡️ 3. Deactivate/Delete a Promo Coupon
    async deleteCoupon(documentId, code) {
        try {
            if (!conf.appwriteCouponsCollectionId || documentId.startsWith('local-')) {
                throw new Error("Appwrite unavailable or local coupon deletion triggered.");
            }
            await this.databases.deleteDocument(
                conf.appwriteDatabaseId,
                conf.appwriteCouponsCollectionId,
                documentId
            );
            return true;
        } catch (error) {
            console.warn("⚠️ Appwrite offline/local code. Swiping coupon locally.", error.message);
            const local = this.getLocalCoupons().filter(c => c.code !== code && c.$id !== documentId && c.id !== documentId);
            localStorage.setItem('campaignCoupons', JSON.stringify(local));
            return true;
        }
    }

    // ➡️ 4. Retrieve Live Scrolling Announcement Banner Text
    async getPromoText() {
        try {
            if (!conf.appwriteSettingsCollectionId) {
                return this.getLocalPromoText();
            }
            const response = await this.databases.listDocuments(
                conf.appwriteDatabaseId,
                conf.appwriteSettingsCollectionId,
                [Query.limit(1)]
            );
            if (response.documents && response.documents.length > 0) {
                return response.documents[0].announcementText;
            }
            return this.getLocalPromoText();
        } catch (error) {
            console.warn("⚠️ Appwrite Settings DB unavailable. Reading marquee locally.", error.message);
            return this.getLocalPromoText();
        }
    }

    // ➡️ 5. Save/Update Scrolling Announcement Banner Text
    async savePromoText(text) {
        const cleanText = text.trim();
        try {
            if (!conf.appwriteSettingsCollectionId) {
                throw new Error("appwriteSettingsCollectionId is missing.");
            }
            
            // Check if document already exists
            const response = await this.databases.listDocuments(
                conf.appwriteDatabaseId,
                conf.appwriteSettingsCollectionId,
                [Query.limit(1)]
            );

            if (response.documents && response.documents.length > 0) {
                // Update existing banner document
                const docId = response.documents[0].$id;
                return await this.databases.updateDocument(
                    conf.appwriteDatabaseId,
                    conf.appwriteSettingsCollectionId,
                    docId,
                    { announcementText: cleanText }
                );
            } else {
                // Create first banner document
                return await this.databases.createDocument(
                    conf.appwriteDatabaseId,
                    conf.appwriteSettingsCollectionId,
                    ID.unique(),
                    { announcementText: cleanText }
                );
            }
        } catch (error) {
            console.warn("⚠️ Appwrite Settings offline. Saving banner locally.", error.message);
            localStorage.setItem('campaignPromoText', cleanText);
            return { announcementText: cleanText };
        }
    }

    // ➡️ 6. Subscribe to Newsletter
    async subscribeNewsletter(email) {
        const cleanEmail = email.trim().toLowerCase();
        try {
            if (!conf.appwriteCampaignsCollectionId) {
                const local = JSON.parse(localStorage.getItem('newsletterEmails')) || [];
                if (!local.includes(cleanEmail)) {
                    local.push(cleanEmail);
                    localStorage.setItem('newsletterEmails', JSON.stringify(local));
                }
                return true;
            }
            return await this.databases.createDocument(
                conf.appwriteDatabaseId,
                conf.appwriteCampaignsCollectionId,
                ID.unique(),
                { email: cleanEmail }
            );
        } catch (error) {
            console.warn("⚠️ Appwrite campaigns offline. Newsletter sub mocked locally.", error.message);
            const local = JSON.parse(localStorage.getItem('newsletterEmails')) || [];
            if (!local.includes(cleanEmail)) {
                local.push(cleanEmail);
                localStorage.setItem('newsletterEmails', JSON.stringify(local));
            }
            return true;
        }
    }

    // ➡️ 7. Retrieve All Newsletter Subscribers
    async getNewsletterSubscribers() {
        try {
            if (!conf.appwriteCampaignsCollectionId) {
                const local = JSON.parse(localStorage.getItem('newsletterEmails')) || [
                    "aashis.khatri@gmail.com",
                    "chandu.makavana61@gmail.com",
                    "premium.streetwear@outlook.com"
                ];
                return local.map((email, idx) => ({ $id: `local-sub-${idx}`, email }));
            }
            const response = await this.databases.listDocuments(
                conf.appwriteDatabaseId,
                conf.appwriteCampaignsCollectionId,
                [Query.limit(100), Query.orderDesc("$createdAt")]
            );
            if (response.documents && response.documents.length > 0) {
                return response.documents;
            }
            // Return defaults if db is empty
            const local = JSON.parse(localStorage.getItem('newsletterEmails')) || [
                "aashis.khatri@gmail.com",
                "chandu.makavana61@gmail.com",
                "premium.streetwear@outlook.com"
            ];
            return local.map((email, idx) => ({ $id: `local-sub-${idx}`, email }));
        } catch (error) {
            console.warn("⚠️ Appwrite subscriber retrieve failed. Using local storage.", error.message);
            const local = JSON.parse(localStorage.getItem('newsletterEmails')) || [
                "aashis.khatri@gmail.com",
                "chandu.makavana61@gmail.com",
                "premium.streetwear@outlook.com"
            ];
            return local.map((email, idx) => ({ $id: `local-sub-${idx}`, email }));
        }
    }

    // ➡️ 8. Send Campaign & Save History
    async sendCampaign(subject, body, recipientsCount) {
        const campaign = {
            id: 'campaign-' + Date.now(),
            subject,
            body,
            recipientsCount,
            sentAt: new Date().toISOString()
        };
        const history = JSON.parse(localStorage.getItem('sentCampaigns')) || [];
        history.unshift(campaign);
        localStorage.setItem('sentCampaigns', JSON.stringify(history));
        return campaign;
    }

    // ➡️ 9. Fetch Campaign Send History
    async getCampaignHistory() {
        return JSON.parse(localStorage.getItem('sentCampaigns')) || [];
    }
}

const campaignService = new CampaignService();
export default campaignService;
