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
exports.createDonor = exports.getAllDonors = void 0;
const db_1 = __importDefault(require("../config/db"));
const getAllDonors = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { bloodGroup, city } = req.query;
        let query = 'SELECT * FROM blood_donors WHERE 1=1';
        const params = [];
        if (bloodGroup) {
            params.push(bloodGroup);
            query += ` AND blood_group = $${params.length}`;
        }
        if (city) {
            params.push(city);
            query += ` AND city ILIKE $${params.length}`;
        }
        query += ' ORDER BY registered_at DESC';
        const result = yield db_1.default.query(query, params);
        res.json(result.rows);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getAllDonors = getAllDonors;
const createDonor = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { fullName, bloodGroup, mobileNumber, age, gender, city } = req.body;
        yield db_1.default.query(`INSERT INTO blood_donors (full_name, blood_group, mobile_number, age, gender, city)
             VALUES ($1, $2, $3, $4, $5, $6)`, [fullName, bloodGroup, mobileNumber, age, gender, city]);
        // Audit Log
        yield db_1.default.query('INSERT INTO audit_logs (user_id, user_type, action, resource, details) VALUES ($1, $2, $3, $4, $5)',
        // @ts-ignore
        [req.user.adminId, 'ADMIN', 'CREATE_DONOR', 'donors', { fullName, bloodGroup }]);
        res.status(201).json({ message: 'Donor registered successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.createDonor = createDonor;
