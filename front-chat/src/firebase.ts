// src/firebase.ts
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  type User 
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc 
} from "firebase/firestore";

const firebaseConfig = {
  
};

// --- Инициализация ---
const app = initializeApp(firebaseConfig);

// --- Auth ---
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// --- Firestore ---
export const db = getFirestore(app);

// --- Миграция пользователя в Firestore ---
export async function migrateUserToFirestore(user: User) {
  if (!user) return;

  const userRef = doc(db, "users", user.uid);
  await setDoc(
    userRef,
    {
      uid: user.uid,
      name: user.displayName || "",
      email: user.email || "",
      photoURL: user.photoURL || "",
      createdAt: new Date().toISOString(),
    },
    { merge: true } // не перезаписывает существующие поля
  );
}

// --- Логин через Google с миграцией ---
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    await migrateUserToFirestore(user);
    return user;
  } catch (error) {
    console.error("Google sign-in error:", error);
    throw error;
  }
}

// --- Можно добавить выход ---
export async function signOutUser() {
  await auth.signOut();
}
