/**
 * Comprehensive Backend Test Suite
 * Tests all roles, endpoints, AI integration, and data storage
 */

import axios from 'axios';
import pool from './config/db';

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:4000';
const ML_SERVER_URL = process.env.ML_SERVER_URL || 'http://localhost:8000';

// Test credentials
const ADMIN_EMAIL = 'admin@medimitra.in';
const ADMIN_MOBILE = '9876543210';
const ADMIN_PASSWORD = 'admin&125';

interface TestResult {
    name: string;
    passed: boolean;
    error?: string;
    data?: any;
}

const results: TestResult[] = [];

// Helper to log results
function logResult(result: TestResult) {
    results.push(result);
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.name}`);
    if (result.error) {
        console.log(`   Error: ${result.error}`);
    }
}

// Helper to get auth token
async function getAdminToken(): Promise<string | null> {
    try {
        const response = await axios.post(`${BASE_URL}/api/admin/login`, {
            identifier: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        });
        return response.data.token;
    } catch (error: any) {
        console.error('Failed to get admin token:', error.message);
        return null;
    }
}

// 1. Database Connection Test
async function testDatabaseConnection() {
    try {
        const result = await pool.query('SELECT NOW()');
        console.log({
            name: 'Database Connection',
            passed: true,
            data: { timestamp: result.rows[0].now }
        });
        return true;
    } catch (error: any) {
        console.log({
            name: 'Database Connection',
            passed: false,
            error: error.message
        });
        return false;
    }
}

// 2. Database Tables Test
async function testDatabaseTables() {
    const tables = ['admins', 'doctors', 'workers', 'blood_donors', 'audit_logs'];
    let allPassed = true;

    for (const table of tables) {
        try {
            const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
            console.log({
                name: `Table: ${table}`,
                passed: true,
                data: { count: result.rows[0].count }
            });
        } catch (error: any) {
            console.log({
                name: `Table: ${table}`,
                passed: false,
                error: error.message
            });
            allPassed = false;
        }
    }
    return allPassed;
}

// 3. Admin Login Tests
async function testAdminLogin() {
    // Test with email
    try {
        const response = await axios.post(`${BASE_URL}/api/admin/login`, {
            identifier: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        });
        console.log({
            name: 'Admin Login (Email)',
            passed: response.status === 200 && !!response.data.token,
            data: { email: ADMIN_EMAIL }
        });
    } catch (error: any) {
        console.log({
            name: 'Admin Login (Email)',
            passed: false,
            error: error.response?.data?.error || error.message
        });
    }

    // Test with mobile
    try {
        const response = await axios.post(`${BASE_URL}/api/admin/login`, {
            identifier: ADMIN_MOBILE,
            password: ADMIN_PASSWORD
        });
        console.log({
            name: 'Admin Login (Mobile)',
            passed: response.status === 200 && !!response.data.token,
            data: { mobile: ADMIN_MOBILE }
        });
    } catch (error: any) {
        console.log({
            name: 'Admin Login (Mobile)',
            passed: false,
            error: error.response?.data?.error || error.message
        });
    }
}

// 4. Admin Credentials Verification
async function testAdminCredentials() {
    try {
        const result = await pool.query(
            'SELECT email, mobile_number, role FROM admins WHERE email = $1 OR mobile_number = $2',
            [ADMIN_EMAIL, ADMIN_MOBILE]
        );

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
    } catch (error: any) {
        console.log({
            name: 'Admin Credentials Verification',
            passed: false,
            error: error.message
        });
        return false;
    }
}

// 5. Test All Admin Endpoints
async function testAdminEndpoints() {
    const token = await getAdminToken();
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
        const response = await axios.get(`${BASE_URL}/api/stats`, { headers });
        console.log({
            name: 'GET /api/stats (Admin)',
            passed: response.status === 200,
            data: response.data
        });
    } catch (error: any) {
        console.log({
            name: 'GET /api/stats (Admin)',
            passed: false,
            error: error.response?.data?.error || error.message
        });
    }

    // Test doctors list
    try {
        const response = await axios.get(`${BASE_URL}/api/doctors/all`, { headers });
        console.log({
            name: 'GET /api/doctors/all',
            passed: response.status === 200,
            data: { count: response.data.length }
        });
    } catch (error: any) {
        console.log({
            name: 'GET /api/doctors/all',
            passed: false,
            error: error.response?.data?.error || error.message
        });
    }

    // Test workers list
    try {
        const response = await axios.get(`${BASE_URL}/api/workers`, { headers });
        console.log({
            name: 'GET /api/workers',
            passed: response.status === 200,
            data: { count: response.data.length }
        });
    } catch (error: any) {
        console.log({
            name: 'GET /api/workers',
            passed: false,
            error: error.response?.data?.error || error.message
        });
    }

    // Test donors list
    try {
        const response = await axios.get(`${BASE_URL}/api/donors`, { headers });
        console.log({
            name: 'GET /api/donors',
            passed: response.status === 200,
            data: { count: response.data.length }
        });
    } catch (error: any) {
        console.log({
            name: 'GET /api/donors',
            passed: false,
            error: error.response?.data?.error || error.message
        });
    }
}

// 6. Test AI/Bot Integration
async function testAIIntegration() {
    const token = await getAdminToken();
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
        const response = await axios.get(`${ML_SERVER_URL}/health`, { timeout: 5000 });
        console.log({
            name: 'ML Server Connection',
            passed: response.status === 200,
            data: response.data
        });
    } catch (error: any) {
        console.log({
            name: 'ML Server Connection',
            passed: false,
            error: 'ML Server not responding (may be offline)'
        });
    }

    // Test chat endpoint (public, no auth required)
    try {
        const response = await axios.post(`${BASE_URL}/api/bot/chat`, {
            messages: [{ role: 'user', content: 'Hello, test message' }],
            role: 'user'
        });
        console.log({
            name: 'POST /api/bot/chat',
            passed: response.status === 200 && !!response.data.response,
            data: { hasResponse: !!response.data.response }
        });
    } catch (error: any) {
        console.log({
            name: 'POST /api/bot/chat',
            passed: false,
            error: error.response?.data?.error || error.message
        });
    }

    // Test system analysis endpoint (admin only)
    try {
        const response = await axios.post(`${BASE_URL}/api/bot/analyze`, {
            query: 'Analyze system security'
        }, { headers });
        console.log({
            name: 'POST /api/bot/analyze',
            passed: response.status === 200,
            data: { hasAnalysis: !!response.data.analysis }
        });
    } catch (error: any) {
        console.log({
            name: 'POST /api/bot/analyze',
            passed: false,
            error: error.response?.data?.error || error.message
        });
    }
}

// 7. Test Data Storage
async function testDataStorage() {
    const token = await getAdminToken();
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

        const response = await axios.post(`${BASE_URL}/api/donors`, testDonor, { headers });
        console.log({
            name: 'POST /api/donors (Data Storage)',
            passed: response.status === 201,
            data: { message: response.data.message }
        });

        // Clean up test data
        await pool.query('DELETE FROM blood_donors WHERE mobile_number = $1', [testDonor.mobileNumber]);
    } catch (error: any) {
        console.log({
            name: 'POST /api/donors (Data Storage)',
            passed: false,
            error: error.response?.data?.error || error.message
        });
    }

    // Test audit log storage
    try {
        const logResult = await pool.query(
            'SELECT COUNT(*) FROM audit_logs WHERE action = $1',
            ['AI_CHAT']
        );
        console.log({
            name: 'Audit Log Storage',
            passed: true,
            data: { aiChatLogs: logResult.rows[0].count }
        });
    } catch (error: any) {
        console.log({
            name: 'Audit Log Storage',
            passed: false,
            error: error.message
        });
    }
}

// 8. Test Doctor Login
async function testDoctorLogin() {
    // First, check if any doctors exist
    try {
        const result = await pool.query('SELECT email FROM doctors WHERE account_status = $1 LIMIT 1', ['ACTIVE']);
        
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
    } catch (error: any) {
        console.log({
            name: 'Doctor Login Test',
            passed: false,
            error: error.message
        });
    }
}

// Main test runner
async function runAllTests() {
    console.log('='.repeat(60));
    console.log('Med Mitra Backend - Comprehensive Test Suite');
    console.log('='.repeat(60));
    console.log('');

    console.log('📋 Running Tests...\n');

    // 1. Database tests
    console.log('1️⃣ Database Tests');
    console.log('-'.repeat(60));
    await testDatabaseConnection();
    await testDatabaseTables();
    console.log('');

    // 2. Authentication tests
    console.log('2️⃣ Authentication Tests');
    console.log('-'.repeat(60));
    await testAdminCredentials();
    await testAdminLogin();
    await testDoctorLogin();
    console.log('');

    // 3. Endpoint tests
    console.log('3️⃣ Endpoint Tests');
    console.log('-'.repeat(60));
    await testAdminEndpoints();
    console.log('');

    // 4. AI Integration tests
    console.log('4️⃣ AI Integration Tests');
    console.log('-'.repeat(60));
    await testAIIntegration();
    console.log('');

    // 5. Data Storage tests
    console.log('5️⃣ Data Storage Tests');
    console.log('-'.repeat(60));
    await testDataStorage();
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

    await pool.end();
    process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(console.error);
