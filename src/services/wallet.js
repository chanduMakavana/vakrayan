import { ID, Databases, Query } from "../firebase/adapter.js";
import { client } from "./client";
import { conf } from "./conf/conf";

export class WalletService {
    databases;

    constructor() {
        this.databases = new Databases(client);
    }

    // Local Storage Helpers (Fallback)
    getLocalTransactions(userId) {
        return JSON.parse(localStorage.getItem(`walletTx_${userId}`)) || [];
    }

    saveLocalTransaction(userId, tx) {
        const list = this.getLocalTransactions(userId);
        list.push(tx);
        localStorage.setItem(`walletTx_${userId}`, JSON.stringify(list));
        return tx;
    }

    // ➡️ 1. Create a new wallet transaction
    async createWalletTransaction({ userId, amount, type, title, referenceId = '' }) {
        try {
            const payload = {
                userId,
                amount: Number(amount),
                type, // 'credit' | 'debit'
                title,
                referenceId
            };

            if (!conf.firebaseWalletCollectionId) {
                const mockTx = {
                    $id: 'wtx-' + Date.now(),
                    $createdAt: new Date().toISOString(),
                    ...payload
                };
                this.saveLocalTransaction(userId, mockTx);
                return mockTx;
            }

            return await this.databases.createDocument(
                conf.firebaseDatabaseId,
                conf.firebaseWalletCollectionId,
                ID.unique(),
                payload
            );
        } catch (error) {
            console.error("Firebase service :: createWalletTransaction :: error", error.message);
            // Fallback locally
            const mockTx = {
                $id: 'wtx-' + Date.now(),
                $createdAt: new Date().toISOString(),
                userId,
                amount: Number(amount),
                type,
                title,
                referenceId
            };
            this.saveLocalTransaction(userId, mockTx);
            return mockTx;
        }
    }

    // ➡️ 2. Get all wallet transactions for a user
    async getUserWalletTransactions(userId) {
        try {
            if (!userId) return [];
            if (!conf.firebaseWalletCollectionId) {
                return this.getLocalTransactions(userId);
            }

            const response = await this.databases.listDocuments(
                conf.firebaseDatabaseId,
                conf.firebaseWalletCollectionId,
                [
                    Query.equal("userId", userId),
                    Query.orderDesc("$createdAt"),
                    Query.limit(500)
                ]
            );
            
            if (response.documents) {
                return response.documents;
            }
            return this.getLocalTransactions(userId);
        } catch (error) {
            console.warn("Firebase wallet transactions list error. Reading locally:", error.message);
            return this.getLocalTransactions(userId);
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
