import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { adminDb, adminAuth, COLLECTIONS } from '../config/firebase';
import * as otplib from 'otplib';
const authenticator = otplib.authenticator || otplib.default?.authenticator || { generateSecret: () => '', keyuri: () => '', verify: () => false };
import QRCode from 'qrcode';
import { FieldValue } from 'firebase-admin/firestore';

// Admin Login - Supports both email and mobile number
export const loginAdmin = async (req: Request, res: Response) => {
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

        let adminDoc: FirebaseFirestore.DocumentSnapshot | null = null;

        if (isEmail) {
            // Login with email
            const snapshot = await adminDb.collection(COLLECTIONS.ADMINS)
                .where('email', '==', loginIdentifier)
                .limit(1)
                .get();
            
            if (!snapshot.empty) {
                adminDoc = snapshot.docs[0];
            }
        } else if (isMobile) {
            // Login with mobile number (normalize by removing spaces, dashes, etc.)
            const normalizedMobile = loginIdentifier.replace(/[\s\-\+\(\)]/g, '');
            const snapshot = await adminDb.collection(COLLECTIONS.ADMINS)
                .where('mobile_number', '==', normalizedMobile)
                .limit(1)
                .get();
            
            if (!snapshot.empty) {
                adminDoc = snapshot.docs[0];
            } else {
                // Try with original format too
                const snapshot2 = await adminDb.collection(COLLECTIONS.ADMINS)
                    .where('mobile_number', '==', loginIdentifier)
                    .limit(1)
                    .get();
                
                if (!snapshot2.empty) {
                    adminDoc = snapshot2.docs[0];
                }
            }
        } else {
            // Try both email and mobile
            const normalizedMobile = loginIdentifier.replace(/[\s\-\+\(\)]/g, '');
            
            // Try email first
            const emailSnapshot = await adminDb.collection(COLLECTIONS.ADMINS)
                .where('email', '==', loginIdentifier)
                .limit(1)
                .get();
            
            if (!emailSnapshot.empty) {
                adminDoc = emailSnapshot.docs[0];
            } else {
                // Try mobile
                const mobileSnapshot = await adminDb.collection(COLLECTIONS.ADMINS)
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

        const admin = adminDoc.data() || {};
        const adminId = adminDoc.id;

        // 2. Validate Password
        const valid = await bcrypt.compare(password, admin.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // 3. Generate Token
        const token = jwt.sign(
            { adminId, role: admin.role || 'SUPER_ADMIN' },
            process.env.JWT_SECRET as string,
            { expiresIn: '12h' }
        );

        // 4. Generate Firebase Custom Token
        let firebaseToken;
        try {
            firebaseToken = await adminAuth.createCustomToken(adminId, { role: admin.role || 'SUPER_ADMIN' });
        } catch (ftError) {
            console.warn("Failed to generate Firebase custom token:", ftError);
            // Continue without it
        }

        // Audit Log
        try {
            await adminDb.collection(COLLECTIONS.AUDIT_LOGS).add({
                user_id: adminId,
                user_type: 'ADMIN',
                action: 'LOGIN',
                details: { ip: req.ip },
                timestamp: FieldValue.serverTimestamp()
            });
        } catch (auditError) {
            console.warn('Audit log failed:', auditError);
        }

        res.json({
            token,
            firebaseToken,
            user: {
                id: adminId,
                name: admin.full_name,
                email: admin.email,
                role: admin.role || 'SUPER_ADMIN',
                permissions: admin.permissions || {}
            }
        });
    } catch (error: any) {
        console.error('LOGIN ERROR:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

// Enable 2FA
export const enable2FA = async (req: Request, res: Response) => {
    try {
        const adminId = req.user.adminId;
        const secret = authenticator.generateSecret();
        const otpauth = authenticator.keyuri(adminId, 'MediMitr Admin', secret);

        const qrCodeUrl = await QRCode.toDataURL(otpauth);

        // Store secret temporarily or permanently based on your flow
        await adminDb.collection(COLLECTIONS.ADMINS).doc(adminId).update({
            pending_totp_secret: secret
        });

        res.json({ qrCodeUrl, secret });
    } catch (error) {
        res.status(500).json({ error: 'Failed to enable 2FA' });
    }
};

// Verify & Activate 2FA
export const verify2FA = async (req: Request, res: Response) => {
    try {
        const adminId = req.user.adminId;
        const { token } = req.body;

        const adminDoc = await adminDb.collection(COLLECTIONS.ADMINS).doc(adminId).get();
        if (!adminDoc.exists) {
            return res.status(404).json({ error: 'Admin not found' });
        }

        const admin = adminDoc.data() || {};
        const isPending = !!admin.pending_totp_secret;
        const secret = isPending ? admin.pending_totp_secret : admin.totp_secret;

        if (!secret) {
            return res.status(400).json({ error: '2FA not set up for this admin' });
        }

        const isValid = authenticator.verify({ token, secret });

        if (isValid) {
            if (isPending) {
                // Activate 2FA by moving the secret from pending to active
                await adminDoc.ref.update({
                    totp_secret: secret,
                    pending_totp_secret: FieldValue.delete()
                });
            }
            res.json({ message: '2FA Verified Successfully' });
        } else {
            res.status(400).json({ error: 'Invalid token' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to verify 2FA' });
    }
};
