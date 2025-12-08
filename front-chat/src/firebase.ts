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
  apiKey: "AIzaSyBal4-zGj8Z24nlv0DwhsQ7rJICqEeXSMk",
  authDomain: "test-7fc88.firebaseapp.com",
  projectId: "test-7fc88",
  storageBucket: "test-7fc88.firebasestorage.app",
  messagingSenderId: "1048129977962",
  appId: "1:1048129977962:web:44c769b50faf305ea71413"
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