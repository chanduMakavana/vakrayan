import { Account, ID } from 'appwrite';
import { client } from './client';

export class AuthService {
    account;

    constructor() {
        this.account = new Account(client);
    }

    // Create a new user account
    async createAccount({ email, password, name }) {
        try {
            const userAccount = await this.account.create(ID.unique(), email, password, name);
            if (userAccount) {
                return await this.login({ email, password });
            }
            return null;
        } catch (error) {
            console.error("Appwrite service :: createAccount :: error", error.message);
            throw error;
        }
    }

    // Authenticate user and create a session
    async login({ email, password }) {
        try {
            return await this.account.createEmailPasswordSession(email, password);
        } catch (error) {
            console.error("Appwrite service :: login :: error", error.message);
            throw error;
        }
    }

    // Retrieve current authenticated user details
    async getCurrentUser() {
        try {
            const user = await this.account.get();
            return user ?? null;
        } catch (error) {
            // No active session is a normal state on initial mount, do not throw
            console.log("Appwrite service :: getCurrentUser :: Not Logged In", error.message);
            return null;
        }
    }

    // Terminate current active session
    async logout() {
        try {
            return await this.account.deleteSession('current');
        } catch (error) {
            console.log("Appwrite service :: logout :: No active session found or already logged out", error.message);
            return null;
        }
    }

    // Terminate all active sessions (logout from all devices)
    async logoutAllDevices() {
        try {
            return await this.account.deleteSessions();
        } catch (error) {
            console.error("Appwrite service :: logoutAllDevices :: error", error.message);
            throw error;
        }
    }

    // Update user preferences
    async updatePreferences(prefs) {
        try {
            return await this.account.updatePrefs(prefs);
        } catch (error) {
            console.error("Appwrite service :: updatePreferences :: error", error.message);
            throw error;
        }
    }

    // Update user name
    async updateName(name) {
        try {
            return await this.account.updateName(name);
        } catch (error) {
            console.error("Appwrite service :: updateName :: error", error.message);
            throw error;
        }
    }

    // Change user password
    async updatePassword(password, oldPassword) {
        try {
            return await this.account.updatePassword(password, oldPassword);
        } catch (error) {
            console.error("Appwrite service :: updatePassword :: error", error.message);
            throw error;
        }
    }

    // Create recovery link for forgotten password
    async createRecovery(email, url) {
        try {
            return await this.account.createRecovery(email, url);
        } catch (error) {
            console.error("Appwrite service :: createRecovery :: error", error.message);
            throw error;
        }
    }

    // Complete recovery with userId, secret, and new password
    async updateRecovery(userId, secret, password) {
        try {
            return await this.account.updateRecovery(userId, secret, password);
        } catch (error) {
            console.error("Appwrite service :: updateRecovery :: error", error.message);
            throw error;
        }
    }

    // Initiate Google OAuth2 login session
    async loginWithGoogle() {
        try {
            const successUrl = `${window.location.origin}/`;
            const failureUrl = `${window.location.origin}/login`;
            return this.account.createOAuth2Session('google', successUrl, failureUrl);
        } catch (error) {
            console.error("Appwrite service :: loginWithGoogle :: error", error.message);
            throw error;
        }
    }
}

const authService = new AuthService();
export default authService;
