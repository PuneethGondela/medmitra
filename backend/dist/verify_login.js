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
const db_1 = __importDefault(require("./config/db"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const API_URL = 'http://localhost:4000/api/doctors/login';
const run = () => __awaiter(void 0, void 0, void 0, function* () {
    const email = 'test_verify@example.com';
    const password = 'TestPassword123!';
    try {
        console.log('1. Cleaning up old test user...');
        yield db_1.default.query('DELETE FROM doctors WHERE email = $1', [email]);
        console.log('2. Creating test user manually in DB (simulating Controller logic)...');
        const hash = yield bcrypt_1.default.hash(password, 10);
        yield db_1.default.query(`
            INSERT INTO doctors (doctor_id, full_name, email, mobile_number, medical_license, specialization, hospital_name, hospital_id, login_username, password_hash, account_status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'ACTIVE')
        `, ['DOC_TEST_001', 'Test Doc', email, '0000000000', 'LIC-TEST', 'General', 'Test Hosp', 'HOSP-TEST', 'test.doc', hash]);
        console.log('   User created in DB.');
        console.log('3. Verifying Hash locally...');
        const res = yield db_1.default.query('SELECT * FROM doctors WHERE email = $1', [email]);
        const user = res.rows[0];
        const valid = yield bcrypt_1.default.compare(password, user.password_hash);
        if (!valid)
            throw new Error('Local bcrypt comparison FAILED');
        console.log('   Local hash check PASSED.');
        console.log('4. Attempting Login via API...');
        const loginRes = yield (0, node_fetch_1.default)(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        if (loginRes.ok) {
            const data = yield loginRes.json();
            console.log('   API Login PASSED! Token received.');
        }
        else {
            console.error('   API Login FAILED:', yield loginRes.text());
            process.exit(1);
        }
        console.log('5. Cleanup...');
        yield db_1.default.query('DELETE FROM doctors WHERE email = $1', [email]);
        console.log('   Cleanup done.');
        process.exit(0);
    }
    catch (err) {
        console.error('TEST FAILED:', err);
        process.exit(1);
    }
});
run();
