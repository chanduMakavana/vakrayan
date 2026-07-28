import { auth, db as firestore, storage as firebaseStorage, googleProvider } from './config';
import { 
  createUserWithEmailAndPassword, signInWithEmailAndPassword, 
  signOut, onAuthStateChanged, updateProfile, signInWithPopup,
  sendPasswordResetEmail, confirmPasswordReset
} from 'firebase/auth';
import { 
  collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy, limit, arrayUnion, arrayRemove
} from 'firebase/firestore';
import { 
  ref, uploadBytes, getDownloadURL 
} from 'firebase/storage';

export class Client {
    constructor() { this.endpoint = ''; this.project = ''; }
    setEndpoint(e) { this.endpoint = e; return this; }
    setProject(p) { this.project = p; return this; }
}

export class Account {
    constructor(client) { this.client = client; }

    async create(userId, email, password, name) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        const sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
        localStorage.setItem('current_session_id', sessionId);
        localStorage.removeItem('google_session_expiry');
        // Store preferences in a user document
        await setDoc(doc(firestore, 'users', userCredential.user.uid), { name, email, prefs: {}, activeSessions: [sessionId] });
        return { $id: userCredential.user.uid, email, name, prefs: {} };
    }

    async createEmailPasswordSession(email, password) {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
        localStorage.setItem('current_session_id', sessionId);
        localStorage.removeItem('google_session_expiry');
        const userDocRef = doc(firestore, 'users', cred.user.uid);
        await updateDoc(userDocRef, {
            activeSessions: arrayUnion(sessionId)
        }).catch(async () => {
            await setDoc(userDocRef, { name: cred.user.displayName || 'User', email: cred.user.email, prefs: {}, activeSessions: [sessionId] });
        });
        return { $id: cred.user.uid, userId: cred.user.uid };
    }

    async get() {
        return new Promise((resolve, reject) => {
            const unsubscribe = onAuthStateChanged(auth, async (user) => {
                unsubscribe();
                if (user) {
                    try {
                        // Check if Google OAuth 1-Hour Session Limit has expired (only for sessions created via Google)
                        const googleSessionExpiry = localStorage.getItem('google_session_expiry');
                        if (googleSessionExpiry && Date.now() > Number(googleSessionExpiry)) {
                            console.warn('Google session expired (1 hour limit reached). Logging out.');
                            localStorage.removeItem('google_session_expiry');
                            localStorage.removeItem('remember_me');
                            sessionStorage.removeItem('session_active');
                            localStorage.removeItem('current_session_id');
                            await signOut(auth);
                            reject({ message: 'Google session expired' });
                            return;
                        }

                        const docSnap = await getDoc(doc(firestore, 'users', user.uid));
                        const data = docSnap.exists() ? docSnap.data() : { prefs: {} };
                        
                        // Check if session has been invalidated
                        const activeSessions = data.activeSessions || [];
                        const currentSessionId = localStorage.getItem('current_session_id');
                        
                        // If current session is no longer in activeSessions (meaning user logged out all devices), sign out
                        if (currentSessionId && !activeSessions.includes(currentSessionId)) {
                            await signOut(auth);
                            localStorage.removeItem('current_session_id');
                            localStorage.removeItem('remember_me');
                            sessionStorage.removeItem('session_active');
                            reject({ message: 'Session invalidated' });
                            return;
                        }

                        const prefs = data.prefs || {};

                        // ✅ FIX: Build labels array from Firestore prefs.role field.
                        // Firebase doesn't have Firebase-style user.labels, so we
                        // derive them from the Firestore user document.
                        // To make someone admin: Firebase Console → Firestore → users
                        //   → [uid] → prefs → role: "admin"
                        const labels = [];
                        if (prefs.role === 'admin') labels.push('admin');
                        if (data.labels && Array.isArray(data.labels)) {
                            data.labels.forEach(l => { if (!labels.includes(l)) labels.push(l); });
                        }

                        resolve({
                            $id: user.uid,
                            email: user.email,
                            name: user.displayName || data.name || 'User',
                            prefs,
                            labels, // Populated from Firestore — used by AdminRoute
                            phone: data.phone || prefs.phone || '',
                        });
                    } catch (error) {
                        console.warn("Firestore get user error, falling back to auth info:", error);
                        resolve({
                            $id: user.uid,
                            email: user.email,
                            name: user.displayName || 'User',
                            prefs: {},
                            labels: [],
                            phone: '',
                        });
                    }
                } else {
                    reject({ message: 'Not logged in' });
                }
            });
        });
    }


    async deleteSession(sessionId) {
        const currentSessionId = localStorage.getItem('current_session_id');
        if (auth.currentUser && currentSessionId) {
            const userDocRef = doc(firestore, 'users', auth.currentUser.uid);
            await updateDoc(userDocRef, {
                activeSessions: arrayRemove(currentSessionId)
            }).catch(() => {});
        }
        localStorage.removeItem('current_session_id');
        await signOut(auth);
        return true;
    }
    
    async deleteSessions() {
        if (auth.currentUser) {
            const userDocRef = doc(firestore, 'users', auth.currentUser.uid);
            await updateDoc(userDocRef, {
                activeSessions: []
            }).catch(() => {});
        }
        localStorage.removeItem('current_session_id');
        await signOut(auth);
        return true;
    }

    async updatePrefs(prefs) {
        if (!auth.currentUser) throw new Error('Not logged in');
        await updateDoc(doc(firestore, 'users', auth.currentUser.uid), { prefs });
        return { prefs };
    }

    async updateName(name) {
        if (!auth.currentUser) throw new Error('Not logged in');
        await updateProfile(auth.currentUser, { displayName: name });
        await updateDoc(doc(firestore, 'users', auth.currentUser.uid), { name });
        return await this.get();
    }

    async updatePhone(phone) {
        if (!auth.currentUser) throw new Error('Not logged in');
        const userDocRef = doc(firestore, 'users', auth.currentUser.uid);
        await updateDoc(userDocRef, { 
            phone,
            'prefs.phone': phone 
        }).catch(async () => {
            await setDoc(userDocRef, { phone, prefs: { phone } }, { merge: true });
        });
        return await this.get();
    }

    async updatePassword(password, oldPassword) {
        return true;
    }

    createOAuth2Session(provider, success, failure) {
        if (provider === 'google') {
            // Call signInWithPopup synchronously in event callstack for instant popup launch
            return signInWithPopup(auth, googleProvider)
                .then(async (result) => {
                    const user = result.user;
                    const sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
                    localStorage.setItem('current_session_id', sessionId);
                    localStorage.setItem('google_session_expiry', String(Date.now() + 60 * 60 * 1000));

                    const docRef = doc(firestore, 'users', user.uid);
                    try {
                        const docSnap = await getDoc(docRef);
                        if (!docSnap.exists()) {
                            await setDoc(docRef, { name: user.displayName, email: user.email, prefs: {}, activeSessions: [sessionId] });
                        } else {
                            await updateDoc(docRef, { activeSessions: arrayUnion(sessionId) });
                        }
                    } catch (err) {
                        console.warn('Firestore doc update warning:', err);
                    }

                    if (success && typeof window !== 'undefined') {
                        window.location.href = success;
                    }
                    return result;
                })
                .catch((error) => {
                    localStorage.removeItem('google_session_expiry');
                    console.error('OAuth error:', error);
                    throw error;
                });
        }
    }


    async createRecovery(email, url) {
        return await sendPasswordResetEmail(auth, email, { url: url || window.location.origin });
    }
    
    // In Firebase, userId is ignored. secret maps to oobCode.
    async updateRecovery(userId, secret, password, passwordAgain) {
        return await confirmPasswordReset(auth, secret, password);
    }
}

