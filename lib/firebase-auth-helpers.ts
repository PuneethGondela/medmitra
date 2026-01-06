// lib/firebase-auth-helpers.ts
// Helper functions for Firebase Authentication operations

import { auth, db } from './firebase';
import { 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  sendPasswordResetEmail,
  updatePassword,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';

// Get current authenticated user
export function getCurrentUser(): Promise<User | null> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

// Register a new user
export async function registerUser(email: string, password: string, userData: any) {
  try {
    // Create auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const userId = userCredential.user.uid;

    // Create user profile in Firestore
    await setDoc(doc(db, 'users', userId), {
      ...userData,
      email,
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
    });

    return { user: userCredential.user, userId };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to register user');
  }
}

// Sign out user
export async function signOutUser() {
  await signOut(auth);
}

// Reset password
export async function resetPassword(email: string) {
  await sendPasswordResetEmail(auth, email);
}

// Update user password
export async function changePassword(newPassword: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('No user signed in');
  await updatePassword(user, newPassword);
}

// Update user profile
export async function updateUserProfile(displayName?: string, photoURL?: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('No user signed in');
  await updateProfile(user, { displayName, photoURL });
}
