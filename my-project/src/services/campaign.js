import { ID, Databases, Query } from "../firebase/adapter.js";
import { client } from "./client";
import { conf } from "./conf/conf";

export class CampaignService {
    databases;

    constructor() {
        this.databases = new Databases(client);
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
        return [
            {
                $id: 'new10-local',
                code: 'NEW10',
                discount: 10,
                min_order_value: 0,
                description: 'Extra 10% off on your first purchase, on styles up to 40% off.*T&C',
                isExpired: false
            }
        ];
    }

    // Helper: Local Promo Announcement Fallback hydration
    getLocalPromoText() {
        return localStorage.getItem('campaignPromoText') || '⚡ FREE EXPRESS SHIPPING & 7-DAY EASY RETURNS ON ALL ORDERS ⚡';
    }

    // ➡️ 1. Fetch All Active Coupons
    async getCoupons() {
        try {
            if (!conf.firebaseCouponsCollectionId) {
                return [];
            }
            const response = await this.databases.listDocuments(
                conf.firebaseDatabaseId,
                conf.firebaseCouponsCollectionId,
                [Query.orderDesc("$createdAt")]
            );
            
            let coupons = [];
            if (response.documents && response.documents.length > 0) {
                coupons = response.documents.map(doc => {
                    let showInAvailable = doc.show_in_available !== undefined ? Boolean(doc.show_in_available) : true;
                    if (doc.coupon_usage) {
                        try {
                            const parsed = JSON.parse(doc.coupon_usage);
                            if (parsed && typeof parsed.show_in_available === 'boolean') {
                                showInAvailable = parsed.show_in_available;
                            }
                        } catch {}
                    }
                    return {
                        ...doc,
                        show_in_available: showInAvailable,
                        isExpired: this.checkIsExpired(doc.valid_until)
                    };
                });
            }

            return coupons;
        } catch (error) {
            console.warn("⚠️ Firebase Coupons DB unavailable:", error.message);
            return [];
        }
    }

    // ➡️ 2. Create/Activate a Promo Coupon
    async createCoupon(code, discount, extraData = {}) {
        const minOrder = extraData.min_order_value ? Number(extraData.min_order_value) : 0;
        const validUntil = extraData.valid_until || '';
        const showInAvailable = extraData.show_in_available !== undefined ? Boolean(extraData.show_in_available) : true;
        const serializedUsage = JSON.stringify({
            min_order_value: minOrder,
            valid_until: validUntil,
            show_in_available: showInAvailable
        });

        const payload = { 
            code: code.toUpperCase(), 
            discount: Number(discount),
            min_order_value: minOrder,
            valid_until: validUntil,
            show_in_available: showInAvailable,
            coupon_usage: serializedUsage
        };

        try {
            if (!conf.firebaseCouponsCollectionId) {
                throw new Error("firebaseCouponsCollectionId is missing.");
            }
            const doc = await this.databases.createDocument(
                conf.firebaseDatabaseId,
                conf.firebaseCouponsCollectionId,
                ID.unique(),
                payload
            );
            return { ...doc, show_in_available: showInAvailable, isExpired: this.checkIsExpired(doc.valid_until) };
        } catch (error) {
            console.warn("⚠️ Firebase Coupons offline. Saving coupon locally.", error.message);
            const local = this.getLocalCoupons();
            const newCoupon = { id: 'local-' + Date.now(), $id: 'local-' + Date.now(), ...payload };
            local.push(newCoupon);
            localStorage.setItem('campaignCoupons', JSON.stringify(local));
            return { ...newCoupon, show_in_available: showInAvailable, isExpired: this.checkIsExpired(newCoupon.valid_until) };
        }
    }