export class Databases {
    constructor(client) { this.client = client; }

    async createDocument(databaseId, collectionId, documentId, data, permissions = []) {
        let docRef;
        if (documentId === 'unique()') {
            docRef = doc(collection(firestore, collectionId));
        } else {
            docRef = doc(firestore, collectionId, documentId);
        }
        
        const payload = { ...data, $createdAt: new Date().toISOString(), $updatedAt: new Date().toISOString() };
        await setDoc(docRef, payload);
        return { $id: docRef.id, $collectionId: collectionId, ...payload };
    }

    async listDocuments(databaseId, collectionId, queries = []) {
        let q = collection(firestore, collectionId);
        
        const filterWheres = [];
        const sortOrders = []; // Array of { key, direction }
        let limitVal = null;

        // Parse queries
        queries.forEach(queryStr => {
            try {
                const parsed = JSON.parse(queryStr);
                if (parsed.type === 'equal') {
                    filterWheres.push(where(parsed.key, '==', parsed.value));
                } else if (parsed.type === 'orderDesc') {
                    sortOrders.push({ key: parsed.key, dir: 'desc' });
                } else if (parsed.type === 'orderAsc') {
                    sortOrders.push({ key: parsed.key, dir: 'asc' });
                } else if (parsed.type === 'limit') {
                    limitVal = parseInt(parsed.value, 10);
                }
            } catch {
                // Legacy string format fallback
                const equalMatch = queryStr.match(/equal\("([^"]+)",\s*\[?"?([^"\]]+)"?\]?\)/);
                if (equalMatch) filterWheres.push(where(equalMatch[1], '==', equalMatch[2]));
                const orderDescMatch = queryStr.match(/orderDesc\("([^"]+)"\)/);
                if (orderDescMatch) sortOrders.push({ key: orderDescMatch[1], dir: 'desc' });
                const limitMatch = queryStr.match(/limit\((\d+)\)/);
                if (limitMatch) limitVal = parseInt(limitMatch[1], 10);
            }
        });

        // 1. Build optimal query (with server-side orderBy + limit)
        let mainQuery = q;
        filterWheres.forEach(w => { mainQuery = query(mainQuery, w); });
        sortOrders.forEach(s => { mainQuery = query(mainQuery, orderBy(s.key, s.dir)); });
        if (limitVal !== null) { mainQuery = query(mainQuery, limit(limitVal)); }

