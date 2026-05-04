import { adminDb, adminAuth, COLLECTIONS } from '../config/firebase';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { FieldValue } from 'firebase-admin/firestore';
import { AppError } from '../utils/errors';

export const authenticateDoctor = async (email: string, password: string, ip: string | undefined) => {
    // 1. Check Doctor in Firestore
    const snapshot = await adminDb.collection(COLLECTIONS.DOCTORS)
        .where('email', '==', email)
        .limit(1)
        .get();

    if (snapshot.empty) {
        throw new AppError('Invalid credentials', 401);
    }

    const doctorDoc = snapshot.docs[0];
    const doctor = doctorDoc.data();
    const doctorId = doctorDoc.id;

    // 2. Validate Password
    const valid = await bcrypt.compare(password, doctor.password_hash);
    if (!valid) {
        throw new AppError('Invalid credentials', 401);
    }

    // 3. Check Account Status
    if (doctor.account_status !== 'ACTIVE') {
        throw new AppError('Account is not active', 403);
    }

    // 4. Generate Token
    const token = jwt.sign(
        { doctorId, role: 'doctor', email: doctor.email },
        process.env.JWT_SECRET as string,
        { expiresIn: '12h' }
    );

    // 5. Generate Firebase Custom Token (for frontend SDK)
    let firebaseToken;
    try {
        firebaseToken = await adminAuth.createCustomToken(doctorId, { role: 'doctor' });
    } catch (ftError) {
        console.warn("Failed to generate Firebase custom token:", ftError);
        // Continue without it, but frontend might have issues loading firestore data directly
    }

    // Audit Log
    try {
        await adminDb.collection(COLLECTIONS.AUDIT_LOGS).add({
            user_id: doctorId,
            user_type: 'DOCTOR',
            action: 'LOGIN',
            details: { ip: ip || 'unknown' },
            timestamp: FieldValue.serverTimestamp()
        });
    } catch (auditError) {
        console.warn('Audit log failed (non-critical):', auditError);
    }

    // Update Last Login
    await doctorDoc.ref.update({
        last_login: FieldValue.serverTimestamp()
    });

    return {
        token,
        firebaseToken,
        user: {
            id: doctorId,
            name: doctor.full_name,
            email: doctor.email,
            role: 'doctor',
            specialization: doctor.specialization
        }
    };
};
