import { auth, db as firestore, storage as firebaseStorage, googleProvider } from './config';
import { 
  createUserWithEmailAndPassword, signInWithEmailAndPassword, 
  signOut, onAuthStateChanged, updateProfile, signInWithPopup, signInWithRedirect, getRedirectResult,
  sendPasswordResetEmail, confirmPasswordReset, updatePassword as updateAuthPassword,
  EmailAuthProvider, reauthenticateWithCredential
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
        const sessionId = crypto.randomUUID();
        localStorage.setItem('current_session_id', sessionId);
        localStorage.removeItem('google_session_expiry');
        // Store preferences in a user document
        await setDoc(doc(firestore, 'users', userCredential.user.uid), { name, email, prefs: {}, activeSessions: [sessionId] });
        return { $id: userCredential.user.uid, email, name, prefs: {} };
    }

    async createEmailPasswordSession(email, password) {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const sessionId = crypto.randomUUID();
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
            const checkUser = async (user) => {
                if (user) {
                    try {
                        // Check if Google session expiry limit has reached
                        const googleSessionExpiry = localStorage.getItem('google_session_expiry');
                        if (googleSessionExpiry && Date.now() > Number(googleSessionExpiry)) {
                            console.warn('Google session expired. Logging out.');
                            localStorage.removeItem('google_session_expiry');
                            localStorage.removeItem('remember_me');
                            sessionStorage.removeItem('session_active');
                            localStorage.removeItem('current_session_id');
                            await signOut(auth);
                            reject({ message: 'Google session expired' });
                            return;
                        }

                        let currentSessionId = localStorage.getItem('current_session_id');
                        if (!currentSessionId) {
                            currentSessionId = crypto.randomUUID();
                            localStorage.setItem('current_session_id', currentSessionId);
                        }

                        let data = { prefs: {} };
                        try {
                            const docSnap = await getDoc(doc(firestore, 'users', user.uid));
                            if (docSnap.exists()) data = docSnap.data();
                        } catch (docErr) {
                            console.warn("Firestore getDoc warning (falling back):", docErr);
                        }

                        const prefs = data.prefs || {};
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
                            labels,
                            phone: data.phone || prefs.phone || '',
                        });
                    } catch (error) {
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
            };

            if (auth.currentUser) {
                checkUser(auth.currentUser);
                return;
            }

            const unsubscribe = onAuthStateChanged(auth, (user) => {
                unsubscribe();
                checkUser(user);
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
        if (!auth.currentUser) throw new Error("No user is currently signed in.");
        // Re-authenticate before password change (required by Firebase for sessions older than ~5 min)
        if (oldPassword && auth.currentUser.email) {
            const credential = EmailAuthProvider.credential(auth.currentUser.email, oldPassword);
            await reauthenticateWithCredential(auth.currentUser, credential);
        }
        await updateAuthPassword(auth.currentUser, password);
        return true;
    }

    async createOAuth2Session(provider, success, failure) {
        if (provider === 'google') {
            const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
            // Detect iOS, iPadOS (including desktop mode on iPad), and macOS Safari
            const isIOS = (/iPad|iPhone|iPod/.test(ua) || (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) && !window.MSStream;
            const isCriOS = /CriOS/.test(ua);
            const isSafari = /^((?!chrome|android).)*safari/i.test(ua);

            // Store redirect URLs in sessionStorage for redirect completion
            if (success) sessionStorage.setItem('google_redirect_success', success);
            if (failure) sessionStorage.setItem('google_redirect_failure', failure);

            // macOS Safari and iOS block signInWithPopup due to popup blockers & ITP cross-site tracking restrictions.
            // Using signInWithRedirect guarantees reliable login across Mac & iOS.
            const useRedirect = isIOS || isCriOS || isSafari;

            if (useRedirect) {
                return signInWithRedirect(auth, googleProvider);
            }

            // Desktop (Chrome / Firefox / Edge / Mac) — use popup with seamless redirect fallback
            try {
                const result = await signInWithPopup(auth, googleProvider);
                return await this._handleGoogleResult(result, success, false);
            } catch (error) {
                console.warn('Popup login failed, attempting redirect fallback. Reason:', error.code || error.message);
                // If popup was blocked or blocked by browser security/ITP, fallback to redirect
                if (
                    error.code === 'auth/popup-blocked' ||
                    error.code === 'auth/cancelled-popup-request' ||
                    error.code === 'auth/internal-error' ||
                    error.code === 'auth/network-request-failed'
                ) {
                    return signInWithRedirect(auth, googleProvider);
                }
                localStorage.removeItem('google_session_expiry');
                throw error;
            }
        }
    }

    // Shared post-sign-in logic for both popup and redirect flows
    async _handleGoogleResult(result, successUrl, shouldRedirect = true) {
        const user = result.user;
        let sessionId = localStorage.getItem('current_session_id');
        if (!sessionId) {
            sessionId = crypto.randomUUID();
            localStorage.setItem('current_session_id', sessionId);
        }

        // Always persist Google login session across page refreshes and browser restarts
        localStorage.setItem('remember_me', 'true');
        sessionStorage.setItem('session_active', 'true');
        sessionStorage.removeItem('dismissed_phone_prompt');

        // Set expiration to 12:00 AM (midnight) of the next day
        const nextMidnight = new Date();
        nextMidnight.setDate(nextMidnight.getDate() + 1);
        nextMidnight.setHours(0, 0, 0, 0);
        localStorage.setItem('google_session_expiry', String(nextMidnight.getTime()));

        const docRef = doc(firestore, 'users', user.uid);
        try {
            const docSnap = await getDoc(docRef);
            if (!docSnap.exists()) {
                await setDoc(docRef, { name: user.displayName || 'User', email: user.email, prefs: {}, activeSessions: [sessionId] }, { merge: true });
            } else {
                await updateDoc(docRef, { activeSessions: arrayUnion(sessionId) });
            }
        } catch (err) {
            console.warn('Firestore user document update warning:', err);
        }

        if (shouldRedirect && successUrl && typeof window !== 'undefined') {
            const currentPath = window.location.pathname;
            const targetPath = new URL(successUrl, window.location.origin).pathname;
            if (currentPath !== targetPath) {
                window.location.href = successUrl;
            }
        }
        return result;
    }

    // Call this on app mount to complete an iOS/Mac redirect sign-in
    async resolveRedirectResult() {
        try {
            const result = await getRedirectResult(auth);
            if (result) {
                const successUrl = sessionStorage.getItem('google_redirect_success') || '/';
                sessionStorage.removeItem('google_redirect_success');
                sessionStorage.removeItem('google_redirect_failure');
                // shouldRedirect = false because App.jsx is already mounting and will seamlessly pick up the user!
                await this._handleGoogleResult(result, successUrl, false);
                return result.user;
            }
        } catch (error) {
            localStorage.removeItem('google_session_expiry');
            const failureUrl = sessionStorage.getItem('google_redirect_failure') || '/login';
            sessionStorage.removeItem('google_redirect_success');
            sessionStorage.removeItem('google_redirect_failure');
            console.error('Redirect result error:', error);
            if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
                window.location.href = failureUrl;
            }
        }
        return null;
    }


    async createRecovery(email, url) {
        try {
            if (url && !url.includes('localhost') && !url.includes('127.0.0.1')) {
                return await sendPasswordResetEmail(auth, email, { url });
            }
            return await sendPasswordResetEmail(auth, email);
        } catch (error) {
            console.warn("⚠️ Firebase createRecovery url-based send failed, falling back to default:", error.message);
            // Fallback without actionCodeSettings (guaranteed to work in localhost & prod)
            return await sendPasswordResetEmail(auth, email);
        }
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
        filterWheres.forEach(clause => { mainQuery = query(mainQuery, clause); });
        sortOrders.forEach(sort => { mainQuery = query(mainQuery, orderBy(sort.key, sort.dir)); });
        if (limitVal !== null) { mainQuery = query(mainQuery, limit(limitVal)); }

        let querySnapshot;
        try {
            querySnapshot = await getDocs(mainQuery);
        } catch (err) {
            console.warn(`⚠️ Firestore query error for collection "${collectionId}". Falling back to client-side sorting & limit. Reason:`, err.message);
            
            // 2. Build fallback query (where clauses ONLY — never require composite indexes or complex sorting)
            try {
                let fallbackQuery = q;
                filterWheres.forEach(clause => { fallbackQuery = query(fallbackQuery, clause); });
                querySnapshot = await getDocs(fallbackQuery);
            } catch (fallbackErr) {
                console.warn(`⚠️ Filtered query fallback failed, reading base collection "${collectionId}":`, fallbackErr.message);
                querySnapshot = await getDocs(q);
            }
            
            // Map documents
            let documents = querySnapshot.docs.map(d => ({
                $id: d.id,
                $collectionId: collectionId,
                ...d.data()
            }));

            // Apply client-side sorting
            if (sortOrders.length > 0) {
                sortOrders.forEach(s => {
                    documents.sort((a, b) => {
                        let valA = a[s.key];
                        let valB = b[s.key];
                        // Handle date parsing if sorting by date fields
                        if (s.key === '$createdAt' || s.key === 'createdAt' || s.key === '$updatedAt' || s.key === 'updatedAt' || s.key === 'created_at') {
                            valA = new Date(a.$createdAt || a.createdAt || a.created_at || a.$updatedAt || a.updatedAt || a.date || 0).getTime();
                            valB = new Date(b.$createdAt || b.createdAt || b.created_at || b.$updatedAt || b.updatedAt || b.date || 0).getTime();
                        }
                        if (valA < valB) return s.dir === 'desc' ? 1 : -1;
                        if (valA > valB) return s.dir === 'desc' ? -1 : 1;
                        return 0;
                    });
                });
            }

            // Apply client-side limit
            if (limitVal !== null) {
                documents = documents.slice(0, limitVal);
            }

            return { total: documents.length, documents };
        }

        let documents = querySnapshot.docs.map(d => ({
            $id: d.id,
            $collectionId: collectionId,
            ...d.data()
        }));

        // In case documents were missing $createdAt and weren't ordered properly, ensure safe descending order if orderDesc was requested
        if (sortOrders.some(s => s.key === '$createdAt' || s.key === 'createdAt')) {
            documents.sort((a, b) => {
                const valA = new Date(a.$createdAt || a.createdAt || a.created_at || a.$updatedAt || a.date || 0).getTime();
                const valB = new Date(b.$createdAt || b.createdAt || b.created_at || b.$updatedAt || b.date || 0).getTime();
                return valB - valA;
            });
        }

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
        const workerUrl = import.meta.env.VITE_CLOUDFLARE_WORKER_URL || "";
        
        // If Backblaze/Cloudflare Worker is configured, route uploads there!
        if (workerUrl) {
            try {
                const formData = new FormData();
                formData.append('file', file);
                
                const response = await fetch(workerUrl, {
                    method: 'POST',
                    body: formData,
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.url) {
                        return { $id: data.url };
                    }
                }
                console.warn("Cloudflare Worker in adapter returned non-ok status or missing URL, falling back to Firebase Storage.");
            } catch (err) {
                console.warn("Cloudflare Worker upload in adapter failed, falling back to Firebase Storage:", err.message);
            }
        }

        // Fallback to Firebase Storage
        const uniqueId = fileId === 'unique()' ? Date.now().toString() : fileId;
        const storageRef = ref(firebaseStorage, `${bucketId}/${uniqueId}_${file.name}`);
        await uploadBytes(storageRef, file);
        try {
            const downloadUrl = await getDownloadURL(storageRef);
            return { $id: downloadUrl };
        } catch {
            const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'vakrayan-9ce25.firebasestorage.app';
            return { $id: `https://firebasestorage.googleapis.com/v0/b/${storageBucket}/o/${encodeURIComponent(storageRef.fullPath)}?alt=media` };
        }
    }

    getFileView(fileId, bucketId) {
        if (!fileId) return '';
        if (typeof fileId === 'object' && fileId !== null) {
            fileId = fileId.$id || fileId.url || fileId.id || fileId.href || '';
        }
        if (typeof fileId !== 'string') return '';
        fileId = fileId.trim();

        // If fileId is already a full URL (like from Backblaze or Firebase Storage getDownloadURL), just return it
        if (fileId.startsWith('http://') || fileId.startsWith('https://')) {
            if (fileId.includes('chandumakavana61.workers.dev')) {
                return fileId.replace(/b2-upload-gateway\.chandumakavana61\.workers\.dev/g, 'b2-upload-gateway.vakrayan.workers.dev')
                             .replace(/vakrayan-data\.chandumakavana61\.workers\.dev/g, 'b2-upload-gateway.vakrayan.workers.dev')
                             .replace(/chandumakavana61\.workers\.dev/g, 'vakrayan.workers.dev');
            }
            return fileId;
        }
        const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '';
        return `https://firebasestorage.googleapis.com/v0/b/${storageBucket}/o/${encodeURIComponent(fileId)}?alt=media`;
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
