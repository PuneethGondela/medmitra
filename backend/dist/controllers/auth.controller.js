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
const db_1 = __importDefault(require("../config/db"));
const otplib_1 = require("otplib");
const qrcode_1 = __importDefault(require("qrcode"));
// Admin Login
const loginAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        // 1. Check Admin
        const result = yield db_1.default.query('SELECT * FROM admins WHERE email = $1', [email]);
        if (result.rows.length === 0)
            return res.status(401).json({ error: 'Invalid credentials' });
        const admin = result.rows[0];
        // 2. Validate Password
        const valid = yield bcrypt_1.default.compare(password, admin.password_hash);
        if (!valid)
            return res.status(401).json({ error: 'Invalid credentials' });
        // 3. Generate Token
        const token = jsonwebtoken_1.default.sign({ adminId: admin.admin_id, role: admin.role }, process.env.JWT_SECRET, { expiresIn: '12h' });
        // Audit Log
        yield db_1.default.query('INSERT INTO audit_logs (user_id, user_type, action, details) VALUES ($1, $2, $3, $4)', [admin.admin_id, 'ADMIN', 'LOGIN', { ip: req.ip }]);
        res.json({ token, user: { email: admin.email, role: admin.role } });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.loginAdmin = loginAdmin;
// Setup Initial Admin
const createInitialAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        const hash = yield bcrypt_1.default.hash(password, 10);
        yield db_1.default.query('INSERT INTO admins (email, password_hash) VALUES ($1, $2)', [email, hash]);
        res.status(201).json({ message: 'Admin created' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create admin' });
    }
});
exports.createInitialAdmin = createInitialAdmin;
const generate2FA = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // @ts-ignore
        const adminId = req.user.adminId;
        const secret = otplib_1.authenticator.generateSecret();
        // Save temporary secret to DB (or valid one if confirming)
        yield db_1.default.query('UPDATE admins SET totp_secret = $1 WHERE admin_id = $2', [secret, adminId]);
        const otpauth = otplib_1.authenticator.keyuri('Admin', 'Med Mitra', secret);
        const imageUrl = yield qrcode_1.default.toDataURL(otpauth);
        res.json({ secret, qrCode: imageUrl });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to generate 2FA' });
    }
});
exports.generate2FA = generate2FA;
const verify2FA = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // @ts-ignore
        const adminId = req.user.adminId;
        const { token } = req.body;
        const result = yield db_1.default.query('SELECT totp_secret FROM admins WHERE admin_id = $1', [adminId]);
        const secret = result.rows[0].totp_secret;
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
        res.status(500).json({ error: 'Failed to verify 2FA' });
    }
});
exports.verify2FA = verify2FA;
