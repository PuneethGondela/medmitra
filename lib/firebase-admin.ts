// lib/firebase-admin.ts
// Server-side only - uses Firebase Admin SDK
import * as admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

// Initialize Firebase Admin (avoid duplicate initialization)
let adminApp: admin.app.App = null as any;
let adminAuth: admin.auth.Auth = null as any;
let adminDb: admin.firestore.Firestore = null as any;
let adminStorage: admin.storage.Storage = null as any;

try {
  if (admin.apps.length === 0) {
    // Try to load service account from file first
    // Try multiple possible paths
    const possiblePaths = [
      path.join(process.cwd(), 'backend', 'firebase-service-account.json'),
      path.join(process.cwd(), 'firebase-service-account.json'),
      path.join(__dirname, '..', 'backend', 'firebase-service-account.json'),
    ];

    let serviceAccount: any = null;

    // Check if service account file exists in any of the paths
    for (const serviceAccountPath of possiblePaths) {
      if (fs.existsSync(serviceAccountPath)) {
        try {
          const serviceAccountData = fs.readFileSync(serviceAccountPath, 'utf8');
          serviceAccount = JSON.parse(serviceAccountData);
          console.log('Loaded Firebase service account from:', serviceAccountPath);
          break;
        } catch (err) {
          console.warn('Could not read service account file:', err);
        }
      }
    }

    // If no file, try environment variable (JSON string)
    if (!serviceAccount && process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      } catch (err) {
        console.warn('Could not parse FIREBASE_SERVICE_ACCOUNT env var:', err);
      }
    }

    // If still no service account, try individual env vars
    if (!serviceAccount) {
      const projectId = process.env.FIREBASE_PROJECT_ID || 'medi-mitr';
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

      if (privateKey && clientEmail) {
        serviceAccount = {
          projectId,
          privateKey,
          clientEmail,
        };
      }
    }

    // Initialize with service account if available
    if (serviceAccount) {
      adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'medi-mitr',
        storageBucket: 'medi-mitr.firebasestorage.app',
      });
    } else {
      // Fallback: Use default credentials (for Firebase Functions/Cloud Run)
      adminApp = admin.initializeApp({
        projectId: 'medi-mitr',
        storageBucket: 'medi-mitr.firebasestorage.app',
      });
    }

    adminAuth = admin.auth();
    adminDb = admin.firestore();
    adminStorage = admin.storage();
  } else {
    adminAuth = admin.auth();
    adminDb = admin.firestore();
    adminStorage = admin.storage();
  }
} catch (error: any) {
  console.error('Firebase Admin initialization error:', error);
  try {
    fs.writeFileSync('debug-firebase-error.log', `Error: ${error.message}\n${error.stack}`);
  } catch (e) {
    // ignore
  }
  // Don't throw, let it fail at usage time so we can return JSON error
  // throw error; 
}

export { adminAuth, adminDb, adminStorage };
export default adminApp;
