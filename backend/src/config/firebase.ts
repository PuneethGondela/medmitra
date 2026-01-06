// backend/src/config/firebase.ts
// Firebase Admin SDK configuration for backend
import { adminAuth, adminDb, adminStorage } from '../lib/firebase-admin';

export { adminAuth, adminDb, adminStorage };

// Firestore collection names
export const COLLECTIONS = {
  ADMINS: 'admins',
  DOCTORS: 'doctors',
  WORKERS: 'workers',
  BLOOD_DONORS: 'blood_donors',
  AUDIT_LOGS: 'audit_logs',
  USERS: 'users',
  RECORDS: 'records',
  ML_RESPONSES: 'ml_responses',
} as const;

// Helper function to get Firestore document reference
export const getDocRef = (collection: string, id: string) => {
  return adminDb.collection(collection).doc(id);
};

// Helper function to get Firestore collection reference
export const getCollectionRef = (collection: string) => {
  return adminDb.collection(collection);
};
