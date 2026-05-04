"use strict";
/**
 * ML Response Storage Service
 * Stores all ML/AI bot responses in Firestore for history and analytics
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeAnalysisResponse = exports.getMLResponseHistory = exports.storeMLResponse = void 0;
const firebase_1 = require("../config/firebase");
const firestore_1 = require("firebase-admin/firestore");
/**
 * Store ML chat response
 */
const storeMLResponse = (data) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const docRef = yield firebase_1.adminDb.collection(firebase_1.COLLECTIONS.ML_RESPONSES || 'ml_responses').add(Object.assign(Object.assign({}, data), { timestamp: firestore_1.FieldValue.serverTimestamp(), createdAt: firestore_1.FieldValue.serverTimestamp() }));
        return docRef.id;
    }
    catch (error) {
        console.error('Error storing ML response:', error);
        throw error;
    }
});
exports.storeMLResponse = storeMLResponse;
/**
 * Get ML response history for a user
 */
const getMLResponseHistory = (userId_1, ...args_1) => __awaiter(void 0, [userId_1, ...args_1], void 0, function* (userId, limitCount = 50) {
    try {
        let query = firebase_1.adminDb.collection(firebase_1.COLLECTIONS.ML_RESPONSES || 'ml_responses')
            .orderBy('timestamp', 'desc')
            .limit(limitCount);
        if (userId) {
            query = query.where('userId', '==', userId);
        }
        const snapshot = yield query.get();
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    }
    catch (error) {
        console.error('Error getting ML response history:', error);
        return [];
    }
});
exports.getMLResponseHistory = getMLResponseHistory;
/**
 * Store system analysis response
 */
const storeAnalysisResponse = (adminId, query, analysis, contextData) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const docRef = yield firebase_1.adminDb.collection('ml_analysis_responses').add({
            adminId,
            query,
            analysis,
            contextData,
            timestamp: firestore_1.FieldValue.serverTimestamp(),
            createdAt: firestore_1.FieldValue.serverTimestamp(),
        });
        return docRef.id;
    }
    catch (error) {
        console.error('Error storing analysis response:', error);
        throw error;
    }
});
exports.storeAnalysisResponse = storeAnalysisResponse;
