import { ID, Databases, Query } from "../firebase/adapter.js";
import { client } from "./client";
import { conf } from "./conf/conf";

export class WalletService {
    databases;

    constructor() {
        this.databases = new Databases(client);
    }

    // ➡️ 1. Create a new wallet transaction
    async createWalletTransaction({ userId, amount, type, title, referenceId = '' }) {
        try {
            if (!conf.firebaseWalletCollectionId) {
                console.warn("⚠️ Wallet collection not configured. Transaction skipped.");
                return null;
            }

            const payload = {
                userId,
                amount: Number(amount),
                type, // 'credit' | 'debit'
                title,
                referenceId
            };

            return await this.databases.createDocument(
                conf.firebaseDatabaseId,
                conf.firebaseWalletCollectionId,
                ID.unique(),
                payload
            );
        } catch (error) {
            console.error("Firebase service :: createWalletTransaction :: error", error.message);
            throw error;
        }
    }

    // ➡️ 2. Get all wallet transactions for a user
    async getUserWalletTransactions(userId) {
        try {
            if (!userId) return [];
            if (!conf.firebaseWalletCollectionId) return [];

            const response = await this.databases.listDocuments(
                conf.firebaseDatabaseId,
                conf.firebaseWalletCollectionId,
                [
                    Query.equal("userId", userId),
                    Query.orderDesc("$createdAt"),
                    Query.limit(500)
                ]
            );
            
            return response.documents || [];
        } catch (error) {
            console.error("Firebase wallet transactions list error:", error.message);
            return [];
        }
    }

    // ➡️ 3. Get user wallet balance dynamically
    async getUserWalletBalance(userId) {
        try {
            if (!userId) return 0;
            const transactions = await this.getUserWalletTransactions(userId);
            let balance = 0;
            transactions.forEach(tx => {
                if (tx.type === 'credit') {
                    balance += Number(tx.amount || 0);
                } else if (tx.type === 'debit') {
                    balance -= Number(tx.amount || 0);
                }
            });
            return Math.max(0, balance);
        } catch (error) {
            console.error("Failed to compute wallet balance:", error.message);
            return 0;
        }
    }
}

const walletService = new WalletService();
export default walletService;
