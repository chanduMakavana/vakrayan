import { Client, Account, ID } from 'appwrite';
import { conf } from './conf/conf';

export class AuthService {
    client = new Client();
    account;
    
    constructor() {
        this.client
            .setEndpoint(conf.appwriteurl)
            .setProject(conf.appwriteProjectId);
        this.account = new Account(this.client);
    }

    // Create a new user account
    async createAccount({ email, password, name }) {
        try {
            const userAccount = await this.account.create(ID.unique(), email, password, name);
            
            if (userAccount) {
                // Automatically log in after registration
                return await this.login({ email, password });
            } else {
                return null;
            }
        }
        catch (error) {
            console.error("Appwrite service :: createAccount :: error", error.message);
            throw error; // Re-throw to be handled by the component
        }
    }

    // Authenticate user and create a session
    async login({ email, password }) {
        try {
            return await this.account.createEmailPasswordSession(email, password);
        }
        catch (error) {
            console.error("Appwrite service :: login :: error", error.message);
            throw error;
        }
    }

    // Retrieve current authenticated user details
    async getCurrentUser() {
        try {
            const user = await this.account.get();
            return user ? JSON.parse(JSON.stringify(user)) : null;
        } catch (error) {
            // No active session is a normal state on initial mount, do not throw
            console.log("Appwrite service :: getCurrentUser :: Not Logged In", error.message);
            return null;
        }
    }

    // Terminate current active session
    async logout() {
<<<<<<< HEAD
        try {
            return await this.account.deleteSession('current');
        } catch (error) {
            // Log exception but do not throw to avoid breaking the frontend state
            console.log("Appwrite service :: logout :: No active session found or already logged out", error.message);
            return null; 
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

    // Complete recovery with userId, secret, new password, and confirmed new password
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
=======
    try {
        return await this.account.deleteSession('current');
    } catch (error) {
        // Log exception but do not throw to avoid breaking the frontend state
        console.log("Appwrite service :: logout :: No active session found or already logged out", error.message);
        return null; 
    }
}
}
>>>>>>> 61e2559d0e1cd6e0dbf11f31859e58bc8057f893

const authService = new AuthService();
export default authService;
