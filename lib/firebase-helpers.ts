// lib/firebase-helpers.ts - Helper functions to replace Supabase patterns
import { db, auth, storage } from './firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  orderBy,
  limit,
  startAt,
  endAt,
  Timestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { onAuthStateChanged, User } from 'firebase/auth';

/**
 * Firebase helper to replace Supabase patterns
 */

// Get current user (replaces supabase.auth.getUser())
export const getCurrentUser = async (): Promise<User | null> => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
};

// Get user session (replaces supabase.auth.getSession())
export const getSession = async (): Promise<{ user: User | null } | null> => {
  const user = await getCurrentUser();
  return user ? { user } : null;
};

// Query collection (replaces supabase.from("table").select())
export const queryCollection = async (
  collectionName: string,
  filters?: Array<{ field: string; operator: any; value: any }>,
  orderByField?: string,
  orderDirection?: 'asc' | 'desc',
  limitCount?: number
) => {
  let q: any = collection(db, collectionName);

  // Apply filters
  if (filters && filters.length > 0) {
    filters.forEach(filter => {
      q = query(q, where(filter.field, filter.operator, filter.value));
    });
  }

  // Apply ordering
  if (orderByField) {
    q = query(q, orderBy(orderByField, orderDirection || 'desc'));
  }

  // Apply limit
  if (limitCount) {
    q = query(q, limit(limitCount));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...(doc.data() as object)
  }));
};

// Get single document
export const getDocument = async (collectionName: string, docId: string) => {
  const docRef = doc(db, collectionName, docId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...(docSnap.data() as object) };
  }
  return null;
};

// Insert document (replaces supabase.from("table").insert())
export const insertDocument = async (collectionName: string, data: any) => {
  const docRef = await addDoc(collection(db, collectionName), {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
  return docRef.id;
};

// Update document (replaces supabase.from("table").update())
export const updateDocument = async (
  collectionName: string,
  docId: string,
  data: any
) => {
  const docRef = doc(db, collectionName, docId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now()
  });
};

// Upload file to storage (replaces supabase.storage.from("bucket").upload())
export const uploadFile = async (
  bucket: string,
  path: string,
  file: File | Blob
): Promise<string> => {
  const storageRef = ref(storage, `${bucket}/${path}`);
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
};

// Get public URL (replaces supabase.storage.from("bucket").getPublicUrl())
export const getFileUrl = async (bucket: string, path: string): Promise<string> => {
  const storageRef = ref(storage, `${bucket}/${path}`);
  return await getDownloadURL(storageRef);
};

// Count documents (replaces supabase.select("*", { count: "exact", head: true }))
export const countDocuments = async (
  collectionName: string,
  filters?: Array<{ field: string; operator: any; value: any }>
): Promise<number> => {
  const data = await queryCollection(collectionName, filters);
  return data.length;
};