    // ➡️ 2.5 Update/Edit a Promo Coupon
    async updateCoupon(documentId, code, discount, extraData = {}) {
        const minOrder = extraData.min_order_value ? Number(extraData.min_order_value) : 0;
        const validUntil = extraData.valid_until || '';
        const showInAvailable = extraData.show_in_available !== undefined ? Boolean(extraData.show_in_available) : true;
        const serializedUsage = JSON.stringify({
            min_order_value: minOrder,
            valid_until: validUntil,
            show_in_available: showInAvailable
        });

        const payload = { 
            code: code.toUpperCase(), 
            discount: Number(discount),
            min_order_value: minOrder,
            valid_until: validUntil,
            show_in_available: showInAvailable,
            coupon_usage: serializedUsage
        };

        try {
            if (!conf.firebaseCouponsCollectionId || documentId.startsWith('local-')) {
                throw new Error("Firebase unavailable or local coupon update triggered.");
            }
            const doc = await this.databases.updateDocument(
                conf.firebaseDatabaseId,
                conf.firebaseCouponsCollectionId,
                documentId,
                payload
            );
            return { ...doc, show_in_available: showInAvailable, isExpired: this.checkIsExpired(doc.valid_until) };
        } catch (error) {
            console.warn("⚠️ Firebase Coupons offline. Updating coupon locally.", error.message);
            const local = this.getLocalCoupons();
            const idx = local.findIndex(c => c.code === code || c.$id === documentId || c.id === documentId);
            if (idx !== -1) {
                local[idx] = { ...local[idx], ...payload };
                localStorage.setItem('campaignCoupons', JSON.stringify(local));
                return { ...local[idx], show_in_available: showInAvailable, isExpired: this.checkIsExpired(local[idx].valid_until) };
            }
            throw error;
        }
    }


    // ➡️ 3. Deactivate/Delete a Promo Coupon
    async deleteCoupon(documentId, code) {
        try {
            if (!conf.firebaseCouponsCollectionId || documentId.startsWith('local-')) {
                throw new Error("Firebase unavailable or local coupon deletion triggered.");
            }
            await this.databases.deleteDocument(
                conf.firebaseDatabaseId,
                conf.firebaseCouponsCollectionId,
                documentId
            );
            return true;
        } catch (error) {
            console.warn("⚠️ Firebase offline/local code. Swiping coupon locally.", error.message);
            const local = this.getLocalCoupons().filter(c => c.code !== code && c.$id !== documentId && c.id !== documentId);
            localStorage.setItem('campaignCoupons', JSON.stringify(local));
            return true;
        }
    }

    // ➡️ 4. Retrieve Live Scrolling Announcement Banner Text
    async getPromoText() {
        try {
            if (!conf.firebaseSettingsCollectionId) {
                return this.getLocalPromoText();
            }
            const response = await this.databases.listDocuments(
                conf.firebaseDatabaseId,
                conf.firebaseSettingsCollectionId,
                [Query.limit(1)]
            );
            if (response.documents && response.documents.length > 0) {
                return response.documents[0].announcementText;
            }
            return this.getLocalPromoText();
        } catch (error) {
            console.warn("⚠️ Firebase Settings DB unavailable. Reading marquee locally.", error.message);
            return this.getLocalPromoText();
        }
    }

    // ➡️ 5. Save/Update Scrolling Announcement Banner Text
    async savePromoText(text) {
        const cleanText = text.trim();
        try {
            if (!conf.firebaseSettingsCollectionId) {
                throw new Error("firebaseSettingsCollectionId is missing.");
            }
            
            // Check if document already exists
            const response = await this.databases.listDocuments(
                conf.firebaseDatabaseId,
                conf.firebaseSettingsCollectionId,
                [Query.limit(1)]
            );

            if (response.documents && response.documents.length > 0) {
                // Update existing banner document
                const docId = response.documents[0].$id;
                return await this.databases.updateDocument(
                    conf.firebaseDatabaseId,
                    conf.firebaseSettingsCollectionId,
                    docId,
                    { announcementText: cleanText }
                );
            } else {
                // Create first banner document
                return await this.databases.createDocument(
                    conf.firebaseDatabaseId,
                    conf.firebaseSettingsCollectionId,
                    ID.unique(),
                    { announcementText: cleanText }
                );
            }
        } catch (error) {
            console.warn("⚠️ Firebase Settings offline. Saving banner locally.", error.message);
            localStorage.setItem('campaignPromoText', cleanText);
            return { announcementText: cleanText };
        }
    }

