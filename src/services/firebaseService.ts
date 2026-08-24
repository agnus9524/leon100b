import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, signInAnonymously } from 'firebase/auth';
import { 
  initializeFirestore,
  doc, 
  getDoc, 
  getDocFromServer,
  collection, 
  getDocs, 
  updateDoc, 
  setDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use initializeFirestore with long polling to bypass potential gRPC-web issues in restricted environments
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

export const googleProvider = new GoogleAuthProvider();

// Skill requirement: Validate connection to Firestore on boot
async function testConnection() {
  try {
    const testDoc = doc(db, '_internal_', 'connection_test');
    await getDocFromServer(testDoc);
    console.log("Firestore connection verified successfully.");
  } catch (error: any) {
    if (error?.message?.includes('the client is offline') || error?.code === 'unavailable') {
      console.warn("Firestore is currently unavailable or offline. This may be transient.");
    }
  }
}
testConnection();

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // We throw a generic error message for the UI but log the full JSON for the system
  throw new Error(error instanceof Error ? error.message : String(error));
}

export const checkLicense = async (userId: string) => {
  const path = `licenses/${userId}`;
  try {
    const docRef = doc(db, 'licenses', userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      const expiresAt = new Date(data.expiresAt);
      const isExpired = expiresAt < new Date();
      
      return {
        isValid: data.status === 'active' && !isExpired,
        data: data
      };
    }
    return { isValid: false, data: null };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return { isValid: false, data: null };
  }
};

// Admin Functions
export const getAllLicenses = async () => {
  const path = 'licenses';
  try {
    const q = query(collection(db, 'licenses'), orderBy('updatedAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
};

export const updateLicense = async (userId: string, data: any) => {
  const path = `licenses/${userId}`;
  try {
    const docRef = doc(db, 'licenses', userId);
    await setDoc(docRef, { ...data, updatedAt: serverTimestamp() }, { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
};

export const deleteLicense = async (userId: string) => {
  const path = `licenses/${userId}`;
  try {
    const docRef = doc(db, 'licenses', userId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    return false;
  }
};

export const deleteAuthKeyDoc = async (keyText: string) => {
  const path = `authKeys/${keyText}`;
  try {
    const keyRef = doc(db, 'authKeys', keyText);
    await deleteDoc(keyRef);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    return false;
  }
};

// --- Auth Key System ---

/**
 * Admin: Generate a random auth key
 */
export const generateAuthKey = async (durationDays: number = 30) => {
  const path = 'authKeys';
  try {
    const keyText = Array.from({ length: 4 }, () => 
      Math.random().toString(36).substring(2, 6).toUpperCase()
    ).join('-'); // 형식: XXXX-XXXX-XXXX-XXXX
    
    const keyRef = doc(db, 'authKeys', keyText);
    await setDoc(keyRef, {
      status: 'unused',
      durationDays,
      createdAt: serverTimestamp(),
      createdBy: auth.currentUser?.uid
    });
    
    return keyText;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
};

/**
 * User: Login or Activate a license using an auth key
 */
export const loginWithKey = async (keyText: string) => {
  try {
    // 1. MUST be signed in (e.g., via Google) to activate/login with a key
    const user = auth.currentUser;
    if (!user) {
      throw new Error("먼저 로그인을 진행해주세요.");
    }
    const userId = user.uid;

    const keyRef = doc(db, 'authKeys', keyText);
    const keySnap = await getDoc(keyRef);
    
    if (!keySnap.exists()) throw new Error("존재하지 않는 인증키입니다.");
    
    const keyData = keySnap.data();
    
    // Check if the key is already used by someone else
    // If it's used, we allow "transferring" or "re-linking" to simple use the key as login
    const originalUserId = keyData.usedBy || userId;
    
    const durationDays = keyData.durationDays || 30;
    let expiryDate: Date;
    
    if (keyData.status === 'unused') {
      // First time activation
      expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + durationDays);
    } else {
      // Re-login using existing key: check current expiration
      const licRef = doc(db, 'licenses', originalUserId);
      const licSnap = await getDoc(licRef);
      if (!licSnap.exists()) throw new Error("라이선스 정보를 찾을 수 없습니다.");
      expiryDate = new Date(licSnap.data().expiresAt);
    }
    
    if (expiryDate < new Date()) {
      throw new Error("만료된 인증키/라이선스입니다.");
    }

    const batch = writeBatch(db);
    
    // Update/Link the key to the current device's UID
    batch.set(keyRef, {
      status: 'used',
      usedBy: userId,
      usedAt: serverTimestamp()
    }, { merge: true });
    
    const licenseRef = doc(db, 'licenses', userId);
    // Get existing to preserve createdAt if exists
    const existingSnap = await getDoc(licenseRef);
    const existingData = existingSnap.exists() ? existingSnap.data() : {};
    
    batch.set(licenseRef, {
      userId,
      email: user.email,
      status: 'active',
      expiresAt: expiryDate.toISOString(),
      updatedAt: serverTimestamp(),
      createdAt: existingData.createdAt || serverTimestamp(),
      key: keyText
    }, { merge: true });
    
    await batch.commit();
    return { success: true, expiryDate };
  } catch (error: any) {
    console.error("Error logging in with key:", error);
    return { success: false, message: error.message };
  }
};

/**
 * User: Activate a license using an auth key
 */
export const activateLicenseWithKey = async (userId: string, keyText: string) => {
  return loginWithKey(keyText); // Simplified to use the same logic
};

/**
 * Admin: Get all auth keys
 */
export const getAllAuthKeys = async () => {
  const path = 'authKeys';
  try {
    const q = query(collection(db, 'authKeys'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
};

export const saveUserKISConfig = async (userId: string, config: any) => {
  const path = `userSettings/${userId}`;
  try {
    const docRef = doc(db, 'userSettings', userId);
    await setDoc(docRef, { kisConfig: config, updatedAt: serverTimestamp() }, { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
};

export const getUserSettings = async (userId: string) => {
  const path = `userSettings/${userId}`;
  try {
    const docRef = doc(db, 'userSettings', userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
};

export const saveUserHoldings = async (userId: string, holdings: any) => {
  const path = `userSettings/${userId}`;
  try {
    const docRef = doc(db, 'userSettings', userId);
    await setDoc(docRef, { holdings, updatedAt: serverTimestamp() }, { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
};

export const saveUserKISToken = async (userId: string, token: string, expiresAt: number) => {
  const path = `userSettings/${userId}`;
  try {
    const docRef = doc(db, 'userSettings', userId);
    await setDoc(docRef, { kisTokenReal: { token, expiresAt }, updatedAt: serverTimestamp() }, { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
};

export { signInWithPopup, signOut, signInAnonymously };
