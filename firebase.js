import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, doc, setDoc, getDocs,
  getDoc, query, orderBy, deleteDoc,
} from "firebase/firestore";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
} from "firebase/auth";

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db  = getFirestore(app);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// ─── AUTH ────────────────────────────────────────────────────────────────────
export const signInWithGoogle = () => signInWithPopup(auth, googleProvider).then(r => r.user);
export const signOutUser      = () => signOut(auth);
export const onAuth           = (cb) => onAuthStateChanged(auth, cb);

// ─── ADMIN CHECK ─────────────────────────────────────────────────────────────
export async function isAdmin(email) {
  if (!email) return false;
  // Super-admin from env (first admin, no DB needed)
  if (email === import.meta.env.VITE_SUPER_ADMIN_EMAIL) return true;
  const snap = await getDoc(doc(db, "admins", emailKey(email)));
  return snap.exists();
}

// ─── ADMIN MANAGEMENT ────────────────────────────────────────────────────────
export async function promoteToAdmin(email, promotedByEmail) {
  await setDoc(doc(db, "admins", emailKey(email)), {
    email,
    promotedBy: promotedByEmail,
    createdAt: new Date().toISOString(),
  });
}

export async function getAllAdmins() {
  const snap = await getDocs(collection(db, "admins"));
  return snap.docs.map(d => d.data());
}

export async function removeAdmin(email) {
  await deleteDoc(doc(db, "admins", emailKey(email)));
}

// ─── USERS ───────────────────────────────────────────────────────────────────
export async function saveUser(data) {
  const key = phoneKey(data.phone);
  const existing = await getDoc(doc(db, "users", key));
  await setDoc(doc(db, "users", key), {
    ...data,
    createdAt: existing.exists() ? existing.data().createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

export async function getAllUsers() {
  const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function deleteUser(phone) {
  await deleteDoc(doc(db, "users", phoneKey(phone)));
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function phoneKey(phone) { return phone.replace(/\D/g, ""); }
function emailKey(email) { return email.toLowerCase().replace(/[@.]/g, "_"); }
