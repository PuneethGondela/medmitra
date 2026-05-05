import { Request, Response } from 'express';
import { adminDb, adminAuth, COLLECTIONS } from '../config/firebase';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { authenticateDoctor } from '../services/auth.service';
import { AppError } from '../utils/errors';

// Login Doctor
export const loginDoctor = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        if (email.length > 255 || password.length > 255) {
            return res.status(400).json({ error: 'Input fields exceed maximum length' });
        }

        const authResult = await authenticateDoctor(email, password, req.ip);

        res.json(authResult);
    } catch (error: any) {
        if (error instanceof AppError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        console.error('DOCTOR LOGIN ERROR:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Validation Schema
const doctorSchema = z.object({
    fullName: z.string().min(2),
    email: z.string().email(),
    mobileNumber: z.string().optional(),
    medicalLicense: z.string().min(5),
    specialization: z.string(),
    hospitalName: z.string(),
    hospitalId: z.string(),
    loginUsername: z.string().min(4),
    password: z.string().optional(),
    permissions: z.object({
        canAddVisits: z.boolean().optional(),
        canEditOwnVisits: z.boolean().optional(),
        canDeleteVisits: z.boolean().optional(),
        canViewAllWorkers: z.boolean().optional()
    }).optional()
});

export const createDoctor = async (req: Request, res: Response) => {
    try {
        const data = doctorSchema.parse(req.body);

        // Check if email, license, or username already exists
        const [emailCheck, licenseCheck, usernameCheck] = await Promise.all([
            adminDb.collection(COLLECTIONS.DOCTORS).where('email', '==', data.email).limit(1).get(),
            adminDb.collection(COLLECTIONS.DOCTORS).where('medical_license', '==', data.medicalLicense).limit(1).get(),
            adminDb.collection(COLLECTIONS.DOCTORS).where('login_username', '==', data.loginUsername).limit(1).get()
        ]);

        if (!emailCheck.empty) return res.status(400).json({ error: 'Email already registered' });
        if (!licenseCheck.empty) return res.status(400).json({ error: 'Medical license already registered' });
        if (!usernameCheck.empty) return res.status(400).json({ error: 'Username already taken' });

        // Generate strong password if not provided
        const finalPassword = data.password || Math.random().toString(36).slice(-10) + 'A1!';
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(finalPassword, salt);

        // Generate ID
        const doctorId = `DOC_${Date.now()}`;

        const doctorData = {
            doctor_id: doctorId,
            full_name: data.fullName,
            email: data.email,
            mobile_number: data.mobileNumber || null,
            medical_license: data.medicalLicense,
            specialization: data.specialization,
            hospital_name: data.hospitalName,
            hospital_id: data.hospitalId,
            login_username: data.loginUsername,
            password_hash: passwordHash,
            account_status: 'ACTIVE',
            created_at: FieldValue.serverTimestamp(),
            updated_at: FieldValue.serverTimestamp(),
            last_login: null,
            deleted_at: null,

            // Permissions
            can_add_visits: data.permissions?.canAddVisits ?? true,
            can_edit_own_visits: data.permissions?.canEditOwnVisits ?? true,
            can_delete_visits: data.permissions?.canDeleteVisits ?? false,
            can_view_all_workers: data.permissions?.canViewAllWorkers ?? false
        };

        await adminDb.collection(COLLECTIONS.DOCTORS).doc(doctorId).set(doctorData);

        // 6. Create User in Firebase Authentication (CRITICAL FIX)
        try {
            await adminAuth.createUser({
                uid: doctorId, // Sync UID with Firestore ID
                email: data.email,
                password: finalPassword,
                displayName: data.fullName,
                emailVerified: true
            });
            console.log(`Created Firebase Auth user for doctor: ${doctorId}`);
        } catch (authError: any) {
            console.error('Failed to create Firebase Auth user:', authError);
            // If user already exists in Auth but not Firestore (edge case), we delete and recreate to sync UID
            if (authError.code === 'auth/email-already-exists') {
                console.warn('User already exists in Auth, deleting and recreating to sync UID.');
                try {
                    const existingUser = await adminAuth.getUserByEmail(data.email);
                    await adminAuth.deleteUser(existingUser.uid);
                    await adminAuth.createUser({
                        uid: doctorId, // Sync UID with Firestore ID
                        email: data.email,
                        password: finalPassword,
                        displayName: data.fullName,
                        emailVerified: true
                    });
                    console.log(`Recreated Firebase Auth user for doctor: ${doctorId}`);
                } catch (recreateError) {
                    // Rollback Firestore doc on recreate failure
                    await adminDb.collection(COLLECTIONS.DOCTORS).doc(doctorId).delete();
                    throw recreateError;
                }
            } else {
                // Rollback Firestore doc on other auth failures
                await adminDb.collection(COLLECTIONS.DOCTORS).doc(doctorId).delete();
                throw authError;
            }
        }

        // Audit Log
        const adminId = req.user?.adminId;
        if (adminId) {
            await adminDb.collection(COLLECTIONS.AUDIT_LOGS).add({
                user_id: adminId,
                user_type: 'ADMIN',
                action: 'CREATE_DOCTOR',
                resource: 'doctors',
                resource_id: doctorId,
                timestamp: FieldValue.serverTimestamp()
            });
        }

        // Don't return password hash
        delete (doctorData as any).password_hash;

        res.status(201).json({ message: 'Doctor created', doctor: doctorData, tempPassword: finalPassword });

    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        console.error('Create doctor error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getAllDoctors = async (req: Request, res: Response) => {
    try {
        const snapshot = await adminDb.collection(COLLECTIONS.DOCTORS)
            .where('deleted_at', '==', null)
            .orderBy('created_at', 'desc')
            .get();

        const doctors = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                doctor_id: data.doctor_id,
                full_name: data.full_name,
                email: data.email,
                specialization: data.specialization,
                hospital_name: data.hospital_name,
                account_status: data.account_status,
                last_login: data.last_login
            };
        });

        res.json(doctors);
    } catch (error: any) {
        console.error('Get all doctors error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getDoctorById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user?.doctorId || req.user?.adminId;
        const userRole = req.user?.role;

        // If doctor accessing, ensure they can only see their own data
        if (userRole === 'doctor' && userId !== id) {
            return res.status(403).json({ error: 'You can only access your own profile' });
        }

        const doctorDoc = await adminDb.collection(COLLECTIONS.DOCTORS).doc(id).get();

        if (!doctorDoc.exists) {
            return res.status(404).json({ error: 'Doctor not found' });
        }

        const doctor = doctorDoc.data();

        // Check if deleted
        if (!doctor || doctor.deleted_at) {
            return res.status(404).json({ error: 'Doctor not found' });
        }

        // Don't return password hash
        delete (doctor as any).password_hash;
        if (doctor) delete doctor.password_hash;

        if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
        res.json(doctor);
    } catch (error: any) {
        console.error('Get doctor by ID error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getCurrentDoctor = async (req: Request, res: Response) => {
    try {
        const doctorId = req.user?.doctorId;

        if (!doctorId) {
            return res.status(400).json({ error: 'Doctor ID not found in token' });
        }

        const doctorDoc = await adminDb.collection(COLLECTIONS.DOCTORS).doc(doctorId).get();

        if (!doctorDoc.exists) {
            return res.status(404).json({ error: 'Doctor not found' });
        }

        const doctor = doctorDoc.data();

        // Check if deleted
        if (!doctor || doctor.deleted_at) {
            return res.status(404).json({ error: 'Doctor not found' });
        }

        // Don't return password hash
        delete (doctor as any).password_hash;
        if (doctor) delete doctor.password_hash;

        if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
        res.json(doctor);
    } catch (error: any) {
        console.error('Get current doctor error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateDoctor = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { fullName, mobileNumber, specialization, hospitalName, permissions } = req.body;

        const doctorDoc = await adminDb.collection(COLLECTIONS.DOCTORS).doc(id).get();

        if (!doctorDoc.exists) {
            return res.status(404).json({ error: 'Doctor not found' });
        }

        const doctor = doctorDoc.data();
        if (!doctor || doctor.deleted_at) {
            return res.status(404).json({ error: 'Doctor not found' });
        }

        // Build update object
        const updates: any = {
            updated_at: FieldValue.serverTimestamp()
        };

        if (fullName) updates.full_name = fullName;
        if (mobileNumber !== undefined) updates.mobile_number = mobileNumber;
        if (specialization) updates.specialization = specialization;
        if (hospitalName) updates.hospital_name = hospitalName;

        if (permissions) {
            if (permissions.canAddVisits !== undefined) updates.can_add_visits = permissions.canAddVisits;
            if (permissions.canEditOwnVisits !== undefined) updates.can_edit_own_visits = permissions.canEditOwnVisits;
            if (permissions.canDeleteVisits !== undefined) updates.can_delete_visits = permissions.canDeleteVisits;
            if (permissions.canViewAllWorkers !== undefined) updates.can_view_all_workers = permissions.canViewAllWorkers;
        }

        await doctorDoc.ref.update(updates);

        // Get updated document
        const updatedDoc = await doctorDoc.ref.get();
        const updatedDoctor = updatedDoc.data();
        delete (updatedDoctor as any).password_hash;
        if (updatedDoctor) {
            delete updatedDoctor.password_hash;
        }

        // Audit Log
        const adminId = req.user?.adminId || req.user?.id;
        if (adminId) {
            await adminDb.collection(COLLECTIONS.AUDIT_LOGS).add({
                user_id: adminId,
                user_type: 'ADMIN',
                action: 'UPDATE_DOCTOR',
                resource: 'doctors',
                resource_id: id,
                timestamp: FieldValue.serverTimestamp()
            });
        }

        res.json({ message: 'Doctor updated', doctor: updatedDoctor });
    } catch (error: any) {
        console.error('Update doctor error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateCurrentDoctor = async (req: Request, res: Response) => {
    try {
        const doctorId = req.user?.doctorId;

        if (!doctorId) {
            return res.status(400).json({ error: 'Doctor ID not found in token' });
        }

        const { fullName, mobileNumber, specialization, hospitalName } = req.body;

        const doctorDoc = await adminDb.collection(COLLECTIONS.DOCTORS).doc(doctorId).get();

        if (!doctorDoc.exists) {
            return res.status(404).json({ error: 'Doctor not found' });
        }

        const doctor = doctorDoc.data();
        if (!doctor || doctor.deleted_at) {
            return res.status(404).json({ error: 'Doctor not found' });
        }

        // Doctors can only update certain fields, not permissions
        const updates: any = {
            updated_at: FieldValue.serverTimestamp()
        };

        if (fullName) updates.full_name = fullName;
        if (mobileNumber !== undefined) updates.mobile_number = mobileNumber;
        if (specialization) updates.specialization = specialization;
        if (hospitalName) updates.hospital_name = hospitalName;

        if (Object.keys(updates).length === 1) { // Only updated_at
            return res.status(400).json({ error: 'No fields to update' });
        }

        await doctorDoc.ref.update(updates);

        // Get updated document
        const updatedDoc = await doctorDoc.ref.get();
        const updatedDoctor = updatedDoc.data();
        delete (updatedDoctor as any).password_hash;
        if (updatedDoctor) {
            delete updatedDoctor.password_hash;
        }

        // Audit Log
        await adminDb.collection(COLLECTIONS.AUDIT_LOGS).add({
            user_id: doctorId,
            user_type: 'DOCTOR',
            action: 'UPDATE_SELF',
            resource: 'doctors',
            resource_id: doctorId,
            timestamp: FieldValue.serverTimestamp()
        });

        res.json({ message: 'Profile updated', doctor: updatedDoctor });
    } catch (error: any) {
        console.error('Update current doctor error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const deleteDoctor = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const doctorDoc = await adminDb.collection(COLLECTIONS.DOCTORS).doc(id).get();

        if (!doctorDoc.exists) {
            return res.status(404).json({ error: 'Doctor not found' });
        }

        // Soft Delete
        await doctorDoc.ref.update({
            deleted_at: FieldValue.serverTimestamp(),
            account_status: 'DELETED',
            updated_at: FieldValue.serverTimestamp()
        });

        // Audit Log
        const adminId = req.user?.adminId;
        if (adminId) {
            await adminDb.collection(COLLECTIONS.AUDIT_LOGS).add({
                user_id: adminId,
                user_type: 'ADMIN',
                action: 'DELETE_DOCTOR',
                resource: 'doctors',
                resource_id: id,
                timestamp: FieldValue.serverTimestamp()
            });
        }

        res.json({ message: 'Doctor deleted successfully' });
    } catch (error: any) {
        console.error('Delete doctor error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