        let querySnapshot;
        try {
            querySnapshot = await getDocs(mainQuery);
        } catch (err) {
            // Check if error is due to missing index or sorting constraints
            const errorMsg = err.message || '';
            if (sortOrders.length > 0 && (errorMsg.includes('index') || errorMsg.includes('FAILED_PRECONDITION') || errorMsg.includes('orderBy'))) {
                console.warn(`⚠️ Firestore composite index missing for collection "${collectionId}". Falling back to client-side sorting & limit.`, err.message);
                
                // 2. Build fallback query (where clauses ONLY — never require composite indexes)
                let fallbackQuery = q;
                filterWheres.forEach(w => { fallbackQuery = query(fallbackQuery, w); });
                
                querySnapshot = await getDocs(fallbackQuery);
                
                // Map documents
                let documents = querySnapshot.docs.map(d => ({
                    $id: d.id,
                    $collectionId: collectionId,
                    ...d.data()
                }));

                // Apply client-side sorting
                sortOrders.forEach(s => {
                    documents.sort((a, b) => {
                        let valA = a[s.key];
                        let valB = b[s.key];
                        // Handle date parsing if sorting by date fields like $createdAt
                        if (s.key === '$createdAt' || s.key === 'createdAt' || s.key === '$updatedAt' || s.key === 'updatedAt') {
                            valA = new Date(valA || 0).getTime();
                            valB = new Date(valB || 0).getTime();
                        }
                        if (valA < valB) return s.dir === 'desc' ? 1 : -1;
                        if (valA > valB) return s.dir === 'desc' ? -1 : 1;
                        return 0;
                    });
                });

                // Apply client-side limit
                if (limitVal !== null) {
                    documents = documents.slice(0, limitVal);
                }

                return { total: documents.length, documents };
            } else {
                throw err; // Re-throw other unexpected errors
            }
        }

        const documents = querySnapshot.docs.map(d => ({
            $id: d.id,
            $collectionId: collectionId,
            ...d.data()
        }));

        return { total: documents.length, documents };
    }



    async updateDocument(databaseId, collectionId, documentId, data) {
        const docRef = doc(firestore, collectionId, documentId);
        const payload = { ...data, $updatedAt: new Date().toISOString() };
        await updateDoc(docRef, payload);
        const updated = await getDoc(docRef);
        return { $id: updated.id, $collectionId: collectionId, ...updated.data() };
    }

    async deleteDocument(databaseId, collectionId, documentId) {
        await deleteDoc(doc(firestore, collectionId, documentId));
        return true;
    }

    async getDocument(databaseId, collectionId, documentId) {
        const docRef = doc(firestore, collectionId, documentId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { $id: docSnap.id, $collectionId: collectionId, ...docSnap.data() };
        }
        throw new Error('Document not found');
    }
}

export class Storage {
    constructor(client) { this.client = client; }

    async createFile(bucketId, fileId, file) {
        const workerUrl = import.meta.env.VITE_CLOUDFLARE_WORKER_URL || "https://b2-upload-gateway.chandumakavana61.workers.dev/";
        
        // If Backblaze/Cloudflare Worker is configured, route uploads there!
        if (workerUrl) {
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await fetch(workerUrl, {
                method: 'POST',
                body: formData,
            });
            
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Cloudflare/Backblaze Upload Error: ${text}`);
            }
            
            const data = await response.json();
            // Worker returns { url: "https://..." }
            return { $id: data.url };
        }

        // Fallback to Firebase Storage
        const uniqueId = fileId === 'unique()' ? Date.now().toString() : fileId;
        const storageRef = ref(firebaseStorage, `${bucketId}/${uniqueId}_${file.name}`);
        await uploadBytes(storageRef, file);
        return { $id: storageRef.fullPath };
    }

    getFileView(fileId, bucketId) {
        // If fileId is already a full URL (like from Backblaze), just return it
        if (fileId && (fileId.startsWith('http://') || fileId.startsWith('https://'))) {
            return fileId;
        }
        return `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${encodeURIComponent(fileId)}?alt=media`;
    }
    
    async deleteFile(bucketId, fileId) {
        // Mock
        return true;
    }
}

export class Query {
    // ✅ FIX: Store query as structured object instead of a regex-parsed string.
    // Previously: equal("userId", ["abc123"]) was parsed with regex — fragile for special chars.
    // Now: each query is a plain object { type, key, value } parsed reliably in listDocuments.
    static equal(key, value) {
        return JSON.stringify({ type: 'equal', key, value: String(value) });
    }
    static orderDesc(key) {
        return JSON.stringify({ type: 'orderDesc', key });
    }
    static orderAsc(key) {
        return JSON.stringify({ type: 'orderAsc', key });
    }
    static search(key, value) {
        return JSON.stringify({ type: 'search', key, value: String(value) });
    }
    static limit(num) {
        return JSON.stringify({ type: 'limit', value: num });
    }
}

export const ID = {
    unique: () => 'unique()'
};
