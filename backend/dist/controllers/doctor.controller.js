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
exports.deleteDoctor = exports.updateDoctor = exports.getDoctorById = exports.getAllDoctors = exports.createDoctor = void 0;
const db_1 = __importDefault(require("../config/db"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const zod_1 = require("zod");
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
    // Password will be auto-generated or provided
    permissions: zod_1.z.object({
        canAddVisits: zod_1.z.boolean().optional(),
        canEditOwnVisits: zod_1.z.boolean().optional(),
        canDeleteVisits: zod_1.z.boolean().optional(),
        canViewAllWorkers: zod_1.z.boolean().optional()
    }).optional()
});
const createDoctor = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    try {
        const data = doctorSchema.parse(req.body);
        // Generate Doctor ID (DOC_YEAR_###)
        const year = new Date().getFullYear();
        const countRes = yield db_1.default.query('SELECT COUNT(*) FROM doctors');
        const count = parseInt(countRes.rows[0].count) + 1;
        const doctorId = `DOC_${year}_${String(count).padStart(3, '0')}`;
        // Generate Temp Password (if not provided, logic for auto-gen can be here)
        const tempPassword = 'TempPassword2026!';
        const hash = yield bcrypt_1.default.hash(tempPassword, 10);
        // Insert
        const query = `
      INSERT INTO doctors (
        doctor_id, full_name, email, mobile_number, medical_license, 
        specialization, hospital_name, hospital_id, login_username, password_hash,
        can_add_visits, can_edit_own_visits, can_delete_visits, can_view_all_workers
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;
        const values = [
            doctorId, data.fullName, data.email, data.mobileNumber, data.medicalLicense,
            data.specialization, data.hospitalName, data.hospitalId, data.loginUsername, hash,
            (_b = (_a = data.permissions) === null || _a === void 0 ? void 0 : _a.canAddVisits) !== null && _b !== void 0 ? _b : true,
            (_d = (_c = data.permissions) === null || _c === void 0 ? void 0 : _c.canEditOwnVisits) !== null && _d !== void 0 ? _d : true,
            (_f = (_e = data.permissions) === null || _e === void 0 ? void 0 : _e.canDeleteVisits) !== null && _f !== void 0 ? _f : false,
            (_h = (_g = data.permissions) === null || _g === void 0 ? void 0 : _g.canViewAllWorkers) !== null && _h !== void 0 ? _h : false
        ];
        const result = yield db_1.default.query(query, values);
        // Audit Log
        yield db_1.default.query('INSERT INTO audit_logs (user_id, user_type, action, resource, resource_id) VALUES ($1, $2, $3, $4, $5)', 
        // @ts-ignore
        [req.user.adminId, 'ADMIN', 'CREATE_DOCTOR', 'doctors', doctorId]);
        res.status(201).json({ message: 'Doctor created', doctor: result.rows[0], tempPassword });
    }
    catch (error) {
        if (error.code === '23505') { // Unique violation
            return res.status(400).json({ error: 'Doctor with this email/license/username already exists' });
        }
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.createDoctor = createDoctor;
const getAllDoctors = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield db_1.default.query(`
      SELECT doctor_id, full_name, email, specialization, hospital_name, account_status, last_login 
      FROM doctors 
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
    `);
        res.json(result.rows);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getAllDoctors = getAllDoctors;
const getDoctorById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const result = yield db_1.default.query('SELECT * FROM doctors WHERE doctor_id = $1', [id]);
        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Doctor not found' });
        res.json(result.rows[0]);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getDoctorById = getDoctorById;
const updateDoctor = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // TODO: Implement Update Logic
    res.status(501).json({ message: 'Not implemented yet' });
});
exports.updateDoctor = updateDoctor;
const deleteDoctor = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Soft Delete
        yield db_1.default.query('UPDATE doctors SET deleted_at = NOW(), account_status = $1 WHERE doctor_id = $2', ['DELETED', id]);
        // Audit Log
        yield db_1.default.query('INSERT INTO audit_logs (user_id, user_type, action, resource, resource_id) VALUES ($1, $2, $3, $4, $5)', 
        // @ts-ignore
        [req.user.adminId, 'ADMIN', 'DELETE_DOCTOR', 'doctors', id]);
        res.json({ message: 'Doctor deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.deleteDoctor = deleteDoctor;
