import { Client, ID, Databases, Query } from "appwrite";
import { conf } from "./conf/conf";
import authService from "./auth";

export class CartService {
    client = new Client();
    databases;

    constructor() {
        this.client
            .setEndpoint(conf.appwriteurl)
            .setProject(conf.appwriteProjectId);
        this.databases = new Databases(this.client);
    }

    // Add a product item to the database cart collection
    async addToCart({name, size, price, quantity = 1, product_id, product_Image}) {
        try {
            const isLogin = await authService.getCurrentUser();
            if (!isLogin) {
                alert("Please login to secure your drop.");
                return null;
            }

            // 1. Live user inventory database extraction pull query
            const userCartItems = await this.getCartItems(isLogin.$id);
            
            // 2. ✅ FIXED LOGIC FILTER: Pure pool mein check karo agar product + size same hai
            const existingCartItem = userCartItems.find(
                item => item.product_id === product_id && item.size === size
            );

            if (existingCartItem) {
                // UPDATE PIPELINE TRIGGER: Purane item ki quantity scale up karo
                const updatedQuantity = existingCartItem.quantity + quantity;
                const updatedSubtotal = Number(existingCartItem.price) * updatedQuantity;
                
                return await this.updateCartItem(existingCartItem.$id, {
                    quantity: updatedQuantity,
                    subtotal: updatedSubtotal
                });
            } else {
                // ✅ FIXED FALLBACK: Cart khali ho ya naya product ho, direct creation parameters apply honge
                const itemPrice = Number(price);
                const itemQuantity = Number(quantity);

                return await this.databases.createDocument(
                    conf.appwriteDatabaseId,
                    conf.appwriteCartCollectionId,
                    ID.unique(),
                    {
                        name,
                        userId: isLogin.$id, // Syncing parameter hook values safely
                        size,   
                        price: itemPrice,
                        quantity: itemQuantity,
                        subtotal: itemPrice * itemQuantity, // ✅ FIXED: Hardcoded '1' hatakar actual price calculation set ki
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

    async clearUserCart(user_id) {
        try {
            const items = await this.getCartItems(user_id);
            const deletePromises = items.map((item) => this.removeFromCart(item.$id));
            await Promise.all(deletePromises);
            return true;
        } catch (error) {
            console.error("Appwrite service :: clearUserCart :: error", error.message);
            throw error;
        }
    }
}

const cartService = new CartService();
export default cartService;