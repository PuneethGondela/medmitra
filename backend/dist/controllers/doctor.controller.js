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
exports.deleteDoctor = exports.updateCurrentDoctor = exports.updateDoctor = exports.getCurrentDoctor = exports.getDoctorById = exports.getAllDoctors = exports.createDoctor = exports.loginDoctor = void 0;
const firebase_1 = require("../config/firebase");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const firestore_1 = require("firebase-admin/firestore");
// Login Doctor
const loginDoctor = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        // 1. Check Doctor in Firestore
        const snapshot = yield firebase_1.adminDb.collection(firebase_1.COLLECTIONS.DOCTORS)
            .where('email', '==', email)
            .limit(1)
            .get();
        if (snapshot.empty) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const doctorDoc = snapshot.docs[0];
        const doctor = doctorDoc.data();
        if (!doctor)
            return res.status(404).json({ error: 'Doctor not found' });
        const doctorId = doctorDoc.id;
        // 2. Validate Password
        const valid = yield bcrypt_1.default.compare(password, doctor.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        // 3. Check Account Status
        if (doctor.account_status !== 'ACTIVE') {
            return res.status(403).json({ error: 'Account is not active' });
        }
        // 4. Generate Token
        const token = jsonwebtoken_1.default.sign({ doctorId, role: 'doctor', email: doctor.email }, process.env.JWT_SECRET, { expiresIn: '12h' });
        // 5. Generate Firebase Custom Token (for frontend SDK)
        let firebaseToken;
        try {
            firebaseToken = yield firebase_1.adminAuth.createCustomToken(doctorId, { role: 'doctor' });
        }
        catch (ftError) {
            console.warn("Failed to generate Firebase custom token:", ftError);
            // Continue without it, but frontend might have issues loading firestore data directly
        }
        // Audit Log
        try {
            yield firebase_1.adminDb.collection(firebase_1.COLLECTIONS.AUDIT_LOGS).add({
                user_id: doctorId,
                user_type: 'DOCTOR',
                action: 'LOGIN',
                details: { ip: req.ip },
                timestamp: firestore_1.FieldValue.serverTimestamp()
            });
        }
        catch (auditError) {
            console.warn('Audit log failed (non-critical):', auditError);
        }
        // Update Last Login
        yield doctorDoc.ref.update({
            last_login: firestore_1.FieldValue.serverTimestamp()
        });
        res.json({
            token,
            firebaseToken,
            user: {
                id: doctorId,
                name: doctor.full_name,
                email: doctor.email,
                role: 'doctor',
                specialization: doctor.specialization
            }
        });
    }
    catch (error) {
        console.error('DOCTOR LOGIN ERROR:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});
exports.loginDoctor = loginDoctor;
// Validation Schema
const doctorSchema = zod_1.z.object({
    fullName: zod_1.z.string().min(2),
    email: zod_1.z.string().email(),
    mobileNumber: zod_1.z.string().optional(),
    medicalLicense: zod_1.z.string().min(5),
    specialization: zod_1.z.string(),
    hospitalName: zod_1.z.string(),
    hospitalId: zod_1.z.string(),
    loginUsername: zod_1.z.string().min(4),
    password: zod_1.z.string().optional(),
    permissions: zod_1.z.object({
        canAddVisits: zod_1.z.boolean().optional(),
        canEditOwnVisits: zod_1.z.boolean().optional(),
        canDeleteVisits: zod_1.z.boolean().optional(),
        canViewAllWorkers: zod_1.z.boolean().optional()
    }).optional()
});
const createDoctor = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    try {
        const data = doctorSchema.parse(req.body);
        // Check if email, license, or username already exists
        const [emailCheck, licenseCheck, usernameCheck] = yield Promise.all([
            firebase_1.adminDb.collection(firebase_1.COLLECTIONS.DOCTORS).where('email', '==', data.email).limit(1).get(),
            firebase_1.adminDb.collection(firebase_1.COLLECTIONS.DOCTORS).where('medical_license', '==', data.medicalLicense).limit(1).get(),
            firebase_1.adminDb.collection(firebase_1.COLLECTIONS.DOCTORS).where('login_username', '==', data.loginUsername).limit(1).get()
        ]);
        if (!emailCheck.empty) {
            return res.status(400).json({ error: 'Doctor with this email already exists' });
        }
        if (!licenseCheck.empty) {
            return res.status(400).json({ error: 'Doctor with this medical license already exists' });
        }
        if (!usernameCheck.empty) {
            return res.status(400).json({ error: 'Doctor with this username already exists' });
        }
        // Generate Doctor ID (DOC_YEAR_###) - Optimized using count aggregation
        const year = new Date().getFullYear();
        const doctorsCountSnapshot = yield firebase_1.adminDb.collection(firebase_1.COLLECTIONS.DOCTORS).count().get();
        const count = doctorsCountSnapshot.data().count + 1;
        const doctorId = `DOC_${year}_${String(count).padStart(3, '0')}`;
        // Use provided password or generate temp
        const finalPassword = data.password || 'TempPassword2026!';
        const hash = yield bcrypt_1.default.hash(finalPassword, 10);
        // Create doctor document
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
            password_hash: hash,
            account_status: 'ACTIVE',
            is_verified: false,
            can_add_visits: (_b = (_a = data.permissions) === null || _a === void 0 ? void 0 : _a.canAddVisits) !== null && _b !== void 0 ? _b : true,
            can_edit_own_visits: (_d = (_c = data.permissions) === null || _c === void 0 ? void 0 : _c.canEditOwnVisits) !== null && _d !== void 0 ? _d : true,
            can_delete_visits: (_f = (_e = data.permissions) === null || _e === void 0 ? void 0 : _e.canDeleteVisits) !== null && _f !== void 0 ? _f : false,
            can_view_all_workers: (_h = (_g = data.permissions) === null || _g === void 0 ? void 0 : _g.canViewAllWorkers) !== null && _h !== void 0 ? _h : false,
            created_at: firestore_1.FieldValue.serverTimestamp(),
            updated_at: firestore_1.FieldValue.serverTimestamp(),
            deleted_at: null
        };
        // Use doctor_id as document ID for easier queries
        yield firebase_1.adminDb.collection(firebase_1.COLLECTIONS.DOCTORS).doc(doctorId).set(doctorData);
        // 6. Create User in Firebase Authentication (CRITICAL FIX)
        try {
            yield firebase_1.adminAuth.createUser({
                uid: doctorId, // Sync UID with Firestore ID
                email: data.email,
                password: finalPassword,
                displayName: data.fullName,
                emailVerified: true
            });
            console.log(`Created Firebase Auth user for doctor: ${doctorId}`);
        }
        catch (authError) {
            console.error('Failed to create Firebase Auth user:', authError);
            // If user already exists in Auth but not Firestore (edge case), we might want to update or ignore
            if (authError.code === 'auth/email-already-exists') {
                console.warn('User already exists in Auth, skipping creation.');
            }
        }
        // Audit Log
        const adminId = (_j = req.user) === null || _j === void 0 ? void 0 : _j.adminId;
        if (adminId) {
            yield firebase_1.adminDb.collection(firebase_1.COLLECTIONS.AUDIT_LOGS).add({
                user_id: adminId,
                user_type: 'ADMIN',
                action: 'CREATE_DOCTOR',
                resource: 'doctors',
                resource_id: doctorId,
                timestamp: firestore_1.FieldValue.serverTimestamp()
            });
        }
        // Don't return password hash
        if ("password_hash" in doctorData)
            delete doctorData.password_hash;
        res.status(201).json({ message: 'Doctor created', doctor: doctorData, tempPassword: finalPassword });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        console.error('Create doctor error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});
exports.createDoctor = createDoctor;
const getAllDoctors = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const snapshot = yield firebase_1.adminDb.collection(firebase_1.COLLECTIONS.DOCTORS)
            // .where('deleted_at', '==', null) // Relaxed for debug visibility
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
    }
    catch (error) {
        console.error('Get all doctors error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});
exports.getAllDoctors = getAllDoctors;
const getDoctorById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { id } = req.params;
        const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.doctorId) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.adminId);
        const userRole = (_c = req.user) === null || _c === void 0 ? void 0 : _c.role;
        // If doctor accessing, ensure they can only see their own data
        if (userRole === 'doctor' && userId !== id) {
            return res.status(403).json({ error: 'You can only access your own profile' });
        }
        const doctorDoc = yield firebase_1.adminDb.collection(firebase_1.COLLECTIONS.DOCTORS).doc(id).get();
        if (!doctorDoc.exists) {
            return res.status(404).json({ error: 'Doctor not found' });
        }
        const doctor = doctorDoc.data();
        if (!doctor)
            return res.status(404).json({ error: 'Doctor not found' });
        // Check if deleted
        if (doctor && doctor.deleted_at) {
            return res.status(404).json({ error: 'Doctor not found' });
        }
        // Don't return password hash
        if (doctor && "password_hash" in doctor)
            delete doctor.password_hash;
        if (!doctor)
            return res.status(404).json({ error: 'Doctor not found' });
        res.json(doctor);
    }
    catch (error) {
        console.error('Get doctor by ID error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});
exports.getDoctorById = getDoctorById;
const getCurrentDoctor = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const doctorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.doctorId;
        if (!doctorId) {
            return res.status(400).json({ error: 'Doctor ID not found in token' });
        }
        const doctorDoc = yield firebase_1.adminDb.collection(firebase_1.COLLECTIONS.DOCTORS).doc(doctorId).get();
        if (!doctorDoc.exists) {
            return res.status(404).json({ error: 'Doctor not found' });
        }
        const doctor = doctorDoc.data();
        if (!doctor)
            return res.status(404).json({ error: 'Doctor not found' });
        // Check if deleted
        if (doctor && doctor.deleted_at) {
            return res.status(404).json({ error: 'Doctor not found' });
        }
        // Don't return password hash
        if (doctor && "password_hash" in doctor)
            delete doctor.password_hash;
        if (!doctor)
            return res.status(404).json({ error: 'Doctor not found' });
        res.json(doctor);
    }
    catch (error) {
        console.error('Get current doctor error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});
exports.getCurrentDoctor = getCurrentDoctor;
const updateDoctor = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { id } = req.params;
        const { fullName, mobileNumber, specialization, hospitalName, permissions } = req.body;
        const doctorDoc = yield firebase_1.adminDb.collection(firebase_1.COLLECTIONS.DOCTORS).doc(id).get();
        if (!doctorDoc.exists) {
            return res.status(404).json({ error: 'Doctor not found' });
        }
        const doctor = doctorDoc.data();
        if (!doctor)
            return res.status(404).json({ error: 'Doctor not found' });
        if (doctor && doctor.deleted_at) {
            return res.status(404).json({ error: 'Doctor not found' });
        }
        // Build update object
        const updates = {
            updated_at: firestore_1.FieldValue.serverTimestamp()
        };
        if (fullName)
            updates.full_name = fullName;
        if (mobileNumber !== undefined)
            updates.mobile_number = mobileNumber;
        if (specialization)
            updates.specialization = specialization;
        if (hospitalName)
            updates.hospital_name = hospitalName;
        if (permissions) {
            if (permissions.canAddVisits !== undefined)
                updates.can_add_visits = permissions.canAddVisits;
            if (permissions.canEditOwnVisits !== undefined)
                updates.can_edit_own_visits = permissions.canEditOwnVisits;
            if (permissions.canDeleteVisits !== undefined)
                updates.can_delete_visits = permissions.canDeleteVisits;
            if (permissions.canViewAllWorkers !== undefined)
                updates.can_view_all_workers = permissions.canViewAllWorkers;
        }
        yield doctorDoc.ref.update(updates);
        // Get updated document
        const updatedDoc = yield doctorDoc.ref.get();
        const updatedDoctor = updatedDoc.data();
        if (updatedDoctor && "password_hash" in updatedDoctor)
            delete updatedDoctor.password_hash;
        // Audit Log
        const adminId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.adminId) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.id);
        if (adminId) {
            yield firebase_1.adminDb.collection(firebase_1.COLLECTIONS.AUDIT_LOGS).add({
                user_id: adminId,
                user_type: 'ADMIN',
                action: 'UPDATE_DOCTOR',
                resource: 'doctors',
                resource_id: id,
                timestamp: firestore_1.FieldValue.serverTimestamp()
            });
        }
        res.json({ message: 'Doctor updated', doctor: updatedDoctor });
    }
    catch (error) {
        console.error('Update doctor error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});
exports.updateDoctor = updateDoctor;
const updateCurrentDoctor = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const doctorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.doctorId;
        if (!doctorId) {
            return res.status(400).json({ error: 'Doctor ID not found in token' });
        }
        const { fullName, mobileNumber, specialization, hospitalName } = req.body;
        const doctorDoc = yield firebase_1.adminDb.collection(firebase_1.COLLECTIONS.DOCTORS).doc(doctorId).get();
        if (!doctorDoc.exists) {
            return res.status(404).json({ error: 'Doctor not found' });
        }
        const doctor = doctorDoc.data();
        if (!doctor)
            return res.status(404).json({ error: 'Doctor not found' });
        if (doctor && doctor.deleted_at) {
            return res.status(404).json({ error: 'Doctor not found' });
        }
        // Doctors can only update certain fields, not permissions
        const updates = {
            updated_at: firestore_1.FieldValue.serverTimestamp()
        };
        if (fullName)
            updates.full_name = fullName;
        if (mobileNumber !== undefined)
            updates.mobile_number = mobileNumber;
        if (specialization)
            updates.specialization = specialization;
        if (hospitalName)
            updates.hospital_name = hospitalName;
        if (Object.keys(updates).length === 1) { // Only updated_at
            return res.status(400).json({ error: 'No fields to update' });
        }
        yield doctorDoc.ref.update(updates);
        // Get updated document
        const updatedDoc = yield doctorDoc.ref.get();
        const updatedDoctor = updatedDoc.data();
        if (updatedDoctor && "password_hash" in updatedDoctor)
            delete updatedDoctor.password_hash;
        // Audit Log
        yield firebase_1.adminDb.collection(firebase_1.COLLECTIONS.AUDIT_LOGS).add({
            user_id: doctorId,
            user_type: 'DOCTOR',
            action: 'UPDATE_SELF',
            resource: 'doctors',
            resource_id: doctorId,
            timestamp: firestore_1.FieldValue.serverTimestamp()
        });
        res.json({ message: 'Profile updated', doctor: updatedDoctor });
    }
    catch (error) {
        console.error('Update current doctor error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});
exports.updateCurrentDoctor = updateCurrentDoctor;
const deleteDoctor = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const doctorDoc = yield firebase_1.adminDb.collection(firebase_1.COLLECTIONS.DOCTORS).doc(id).get();
        if (!doctorDoc.exists) {
            return res.status(404).json({ error: 'Doctor not found' });
        }
        // Soft Delete
        yield doctorDoc.ref.update({
            deleted_at: firestore_1.FieldValue.serverTimestamp(),
            account_status: 'DELETED',
            updated_at: firestore_1.FieldValue.serverTimestamp()
        });
        // Audit Log
        const adminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.adminId;
        if (adminId) {
            yield firebase_1.adminDb.collection(firebase_1.COLLECTIONS.AUDIT_LOGS).add({
                user_id: adminId,
                user_type: 'ADMIN',
                action: 'DELETE_DOCTOR',
                resource: 'doctors',
                resource_id: id,
                timestamp: firestore_1.FieldValue.serverTimestamp()
            });
        }
        res.json({ message: 'Doctor deleted successfully' });
    }
    catch (error) {
        console.error('Delete doctor error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});
exports.deleteDoctor = deleteDoctor;
