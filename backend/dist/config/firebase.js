"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCollectionRef = exports.getDocRef = exports.COLLECTIONS = exports.adminStorage = exports.adminDb = exports.adminAuth = void 0;
// backend/src/config/firebase.ts
// Firebase Admin SDK configuration for backend
const firebase_admin_1 = require("../lib/firebase-admin");
Object.defineProperty(exports, "adminAuth", { enumerable: true, get: function () { return firebase_admin_1.adminAuth; } });
Object.defineProperty(exports, "adminDb", { enumerable: true, get: function () { return firebase_admin_1.adminDb; } });
Object.defineProperty(exports, "adminStorage", { enumerable: true, get: function () { return firebase_admin_1.adminStorage; } });
// Firestore collection names
exports.COLLECTIONS = {
    ADMINS: 'admins',
    DOCTORS: 'doctors',
    WORKERS: 'workers',
    BLOOD_DONORS: 'blood_donors',
    AUDIT_LOGS: 'audit_logs',
    USERS: 'users',
    RECORDS: 'records',
    ML_RESPONSES: 'ml_responses',
};
// Helper function to get Firestore document reference
const getDocRef = (collection, id) => {
    return firebase_admin_1.adminDb.collection(collection).doc(id);
};
exports.getDocRef = getDocRef;
// Helper function to get Firestore collection reference
const getCollectionRef = (collection) => {
    return firebase_admin_1.adminDb.collection(collection);
};
exports.getCollectionRef = getCollectionRef;
