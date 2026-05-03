import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { adminDb, adminAuth, COLLECTIONS } from '../config/firebase';
import { authenticator } from 'otplib';
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

        const admin = adminDoc.data();
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

        // Audit Log
        try {
            await adminDb.collection(COLLECTIONS.AUDIT_LOGS).add({
                user_id: adminId,
                user_type: 'ADMIN',
                action: 'LOGIN',
                details: {
                    ip: req.ip,
                    login_method: isEmail ? 'email' : isMobile ? 'mobile' : 'identifier'
                },
                timestamp: FieldValue.serverTimestamp()
            });
        } catch (auditError) {
            console.warn('Audit log failed (non-critical):', auditError);
        }

        // Update last login
        await adminDoc.ref.update({
            last_login: FieldValue.serverTimestamp()
        });

        res.json({ 
            token, 
            user: { 
                email: admin.email, 
                mobile_number: admin.mobile_number,
                role: admin.role || 'SUPER_ADMIN'
            } 
        });
    } catch (error: any) {
        console.error('LOGIN ERROR:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Setup Initial Admin
export const createInitialAdmin = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        const hash = await bcrypt.hash(password, 10);

        // Check if admin already exists
        const existing = await adminDb.collection(COLLECTIONS.ADMINS)
            .where('email', '==', email)
            .limit(1)
            .get();

        if (!existing.empty) {
            return res.status(400).json({ error: 'Admin with this email already exists' });
        }

        await adminDb.collection(COLLECTIONS.ADMINS).add({
            email,
            password_hash: hash,
            role: 'SUPER_ADMIN',
            created_at: FieldValue.serverTimestamp()
        });

        res.status(201).json({ message: 'Admin created' });
    } catch (error: any) {
        console.error('Create admin error:', error);
        res.status(500).json({ error: 'Failed to create admin' });
    }
};

export const generate2FA = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const adminId = req.user.adminId;
        const secret = authenticator.generateSecret();

        // Save temporary secret to Firestore
        await adminDb.collection(COLLECTIONS.ADMINS).doc(adminId).update({
            totp_secret: secret
        });

        const otpauth = authenticator.keyuri(
            'Admin',
            'Med Mitra',
            secret
        );

        const imageUrl = await QRCode.toDataURL(otpauth);
        res.json({ secret, qrCode: imageUrl });

    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: 'Failed to generate 2FA' });
    }
};

export const verify2FA = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const adminId = req.user.adminId;
        const { token } = req.body;

        const adminDoc = await adminDb.collection(COLLECTIONS.ADMINS).doc(adminId).get();
        if (!adminDoc.exists) {
            return res.status(404).json({ error: 'Admin not found' });
        }

        const admin = adminDoc.data();
        const secret = admin.totp_secret;

        if (!secret) {
            return res.status(400).json({ error: '2FA not set up for this admin' });
        }

        const isValid = authenticator.verify({ token, secret });

        if (isValid) {
            res.json({ message: '2FA Verified Successfully' });
        } else {
            res.status(400).json({ error: 'Invalid Token' });
        }

    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: 'Failed to verify 2FA' });
    }
};
