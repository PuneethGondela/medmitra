"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminStorage = exports.adminDb = exports.adminAuth = void 0;
// backend/src/lib/firebase-admin.ts
// Server-side only - uses Firebase Admin SDK
const admin = __importStar(require("firebase-admin"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Initialize Firebase Admin (avoid duplicate initialization)
let adminApp;
let adminAuth;
let adminDb;
let adminStorage;
try {
    if (admin.apps.length === 0) {
        console.log('Initializing Firebase Admin...');
        console.log('CWD:', process.cwd());
        // Try to load service account from file first
        // Try multiple possible paths
        const possiblePaths = [
            path_1.default.join(process.cwd(), 'firebase-service-account.json'),
            path_1.default.join(process.cwd(), '..', 'firebase-service-account.json'), // If running from backend dir
            path_1.default.join(__dirname, '..', '..', 'firebase-service-account.json'),
        ];
        let serviceAccount = null;
        // Check if service account file exists in any of the paths
        for (const serviceAccountPath of possiblePaths) {
            if (fs_1.default.existsSync(serviceAccountPath)) {
                try {
                    const serviceAccountData = fs_1.default.readFileSync(serviceAccountPath, 'utf8');
                    serviceAccount = JSON.parse(serviceAccountData);
                    console.log('Loaded Firebase service account from:', serviceAccountPath);
                    break;
                }
                catch (err) {
                    console.warn('Could not read service account file:', err);
                }
            }
        }
        // If no file, try environment variable (JSON string)
        if (!serviceAccount && process.env.FIREBASE_SERVICE_ACCOUNT) {
            try {
                serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            }
            catch (err) {
                console.warn('Could not parse FIREBASE_SERVICE_ACCOUNT env var:', err);
            }
        }
        // If still no service account, try individual env vars
        if (!serviceAccount) {
            const projectId = process.env.FIREBASE_PROJECT_ID || 'medi-mitr';
            const privateKey = (_a = process.env.FIREBASE_PRIVATE_KEY) === null || _a === void 0 ? void 0 : _a.replace(/\\n/g, '\n');
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
        }
        else {
            // Fallback: Use default credentials (for Firebase Functions/Cloud Run)
            adminApp = admin.initializeApp({
                projectId: 'medi-mitr',
                storageBucket: 'medi-mitr.firebasestorage.app',
            });
        }
        exports.adminAuth = adminAuth = admin.auth();
        exports.adminDb = adminDb = admin.firestore();
        exports.adminStorage = adminStorage = admin.storage();
    }
    else {
        adminApp = admin.apps[0];
        exports.adminAuth = adminAuth = admin.auth();
        exports.adminDb = adminDb = admin.firestore();
        exports.adminStorage = adminStorage = admin.storage();
    }
}
catch (error) {
    console.error('Firebase Admin initialization error:', error);
    throw error;
}
exports.default = adminApp;
