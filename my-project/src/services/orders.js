import { ID, Databases, Query } from "../firebase/adapter.js";
import { client } from "./client";
import { conf } from "./conf/conf";

export class OrdersService {
    databases;

    constructor() {
        this.databases = new Databases(client);
    }

    // ➡️ 1. Create a new customer order entry
    async createOrder(data) {
        try {
            if (!conf.firebaseOrdersCollectionId) {
                console.warn("⚠️ firebaseOrdersCollectionId is missing. Skipping database push.");
                return null;
            }
            return await this.databases.createDocument(
                conf.firebaseDatabaseId,
                conf.firebaseOrdersCollectionId,
                ID.unique(),
                data
            );
        }
        catch (error) {
            // If creation failed due to attribute mismatch/missing schema column, retry with clean legacy schema fields
            if (
                error.message?.toLowerCase().includes("attribute") ||
                error.message?.toLowerCase().includes("not found") ||
                error.message?.toLowerCase().includes("structure") ||
                error.code === 400 ||
                error.status === 400
            ) {
                console.warn("⚠️ Firebase Orders schema mismatch. Retrying with sanitized legacy schema.");
                const sanitized = {
                    userId: data.userId,
                    customerName: data.customerName,
                    email: data.email,
                    phone: data.phone,
                    address: data.address, // has serialized details
                    items: data.items,
                    total: data.total,
                    status: data.status,
                    paymentMethod: data.paymentMethod,
                    paymentStatus: data.paymentStatus || data.payment_status,
                    payment_status: data.payment_status || data.paymentStatus,
                    paymentProvider: data.paymentProvider,
                    couponApplied: data.couponApplied,
                    coupon_code: data.coupon_code,
                    discountAmount: data.discountAmount,
                    discount_amount: data.discount_amount,
                    discount_applied: data.discount_applied,
                    razorpayOrderId: data.razorpayOrderId,
                    razorpay_order_id: data.razorpay_order_id,
                    razorpayPaymentId: data.razorpayPaymentId,
                    razorpay_payment_id: data.razorpay_payment_id
                };
                try {
                    return await this.databases.createDocument(
                        conf.firebaseDatabaseId,
                        conf.firebaseOrdersCollectionId,
                        ID.unique(),
                        sanitized
                    );
                } catch (retryErr) {
                    console.error("Firebase service :: createOrder retry :: error", retryErr.message);
                    throw retryErr;
                }
            }
            console.error("Firebase service :: createOrder :: error", error.message);
            throw error;
        }
    }

    // ➡️ 2. Retrieve all active orders (For Admin Dashboard)
    async getOrders() {
        try {
            const collectionName = conf.firebaseOrdersCollectionId || 'orders';
            const response = await this.databases.listDocuments(
                conf.firebaseDatabaseId,
                collectionName,
                [
                    Query.orderDesc("$createdAt"),
                    Query.limit(500)
                ]
            );
            const documents = response?.documents || response || [];
            
            // Sort by most recent timestamp descending
            documents.sort((a, b) => {
                const dateA = new Date(a.$createdAt || a.createdAt || a.created_at || a.$updatedAt || a.date || 0).getTime();
                const dateB = new Date(b.$createdAt || b.createdAt || b.created_at || b.$updatedAt || b.date || 0).getTime();
                return dateB - dateA;
            });

            return documents;
        }
        catch (error) {
            console.error("Firebase service :: getOrders :: error", error.message);
            // Return empty array instead of crashing caller
            return [];
        }
    }

