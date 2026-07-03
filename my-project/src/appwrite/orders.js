import { ID, Databases, Query } from "appwrite";
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
            if (!conf.appwriteOrdersCollectionId) {
                console.warn("⚠️ appwriteOrdersCollectionId is missing. Skipping database push.");
                return null;
            }
            return await this.databases.createDocument(
                conf.appwriteDatabaseId,
                conf.appwriteOrdersCollectionId,
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
                console.warn("⚠️ Appwrite Orders schema mismatch. Retrying with sanitized legacy schema.");
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
                        conf.appwriteDatabaseId,
                        conf.appwriteOrdersCollectionId,
                        ID.unique(),
                        sanitized
                    );
                } catch (retryErr) {
                    console.error("Appwrite service :: createOrder retry :: error", retryErr.message);
                    throw retryErr;
                }
            }
            console.error("Appwrite service :: createOrder :: error", error.message);
            throw error;
        }
    }

    // ➡️ 2. Retrieve all active orders (For Admin Dashboard)
    async getOrders() {
        try {
            if (!conf.appwriteOrdersCollectionId) return [];
            const response = await this.databases.listDocuments(
                conf.appwriteDatabaseId,
                conf.appwriteOrdersCollectionId,
                [
                    Query.orderDesc("$createdAt"),
                    Query.limit(500) // Safety cap for admin dashboard
                ]
            );
            return response.documents;
        }
        catch (error) {
            console.error("Appwrite service :: getOrders :: error", error.message);
            throw error;
        }
    }

    // ➡️ 3. Retrieve orders for a specific user (For User Order History)
    async getUserOrders(userId) {
        try {
            if (!userId || !conf.appwriteOrdersCollectionId) return [];

            // ✅ SECURITY + PERFORMANCE FIX: Use server-side Query.equal to filter by userId.
            // Firebase adapter translates this to Firestore: where("userId", "==", userId)
            // This prevents fetching ALL orders and filtering client-side.
            //
            // ⚠️ FIREBASE SETUP REQUIRED: Create a composite index in Firebase Console:
            //   Firestore → Indexes → Composite → Add:
            //   Collection: "orders" | Fields: userId (Ascending) + $createdAt (Descending)
            //   Without this index, Firestore will throw an error (fallback handles it).
            try {
                const response = await this.databases.listDocuments(
                    conf.appwriteDatabaseId,
                    conf.appwriteOrdersCollectionId,
                    [
                        Query.equal("userId", userId),
                        Query.orderDesc("$createdAt"),
                        Query.limit(100)
                    ]
                );
                return response.documents || [];
            } catch (indexErr) {
                // Fallback: Firestore composite index not yet created
                // Go to Firebase Console → Firestore → Indexes → create composite index
                // Collection: orders | userId ASC + $createdAt DESC
                console.warn("⚠️ Firestore composite index missing for orders. Create it in Firebase Console. Falling back to client-side filter.", indexErr.message);
                const fallback = await this.databases.listDocuments(
                    conf.appwriteDatabaseId,
                    conf.appwriteOrdersCollectionId,
                    [Query.orderDesc("$createdAt"), Query.limit(500)]
                );
                return (fallback.documents || []).filter(order => order.userId === userId);
            }
        }
        catch (error) {
            console.error("Firebase orders :: getUserOrders :: error", error.message);
            throw error;
        }
    }


    // ➡️ 4. Update the order delivery status and optionally tracking info
    async updateOrderStatus(documentId, status, extraData = {}) {
        try {
            if (!conf.appwriteOrdersCollectionId) return null;

            // Fetch current order to preserve and append metadata inside address field
            const currentOrder = await this.databases.getDocument(
                conf.appwriteDatabaseId,
                conf.appwriteOrdersCollectionId,
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
                    conf.appwriteDatabaseId,
                    conf.appwriteOrdersCollectionId,
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
                        conf.appwriteDatabaseId,
                        conf.appwriteOrdersCollectionId,
                        documentId,
                        { status, address: updatedAddress }
                    );
                }
                throw err;
            }
        } catch (error) {
            console.error("Appwrite service :: updateOrderStatus :: error", error.message);
            throw error;
        }
    }

    // ➡️ 5. Retrieve details for a specific order by ID
    async getOrderById(documentId) {
        try {
            if (!documentId || !conf.appwriteOrdersCollectionId) return null;
            return await this.databases.getDocument(
                conf.appwriteDatabaseId,
                conf.appwriteOrdersCollectionId,
                documentId
            );
        } catch (error) {
            console.error("Appwrite service :: getOrderById :: error", error.message);
            throw error;
        }
    }

    // ➡️ 6. Delete an order document by ID
    async deleteOrder(documentId) {
        try {
            if (!conf.appwriteOrdersCollectionId) return null;
            return await this.databases.deleteDocument(
                conf.appwriteDatabaseId,
                conf.appwriteOrdersCollectionId,
                documentId
            );
        } catch (error) {
            console.error("Appwrite service :: deleteOrder :: error", error.message);
            throw error;
        }
    }
}

const ordersService = new OrdersService();
export default ordersService;
