// lib/firebase.ts
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Your Firebase configuration
// Your Firebase configuration
// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDdpokdT-dDdUuIWvNN-mtTH_5IsbLiARs",
  authDomain: "medi-mitr.firebaseapp.com",
  projectId: "medi-mitr",
  storageBucket: "medi-mitr.firebasestorage.app",
  messagingSenderId: "967473285294",
  appId: "1:967473285294:web:d0b9efcde34f98ffec053f",
  measurementId: "G-9TQP9NZHCH"
};
// Note: Using hardcoded values temporarily to resolve environment loading issues.
console.log("Firebase Config (Hardcoded):", {
  apiKey: firebaseConfig.apiKey ? "Present" : "MISSING",
  projectId: firebaseConfig.projectId
});

// Initialize Firebase (avoid duplicate initialization)
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
