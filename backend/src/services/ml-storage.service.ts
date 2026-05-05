/**
 * ML Response Storage Service
 * Stores all ML/AI bot responses in Firestore for history and analytics
 */

import { adminDb, COLLECTIONS } from '../config/firebase';
import { FieldValue } from 'firebase-admin/firestore';

interface MLResponseData {
  userId?: string;
  userType?: 'ADMIN' | 'DOCTOR' | 'USER' | 'WORKER';
  role?: string;
  query: string;
  response: string;
  contextUsed?: boolean;
  model?: string;
  tokensUsed?: number;
  timestamp?: FirebaseFirestore.Timestamp;
  metadata?: {
    endpoint?: string;
    temperature?: number;
    maxTokens?: number;
  };
}

/**
 * Store ML chat response
 */
export const storeMLResponse = async (data: MLResponseData): Promise<string> => {
  try {
    const docRef = await adminDb.collection(COLLECTIONS.ML_RESPONSES || 'ml_responses').add({
      ...data,
      timestamp: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    console.error('Error storing ML response:', error);
    throw error;
  }
};

/**
 * Get ML response history for a user
 */
export const getMLResponseHistory = async (
  userId?: string,
  limitCount: number = 50
): Promise<MLResponseData[]> => {
  try {
    let query = adminDb.collection(COLLECTIONS.ML_RESPONSES || 'ml_responses')
      .orderBy('timestamp', 'desc')
      .limit(limitCount);

    if (userId) {
      query = query.where('userId', '==', userId) as any;
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as unknown as MLResponseData[];
  } catch (error) {
    console.error('Error getting ML response history:', error);
    return [];
  }
};

/**
 * Store system analysis response
 */
export const storeAnalysisResponse = async (
  adminId: string,
  query: string,
  analysis: string,
  contextData: any
): Promise<string> => {
  try {
    const docRef = await adminDb.collection('ml_analysis_responses').add({
      adminId,
      query,
      analysis,
      contextData,
      timestamp: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    console.error('Error storing analysis response:', error);
    throw error;
  }
};
