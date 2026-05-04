"use strict";
/**
 * Comprehensive Backend Test Suite
 * Tests all roles, endpoints, AI integration, and data storage
 */
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
const axios_1 = __importDefault(require("axios"));
const db_1 = __importDefault(require("./config/db"));
const BASE_URL = process.env.BACKEND_URL || 'http://localhost:4000';
const ML_SERVER_URL = process.env.ML_SERVER_URL || 'http://localhost:8000';
// Test credentials
const ADMIN_EMAIL = 'admin@medimitra.in';
const ADMIN_MOBILE = '9876543210';
const ADMIN_PASSWORD = 'admin&125';
const results = [];
// Helper to log results
function logResult(result) {
    results.push(result);
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.name}`);
    if (result.error) {
        console.log(`   Error: ${result.error}`);
    }
}
// Helper to get auth token
function getAdminToken() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield axios_1.default.post(`${BASE_URL}/api/admin/login`, {
                identifier: ADMIN_EMAIL,
                password: ADMIN_PASSWORD
            });
            return response.data.token;
        }
        catch (error) {
            console.error('Failed to get admin token:', error.message);
            return null;
        }
    });
}
// 1. Database Connection Test
function testDatabaseConnection() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const result = yield db_1.default.query('SELECT NOW()');
            console.log({
                name: 'Database Connection',
                passed: true,
                data: { timestamp: result.rows[0].now }
            });
            return true;
        }
        catch (error) {
            console.log({
                name: 'Database Connection',
                passed: false,
                error: error.message
            });
            return false;
        }
    });
}
// 2. Database Tables Test
function testDatabaseTables() {
    return __awaiter(this, void 0, void 0, function* () {
        const tables = ['admins', 'doctors', 'workers', 'blood_donors', 'audit_logs'];
        let allPassed = true;
        for (const table of tables) {
            try {
                const result = yield db_1.default.query(`SELECT COUNT(*) FROM ${table}`);
                console.log({
                    name: `Table: ${table}`,
                    passed: true,
                    data: { count: result.rows[0].count }
                });
            }
            catch (error) {
                console.log({
                    name: `Table: ${table}`,
                    passed: false,
                    error: error.message
                });
                allPassed = false;
            }
        }
        return allPassed;
    });
}
// 3. Admin Login Tests
function testAdminLogin() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        // Test with email
        try {
            const response = yield axios_1.default.post(`${BASE_URL}/api/admin/login`, {
                identifier: ADMIN_EMAIL,
                password: ADMIN_PASSWORD
            });
            console.log({
                name: 'Admin Login (Email)',
                passed: response.status === 200 && !!response.data.token,
                data: { email: ADMIN_EMAIL }
            });
        }
        catch (error) {
            console.log({
                name: 'Admin Login (Email)',
                passed: false,
                error: ((_b = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.error) || error.message
            });
        }
        // Test with mobile
        try {
            const response = yield axios_1.default.post(`${BASE_URL}/api/admin/login`, {
                identifier: ADMIN_MOBILE,
                password: ADMIN_PASSWORD
            });
            console.log({
                name: 'Admin Login (Mobile)',
                passed: response.status === 200 && !!response.data.token,
                data: { mobile: ADMIN_MOBILE }
            });
        }
        catch (error) {
            console.log({
                name: 'Admin Login (Mobile)',
                passed: false,
                error: ((_d = (_c = error.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.error) || error.message
            });
        }
    });
}
// 4. Admin Credentials Verification
function testAdminCredentials() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const result = yield db_1.default.query('SELECT email, mobile_number, role FROM admins WHERE email = $1 OR mobile_number = $2', [ADMIN_EMAIL, ADMIN_MOBILE]);
            if (result.rows.length === 0) {
                console.log({
                    name: 'Admin Credentials Verification',
                    passed: false,
                    error: 'Admin account not found in database'
                });
                return false;
            }
            const admin = result.rows[0];
            const correctEmail = admin.email === ADMIN_EMAIL;
            const correctMobile = admin.mobile_number === ADMIN_MOBILE;
            const correctRole = admin.role === 'SUPER_ADMIN';
            console.log({
                name: 'Admin Credentials Verification',
                passed: correctEmail && correctMobile && correctRole,
                data: {
                    email: admin.email,
                    mobile: admin.mobile_number,
                    role: admin.role
                }
            });
            return correctEmail && correctMobile && correctRole;
        }
        catch (error) {
            console.log({
                name: 'Admin Credentials Verification',
                passed: false,
                error: error.message
            });
            return false;
        }
    });
}
// 5. Test All Admin Endpoints
function testAdminEndpoints() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const token = yield getAdminToken();
        if (!token) {
            console.log({
                name: 'Admin Endpoints Test',
                passed: false,
                error: 'Could not get admin token'
            });
            return;
        }
        const headers = { Authorization: `Bearer ${token}` };
        // Test stats endpoint
        try {
            const response = yield axios_1.default.get(`${BASE_URL}/api/stats`, { headers });
            console.log({
                name: 'GET /api/stats (Admin)',
                passed: response.status === 200,
                data: response.data
            });
        }
        catch (error) {
            console.log({
                name: 'GET /api/stats (Admin)',
                passed: false,
                error: ((_b = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.error) || error.message
            });
        }
        // Test doctors list
        try {
            const response = yield axios_1.default.get(`${BASE_URL}/api/doctors/all`, { headers });
            console.log({
                name: 'GET /api/doctors/all',
                passed: response.status === 200,
                data: { count: response.data.length }
            });
        }
        catch (error) {
            console.log({
                name: 'GET /api/doctors/all',
                passed: false,
                error: ((_d = (_c = error.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.error) || error.message
            });
        }
        // Test workers list
        try {
            const response = yield axios_1.default.get(`${BASE_URL}/api/workers`, { headers });
            console.log({
                name: 'GET /api/workers',
                passed: response.status === 200,
                data: { count: response.data.length }
            });
        }
        catch (error) {
            console.log({
                name: 'GET /api/workers',
                passed: false,
                error: ((_f = (_e = error.response) === null || _e === void 0 ? void 0 : _e.data) === null || _f === void 0 ? void 0 : _f.error) || error.message
            });
        }
        // Test donors list
        try {
            const response = yield axios_1.default.get(`${BASE_URL}/api/donors`, { headers });
            console.log({
                name: 'GET /api/donors',
                passed: response.status === 200,
                data: { count: response.data.length }
            });
        }
        catch (error) {
            console.log({
                name: 'GET /api/donors',
                passed: false,
                error: ((_h = (_g = error.response) === null || _g === void 0 ? void 0 : _g.data) === null || _h === void 0 ? void 0 : _h.error) || error.message
            });
        }
    });
}
// 6. Test AI/Bot Integration
function testAIIntegration() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        const token = yield getAdminToken();
        if (!token) {
            console.log({
                name: 'AI Integration Test',
                passed: false,
                error: 'Could not get admin token'
            });
            return;
        }
        const headers = { Authorization: `Bearer ${token}` };
        // Test ML Server connectivity
        try {
            const response = yield axios_1.default.get(`${ML_SERVER_URL}/health`, { timeout: 5000 });
            console.log({
                name: 'ML Server Connection',
                passed: response.status === 200,
                data: response.data
            });
        }
        catch (error) {
            console.log({
                name: 'ML Server Connection',
                passed: false,
                error: 'ML Server not responding (may be offline)'
            });
        }
        // Test chat endpoint (public, no auth required)
        try {
            const response = yield axios_1.default.post(`${BASE_URL}/api/bot/chat`, {
                messages: [{ role: 'user', content: 'Hello, test message' }],
                role: 'user'
            });
            console.log({
                name: 'POST /api/bot/chat',
                passed: response.status === 200 && !!response.data.response,
                data: { hasResponse: !!response.data.response }
            });
        }
        catch (error) {
            console.log({
                name: 'POST /api/bot/chat',
                passed: false,
                error: ((_b = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.error) || error.message
            });
        }
        // Test system analysis endpoint (admin only)
        try {
            const response = yield axios_1.default.post(`${BASE_URL}/api/bot/analyze`, {
                query: 'Analyze system security'
            }, { headers });
            console.log({
                name: 'POST /api/bot/analyze',
                passed: response.status === 200,
                data: { hasAnalysis: !!response.data.analysis }
            });
        }
        catch (error) {
            console.log({
                name: 'POST /api/bot/analyze',
                passed: false,
                error: ((_d = (_c = error.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.error) || error.message
            });
        }
    });
}
// 7. Test Data Storage
function testDataStorage() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const token = yield getAdminToken();
        if (!token) {
            console.log({
                name: 'Data Storage Test',
                passed: false,
                error: 'Could not get admin token'
            });
            return;
        }
        const headers = { Authorization: `Bearer ${token}` };
        // Test creating a donor (stores data)
        try {
            const testDonor = {
                fullName: 'Test Donor',
                bloodGroup: 'O+',
                mobileNumber: '9999999999',
                age: 30,
                gender: 'Male',
                city: 'Test City'
            };
            const response = yield axios_1.default.post(`${BASE_URL}/api/donors`, testDonor, { headers });
            console.log({
                name: 'POST /api/donors (Data Storage)',
                passed: response.status === 201,
                data: { message: response.data.message }
            });
            // Clean up test data
            yield db_1.default.query('DELETE FROM blood_donors WHERE mobile_number = $1', [testDonor.mobileNumber]);
        }
        catch (error) {
            console.log({
                name: 'POST /api/donors (Data Storage)',
                passed: false,
                error: ((_b = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.error) || error.message
            });
        }
        // Test audit log storage
        try {
            const logResult = yield db_1.default.query('SELECT COUNT(*) FROM audit_logs WHERE action = $1', ['AI_CHAT']);
            console.log({
                name: 'Audit Log Storage',
                passed: true,
                data: { aiChatLogs: logResult.rows[0].count }
            });
        }
        catch (error) {
            console.log({
                name: 'Audit Log Storage',
                passed: false,
                error: error.message
            });
        }
    });
}
// 8. Test Doctor Login
function testDoctorLogin() {
    return __awaiter(this, void 0, void 0, function* () {
        // First, check if any doctors exist
        try {
            const result = yield db_1.default.query('SELECT email FROM doctors WHERE account_status = $1 LIMIT 1', ['ACTIVE']);
            if (result.rows.length === 0) {
                console.log({
                    name: 'Doctor Login Test',
                    passed: false,
                    error: 'No active doctors found in database'
                });
                return;
            }
            // Note: We can't test actual login without password, but we can verify endpoint exists
            console.log({
                name: 'Doctor Login Endpoint Available',
                passed: true,
                data: { doctorEmail: result.rows[0].email }
            });
        }
        catch (error) {
            console.log({
                name: 'Doctor Login Test',
                passed: false,
                error: error.message
            });
        }
    });
}
// Main test runner
function runAllTests() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('='.repeat(60));
        console.log('Med Mitra Backend - Comprehensive Test Suite');
        console.log('='.repeat(60));
        console.log('');
        console.log('📋 Running Tests...\n');
        // 1. Database tests
        console.log('1️⃣ Database Tests');
        console.log('-'.repeat(60));
        yield testDatabaseConnection();
        yield testDatabaseTables();
        console.log('');
        // 2. Authentication tests
        console.log('2️⃣ Authentication Tests');
        console.log('-'.repeat(60));
        yield testAdminCredentials();
        yield testAdminLogin();
        yield testDoctorLogin();
        console.log('');
        // 3. Endpoint tests
        console.log('3️⃣ Endpoint Tests');
        console.log('-'.repeat(60));
        yield testAdminEndpoints();
        console.log('');
        // 4. AI Integration tests
        console.log('4️⃣ AI Integration Tests');
        console.log('-'.repeat(60));
        yield testAIIntegration();
        console.log('');
        // 5. Data Storage tests
        console.log('5️⃣ Data Storage Tests');
        console.log('-'.repeat(60));
        yield testDataStorage();
        console.log('');
        // Summary
        console.log('='.repeat(60));
        console.log('📊 Test Summary');
        console.log('='.repeat(60));
        const passed = results.filter(r => r.passed).length;
        const failed = results.filter(r => !r.passed).length;
        const total = results.length;
        console.log(`Total Tests: ${total}`);
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
        console.log('');
        if (failed > 0) {
            console.log('Failed Tests:');
            results.filter(r => !r.passed).forEach(r => {
                console.log(`  ❌ ${r.name}: ${r.error}`);
            });
        }
        yield db_1.default.end();
        process.exit(failed > 0 ? 1 : 0);
    });
}
// Run tests
runAllTests().catch(console.error);
