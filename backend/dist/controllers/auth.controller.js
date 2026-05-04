"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verify2FA = exports.generate2FA = exports.createInitialAdmin = exports.loginAdmin = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const firebase_1 = require("../config/firebase");
const otplib_1 = require("otplib");
const qrcode_1 = __importDefault(require("qrcode"));
const firestore_1 = require("firebase-admin/firestore");
// Admin Login - Supports both email and mobile number
const loginAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, mobile_number, password, identifier } = req.body;
        // Support both old format (email/password) and new format (identifier/password or email/mobile_number/password)
        const loginIdentifier = identifier || email || mobile_number;
        if (!loginIdentifier || !password) {
            return res.status(400).json({ error: 'Identifier (email/mobile) and password required' });
        }
        // Determine if identifier is email or mobile number
        const isEmail = loginIdentifier.includes('@');
        const isMobile = /^[\d\s\-\+\(\)]+$/.test(loginIdentifier.replace(/\s/g, ''));
        let adminDoc = null;
        if (isEmail) {
            // Login with email
            const snapshot = yield firebase_1.adminDb.collection(firebase_1.COLLECTIONS.ADMINS)
                .where('email', '==', loginIdentifier)
                .limit(1)
                .get();
            if (!snapshot.empty) {
                adminDoc = snapshot.docs[0];
            }
        }
        else if (isMobile) {
            // Login with mobile number (normalize by removing spaces, dashes, etc.)
            const normalizedMobile = loginIdentifier.replace(/[\s\-\+\(\)]/g, '');
            const snapshot = yield firebase_1.adminDb.collection(firebase_1.COLLECTIONS.ADMINS)
                .where('mobile_number', '==', normalizedMobile)
                .limit(1)
                .get();
            if (!snapshot.empty) {
                adminDoc = snapshot.docs[0];
            }
            else {
                // Try with original format too
                const snapshot2 = yield firebase_1.adminDb.collection(firebase_1.COLLECTIONS.ADMINS)
                    .where('mobile_number', '==', loginIdentifier)
                    .limit(1)
                    .get();
                if (!snapshot2.empty) {
                    adminDoc = snapshot2.docs[0];
                }
            }
        }
        else {
            // Try both email and mobile
            const normalizedMobile = loginIdentifier.replace(/[\s\-\+\(\)]/g, '');
            // Try email first
            const emailSnapshot = yield firebase_1.adminDb.collection(firebase_1.COLLECTIONS.ADMINS)
                .where('email', '==', loginIdentifier)
                .limit(1)
                .get();
            if (!emailSnapshot.empty) {
                adminDoc = emailSnapshot.docs[0];
            }
            else {
                // Try mobile
                const mobileSnapshot = yield firebase_1.adminDb.collection(firebase_1.COLLECTIONS.ADMINS)
                    .where('mobile_number', 'in', [loginIdentifier, normalizedMobile])
                    .limit(1)
                    .get();
                if (!mobileSnapshot.empty) {
                    adminDoc = mobileSnapshot.docs[0];
                }
            }
        }
        if (!adminDoc || !adminDoc.exists) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const admin = adminDoc.data();
        const adminId = adminDoc.id;
        // 2. Validate Password
        const valid = yield bcrypt_1.default.compare(password, admin.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        // 3. Generate Token
        const token = jsonwebtoken_1.default.sign({ adminId, role: admin.role || 'SUPER_ADMIN' }, process.env.JWT_SECRET, { expiresIn: '12h' });
        // Audit Log
        try {
            yield firebase_1.adminDb.collection(firebase_1.COLLECTIONS.AUDIT_LOGS).add({
                user_id: adminId,
                user_type: 'ADMIN',
                action: 'LOGIN',
                details: {
                    ip: req.ip,
                    login_method: isEmail ? 'email' : isMobile ? 'mobile' : 'identifier'
                },
                timestamp: firestore_1.FieldValue.serverTimestamp()
            });
        }
        catch (auditError) {
            console.warn('Audit log failed (non-critical):', auditError);
        }
        // Update last login
        yield adminDoc.ref.update({
            last_login: firestore_1.FieldValue.serverTimestamp()
        });
        res.json({
            token,
            user: {
                email: admin.email,
                mobile_number: admin.mobile_number,
                role: admin.role || 'SUPER_ADMIN'
            }
        });
    }
    catch (error) {
        console.error('LOGIN ERROR:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});
exports.loginAdmin = loginAdmin;
// Setup Initial Admin
const createInitialAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        const hash = yield bcrypt_1.default.hash(password, 10);
        // Check if admin already exists
        const existing = yield firebase_1.adminDb.collection(firebase_1.COLLECTIONS.ADMINS)
            .where('email', '==', email)
            .limit(1)
            .get();
        if (!existing.empty) {
            return res.status(400).json({ error: 'Admin with this email already exists' });
        }
        yield firebase_1.adminDb.collection(firebase_1.COLLECTIONS.ADMINS).add({
            email,
            password_hash: hash,
            role: 'SUPER_ADMIN',
            created_at: firestore_1.FieldValue.serverTimestamp()
        });
        res.status(201).json({ message: 'Admin created' });
    }
    catch (error) {
        console.error('Create admin error:', error);
        res.status(500).json({ error: 'Failed to create admin', details: error.message });
    }
});
exports.createInitialAdmin = createInitialAdmin;
const generate2FA = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // @ts-ignore
        const adminId = req.user.adminId;
        const secret = otplib_1.authenticator.generateSecret();
        // Save temporary secret to Firestore
        yield firebase_1.adminDb.collection(firebase_1.COLLECTIONS.ADMINS).doc(adminId).update({
            totp_secret: secret
        });
        const otpauth = otplib_1.authenticator.keyuri('Admin', 'Med Mitra', secret);
        const imageUrl = yield qrcode_1.default.toDataURL(otpauth);
        res.json({ secret, qrCode: imageUrl });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to generate 2FA', details: error.message });
    }
});
exports.generate2FA = generate2FA;
const verify2FA = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // @ts-ignore
        const adminId = req.user.adminId;
        const { token } = req.body;
        const adminDoc = yield firebase_1.adminDb.collection(firebase_1.COLLECTIONS.ADMINS).doc(adminId).get();
        if (!adminDoc.exists) {
            return res.status(404).json({ error: 'Admin not found' });
        }
        const admin = adminDoc.data();
        const secret = admin.totp_secret;
        if (!secret) {
            return res.status(400).json({ error: '2FA not set up for this admin' });
        }
        const isValid = otplib_1.authenticator.verify({ token, secret });
        if (isValid) {
            res.json({ message: '2FA Verified Successfully' });
        }
        else {
            res.status(400).json({ error: 'Invalid Token' });
        }
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to verify 2FA', details: error.message });
    }
});
exports.verify2FA = verify2FA;