    // ➡️ 6. Subscribe to Newsletter
    async subscribeNewsletter(email) {
        const cleanEmail = email.trim().toLowerCase();
        try {
            if (!conf.firebaseCampaignsCollectionId) {
                throw new Error("Newsletter service is not configured.");
            }

            // Check if email already exists in Firebase database
            let isAlreadySubscribed = false;
            try {
                const response = await this.databases.listDocuments(
                    conf.firebaseDatabaseId,
                    conf.firebaseCampaignsCollectionId,
                    [Query.equal("email", cleanEmail)]
                );
                if (response.documents && response.documents.length > 0) {
                    isAlreadySubscribed = true;
                }
            } catch {
                // Fallback: list documents and filter locally if indexes are not configured
                try {
                    const response = await this.databases.listDocuments(
                        conf.firebaseDatabaseId,
                        conf.firebaseCampaignsCollectionId,
                        [Query.limit(100)]
                    );
                    const match = response.documents.find(doc => doc.email === cleanEmail);
                    if (match) {
                        isAlreadySubscribed = true;
                    }
                } catch (innerError) {
                    console.warn("⚠️ Firebase newsletter check failed:", innerError.message);
                }
            }

            if (isAlreadySubscribed) {
                throw new Error("This email is already subscribed to drops.");
            }

            // Create document in Firebase
            const doc = await this.databases.createDocument(
                conf.firebaseDatabaseId,
                conf.firebaseCampaignsCollectionId,
                ID.unique(),
                { 
                    email: cleanEmail,
                    subscribedAt: new Date().toISOString()
                }
            );

            return doc;
        } catch (error) {
            console.error("Firebase service :: subscribeNewsletter :: error", error.message);
            throw error;
        }
    }

    // ➡️ 7. Retrieve All Newsletter Subscribers
    async getNewsletterSubscribers() {
        try {
            if (!conf.firebaseCampaignsCollectionId) {
                const defaults = [
                    "vakrayan.help@gmail.com",
                    "chandu.makavana61@gmail.com",
                    "premium.vakrayan@outlook.com"
                ];
                return defaults.map((email, idx) => ({ $id: `local-sub-${idx}`, email }));
            }
            const response = await this.databases.listDocuments(
                conf.firebaseDatabaseId,
                conf.firebaseCampaignsCollectionId,
                [Query.limit(100), Query.orderDesc("$createdAt")]
            );
            if (response.documents && response.documents.length > 0) {
                return response.documents;
            }
            // Return defaults if db is empty
            const defaults = [
                "vakrayan.help@gmail.com",
                "chandu.makavana61@gmail.com",
                "premium.vakrayan@outlook.com"
            ];
            return defaults.map((email, idx) => ({ $id: `local-sub-${idx}`, email }));
        } catch (error) {
            console.warn("⚠️ Firebase subscriber retrieve failed. Using default subscribers list.", error.message);
            const defaults = [
                "vakrayan.help@gmail.com",
                "chandu.makavana61@gmail.com",
                "premium.vakrayan@outlook.com"
            ];
            return defaults.map((email, idx) => ({ $id: `local-sub-${idx}`, email }));
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

    // ➡️ 10. Send individual email via Brevo Serverless Function
    async sendEmailViaEmailJS(email, subject, body) {
        return this.sendEmailViaBrevo(email, subject, body);
    }

    async sendEmailViaBrevo(email, subject, body) {
        const response = await fetch('/.netlify/functions/email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: 'campaign',
                to: email,
                subject: subject,
                textContent: body,
            })
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.error || `Email delivery failed (${response.statusText})`);
        }

        return true;
    }
}

const campaignService = new CampaignService();
export default campaignService;
