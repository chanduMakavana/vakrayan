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
    try {
        return await this.account.deleteSession('current');
    } catch (error) {
        // Log exception but do not throw to avoid breaking the frontend state
        console.log("Appwrite service :: logout :: No active session found or already logged out", error.message);
        return null; 
    }
}
}

const authService = new AuthService();
export default authService;
