import { Client, ID, Databases, Query } from "appwrite";
import { conf } from "./conf/conf";

export class CartService {
    client = new Client();
    databases;

    constructor() {
        this.client
            .setEndpoint(conf.appwriteurl)
            .setProject(conf.appwriteProjectId);
        this.databases = new Databases(this.client);
    }

    // Add a product item to the database cart collection with high-efficiency direct arguments
    async addToCart({name, size, price, quantity = 1, product_id, product_Image, userId, existingCartItem}) {
        try {
            if (!userId) {
                throw new Error("Please login to secure your drop.");
            }

            if (existingCartItem) {
                // UPDATE PIPELINE TRIGGER: Purane item ki quantity scale up karo
                const updatedQuantity = existingCartItem.quantity + quantity;
                const updatedSubtotal = Number(existingCartItem.price) * updatedQuantity;
                
                return await this.updateCartItem(existingCartItem.$id, {
                    quantity: updatedQuantity,
                    subtotal: updatedSubtotal
                });
            } else {
                const itemPrice = Number(price);
                const itemQuantity = Number(quantity);

                return await this.databases.createDocument(
                    conf.appwriteDatabaseId,
                    conf.appwriteCartCollectionId,
                    ID.unique(),
                    {
                        name,
                        userId, // Syncing parameter hook values safely
                        size,   
                        price: itemPrice,
                        quantity: itemQuantity,
                        subtotal: itemPrice * itemQuantity,
                        product_id,
                        product_Image
                    }
                );
            }
        }
        catch (error) {
            console.error("Appwrite service :: addToCart :: error", error.message);
            throw error;
        }
    }

    // Retrieve all cart items for a specific user
    async getCartItems(user_id) {
        try {
            if (!user_id) return [];
            
            const response = await this.databases.listDocuments(
                conf.appwriteDatabaseId,
                conf.appwriteCartCollectionId,
                [
                    // ✅ TIP: Agar Appwrite attribute ka naam userId hai toh yahan "userId" dalo
                    Query.equal("userId", user_id), 
                    Query.orderDesc("$createdAt")
                ]
            );
            return response.documents; 
        }
        catch (error) {
            console.error("Appwrite service :: getCartItems :: error", error.message);
            throw error;
        }
    }

    // Update an existing cart item document
    async updateCartItem(documentId, data) {
        try {
            return await this.databases.updateDocument(
                conf.appwriteDatabaseId,
                conf.appwriteCartCollectionId,
                documentId,
                data 
            );
        } catch (error) {
            console.error("Appwrite service :: updateCartItem :: error", error.message);
            throw error;
        }
    }

    // Remove a single item from the cart
    async removeFromCart(documentId) {
        try {
            await this.databases.deleteDocument(
                conf.appwriteDatabaseId,
                conf.appwriteCartCollectionId,
                documentId
            );
            return true; 
        } catch (error) {
            console.error("Appwrite service :: removeFromCart :: error", error.message);
            throw error;
        }
    }

    async clearUserCart(user_id, itemIds = null) {
        try {
            const items = await this.getCartItems(user_id);
            const deletePromises = items
                .filter(item => !itemIds || itemIds.includes(item.$id))
                .map((item) => this.removeFromCart(item.$id));
            await Promise.all(deletePromises);
            return true;
        } catch (error) {
            console.error("Appwrite service :: clearUserCart :: error", error.message);
            throw error;
        }
    }

    // Soft-update cart items status to converted on checkout (used for abandonment analytics)
    async convertCartItems(user_id, itemIds = null) {
        try {
            const items = await this.getCartItems(user_id);
            for (const item of items) {
                if (itemIds && !itemIds.includes(item.$id)) continue;
                try {
                    await this.updateCartItem(item.$id, { cart_status: 'converted' });
                } catch (e) {
                    console.warn("⚠️ Appwrite schema missing 'cart_status' attribute:", e.message);
                }
            }
            return true;
        } catch (error) {
            console.error("Appwrite service :: convertCartItems :: error", error.message);
            return false;
        }
    }

    // Retrieve all cart documents for admin abandonment analysis
    async getAllCarts() {
        try {
            if (!conf.appwriteCartCollectionId) return [];
            const response = await this.databases.listDocuments(
                conf.appwriteDatabaseId,
                conf.appwriteCartCollectionId
            );
            return response.documents;
        } catch (error) {
            console.error("Appwrite service :: getAllCarts :: error", error.message);
            return [];
        }
    }
}

const cartService = new CartService();
export default cartService;