    // ➡️ 3. Retrieve orders for a specific user (For User Order History)
    async getUserOrders(userId) {
        try {
            if (!userId) return [];
            const collectionName = conf.firebaseOrdersCollectionId || 'orders';

            try {
                const response = await this.databases.listDocuments(
                    conf.firebaseDatabaseId,
                    collectionName,
                    [
                        Query.equal("userId", userId),
                        Query.orderDesc("$createdAt"),
                        Query.limit(100)
                    ]
                );
                let documents = response?.documents || response || [];
                documents.sort((a, b) => {
                    const dateA = new Date(a.$createdAt || a.createdAt || a.created_at || a.$updatedAt || 0).getTime();
                    const dateB = new Date(b.$createdAt || b.createdAt || b.created_at || b.$updatedAt || 0).getTime();
                    return dateB - dateA;
                });
                return documents;
            } catch (indexErr) {
                console.warn("⚠️ Firestore index missing or query failed for getUserOrders. Falling back to getOrders client-side filter:", indexErr.message);
                const allOrders = await this.getOrders();
                return (allOrders || []).filter(order => order.userId === userId);
            }
        }
        catch (error) {
            console.error("Firebase orders :: getUserOrders :: error", error.message);
            return [];
        }
    }

    // Alias for backwards compatibility
    async getOrdersByUser(userId) {
        return this.getUserOrders(userId);
    }


    // ➡️ 4. Update the order delivery status and optionally tracking info
    async updateOrderStatus(documentId, status, extraData = {}) {
        try {
            if (!conf.firebaseOrdersCollectionId) return null;

            // Fetch current order to preserve and append metadata inside address field
            const currentOrder = await this.databases.getDocument(
                conf.firebaseDatabaseId,
                conf.firebaseOrdersCollectionId,
                documentId
            );

            let updatedAddress = currentOrder.address;
            try {
                const parsed = JSON.parse(currentOrder.address);
                if (parsed && typeof parsed === 'object' && 'customerAddress' in parsed) {
                    parsed.metadata = {
                        ...parsed.metadata,
                        ...extraData
                    };
                    updatedAddress = JSON.stringify(parsed);
                }
            } catch (err) {
                console.warn("Could not append metadata inside address field:", err.message);
            }

            const updatePayload = {
                status,
                address: updatedAddress,
                ...extraData
            };

            if (status === 'DELIVERED') {
                updatePayload.paymentStatus = 'PAID';
                updatePayload.payment_status = 'PAID';
            }

            try {
                return await this.databases.updateDocument(
                    conf.firebaseDatabaseId,
                    conf.firebaseOrdersCollectionId,
                    documentId,
                    updatePayload
                );
            } catch (err) {
                // If direct tracking fields don't exist in DB, update only status and address (which holds them serialized)
                if (
                    err.message?.toLowerCase().includes("attribute") ||
                    err.message?.toLowerCase().includes("not found") ||
                    err.message?.toLowerCase().includes("structure") ||
                    err.code === 400 ||
                    err.status === 400
                ) {
                    return await this.databases.updateDocument(
                        conf.firebaseDatabaseId,
                        conf.firebaseOrdersCollectionId,
                        documentId,
                        { status, address: updatedAddress }
                    );
                }
                throw err;
            }
        } catch (error) {
            console.error("Firebase service :: updateOrderStatus :: error", error.message);
            throw error;
        }
    }

    // ➡️ 5. Retrieve details for a specific order by ID
    async getOrderById(documentId) {
        try {
            if (!documentId || !conf.firebaseOrdersCollectionId) return null;
            return await this.databases.getDocument(
                conf.firebaseDatabaseId,
                conf.firebaseOrdersCollectionId,
                documentId
            );
        } catch (error) {
            console.error("Firebase service :: getOrderById :: error", error.message);
            throw error;
        }
    }

    // ➡️ 6. Delete an order document by ID
    async deleteOrder(documentId) {
        try {
            if (!conf.firebaseOrdersCollectionId) return null;
            return await this.databases.deleteDocument(
                conf.firebaseDatabaseId,
                conf.firebaseOrdersCollectionId,
                documentId
            );
        } catch (error) {
            console.error("Firebase service :: deleteOrder :: error", error.message);
            throw error;
        }
    }
}

const ordersService = new OrdersService();
export default ordersService;
