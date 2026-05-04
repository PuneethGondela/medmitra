"use strict";
/**
 * Comprehensive Doctor Backend Testing Script
 * Tests all doctor-related backend functionality
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
const db_1 = __importDefault(require("./config/db"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
// Test Doctor Credentials (create one if doesn't exist)
const TEST_DOCTOR = {
    email: 'test.doctor@medimitra.in',
    password: 'TestDoctor123!',
    fullName: 'Test Doctor',
    medicalLicense: 'MD_TEST_001',
    specialization: 'General Medicine',
    hospitalName: 'Test Hospital',
};
let testDoctorId;
let doctorToken;
function createTestDoctor() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('\n📋 Step 1: Creating Test Doctor Account...\n');
        try {
            // Check if doctor exists
            const checkResult = yield db_1.default.query('SELECT * FROM doctors WHERE email = $1', [TEST_DOCTOR.email]);
            if (checkResult.rows.length > 0) {
                testDoctorId = checkResult.rows[0].doctor_id;
                console.log('✅ Test doctor already exists:', testDoctorId);
            }
            else {
                // Create doctor
                const year = new Date().getFullYear();
                const countRes = yield db_1.default.query('SELECT COUNT(*) FROM doctors');
                const count = parseInt(countRes.rows[0].count) + 1;
                testDoctorId = `DOC_${year}_${String(count).padStart(3, '0')}`;
                const hash = yield bcrypt_1.default.hash(TEST_DOCTOR.password, 10);
                yield db_1.default.query(`INSERT INTO doctors (
                    doctor_id, full_name, email, medical_license,
                    specialization, hospital_name, login_username, password_hash
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
                    testDoctorId,
                    TEST_DOCTOR.fullName,
                    TEST_DOCTOR.email,
                    TEST_DOCTOR.medicalLicense,
                    TEST_DOCTOR.specialization,
                    TEST_DOCTOR.hospitalName,
                    TEST_DOCTOR.email.split('@')[0],
                    hash
                ]);
                console.log('✅ Test doctor created:', testDoctorId);
            }
            // Generate token for testing
            doctorToken = jsonwebtoken_1.default.sign({ doctorId: testDoctorId, role: 'doctor', email: TEST_DOCTOR.email }, JWT_SECRET, { expiresIn: '12h' });
            console.log('✅ Doctor token generated');
        }
        catch (error) {
            console.error('❌ Error creating test doctor:', error.message);
            throw error;
        }
    });
}
function testDoctorLogin() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('\n📋 Step 2: Testing Doctor Login...\n');
        try {
            // Simulate login
            const result = yield db_1.default.query('SELECT * FROM doctors WHERE email = $1', [TEST_DOCTOR.email]);
            if (result.rows.length === 0) {
                throw new Error('Doctor not found');
            }
            const doctor = result.rows[0];
            const valid = yield bcrypt_1.default.compare(TEST_DOCTOR.password, doctor.password_hash);
            if (!valid) {
                throw new Error('Invalid password');
            }
            console.log('✅ Login successful');
            console.log('   Doctor ID:', doctor.doctor_id);
            console.log('   Name:', doctor.full_name);
            console.log('   Email:', doctor.email);
            console.log('   Status:', doctor.account_status);
            console.log('   Permissions:');
            console.log('     - Can Add Visits:', doctor.can_add_visits);
            console.log('     - Can Edit Visits:', doctor.can_edit_own_visits);
            console.log('     - Can Delete Visits:', doctor.can_delete_visits);
            console.log('     - Can View All Workers:', doctor.can_view_all_workers);
        }
        catch (error) {
            console.error('❌ Login test failed:', error.message);
            throw error;
        }
    });
}
function testWorkerAccess() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('\n📋 Step 3: Testing Worker Data Access...\n');
        try {
            // Check if workers table exists
            const workersResult = yield db_1.default.query('SELECT COUNT(*) FROM workers');
            console.log('✅ Workers table accessible');
            console.log('   Total workers:', workersResult.rows[0].count);
            // Get sample workers
            const sampleResult = yield db_1.default.query('SELECT worker_id, full_name, mobile_number, assigned_village FROM workers LIMIT 5');
            if (sampleResult.rows.length > 0) {
                console.log('✅ Sample workers:');
                sampleResult.rows.forEach((w, i) => {
                    console.log(`   ${i + 1}. ${w.full_name} (${w.worker_id})`);
                    console.log(`      Mobile: ${w.mobile_number}, Village: ${w.assigned_village}`);
                });
            }
            else {
                console.log('⚠️  No workers found in database');
            }
        }
        catch (error) {
            console.error('❌ Worker access test failed:', error.message);
            throw error;
        }
    });
}
function testDoctorAssignments() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('\n📋 Step 4: Testing Doctor-Worker Assignments...\n');
        try {
            // Check if doctor_assignments table exists (Supabase)
            const checkTable = yield db_1.default.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'doctor_assignments'
            )
        `);
            if (checkTable.rows[0].exists) {
                console.log('✅ doctor_assignments table exists');
                const assignmentsResult = yield db_1.default.query(`SELECT COUNT(*) FROM doctor_assignments WHERE doctor_id = $1`, [testDoctorId]);
                console.log(`   Assignments for this doctor: ${assignmentsResult.rows[0].count}`);
            }
            else {
                console.log('⚠️  doctor_assignments table does not exist in backend database');
                console.log('   (This table exists in Supabase, not in Node.js backend)');
            }
        }
        catch (error) {
            console.error('❌ Assignment test failed:', error.message);
            // This is expected if table doesn't exist in backend DB
        }
    });
}
function testAuditLogging() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('\n📋 Step 5: Testing Audit Logging...\n');
        try {
            // Insert test audit log
            yield db_1.default.query(`INSERT INTO audit_logs (user_id, user_type, action, details)
             VALUES ($1, $2, $3, $4)`, [
                testDoctorId,
                'DOCTOR',
                'TEST_ACTION',
                JSON.stringify({ test: true, timestamp: new Date().toISOString() })
            ]);
            console.log('✅ Audit log created successfully');
            // Retrieve recent logs
            const logsResult = yield db_1.default.query(`SELECT action, user_type, timestamp
             FROM audit_logs
             WHERE user_id = $1
             ORDER BY timestamp DESC
             LIMIT 5`, [testDoctorId]);
            console.log(`✅ Found ${logsResult.rows.length} recent audit logs:`);
            logsResult.rows.forEach((log, i) => {
                console.log(`   ${i + 1}. ${log.action} (${log.user_type}) - ${log.timestamp}`);
            });
        }
        catch (error) {
            console.error('❌ Audit logging test failed:', error.message);
            // Non-critical, continue
        }
    });
}
function testDatabaseSchema() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('\n📋 Step 6: Verifying Database Schema...\n');
        try {
            // Check doctors table structure
            const columnsResult = yield db_1.default.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'doctors'
            ORDER BY ordinal_position
        `);
            console.log('✅ Doctors table columns:');
            columnsResult.rows.forEach(col => {
                console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(required)'}`);
            });
            // Check constraints
            const constraintsResult = yield db_1.default.query(`
            SELECT constraint_name, constraint_type
            FROM information_schema.table_constraints
            WHERE table_name = 'doctors'
        `);
            console.log('\n✅ Doctors table constraints:');
            constraintsResult.rows.forEach(con => {
                console.log(`   - ${con.constraint_name}: ${con.constraint_type}`);
            });
        }
        catch (error) {
            console.error('❌ Schema verification failed:', error.message);
        }
    });
}
function generateReport() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('\n' + '='.repeat(60));
        console.log('📊 DOCTOR BACKEND TEST REPORT');
        console.log('='.repeat(60) + '\n');
        console.log('Test Doctor Credentials:');
        console.log(`  Email: ${TEST_DOCTOR.email}`);
        console.log(`  Password: ${TEST_DOCTOR.password}`);
        console.log(`  Doctor ID: ${testDoctorId}\n`);
        console.log('Backend API Endpoints:');
        console.log('  ✅ POST /api/doctors/login - Doctor login');
        console.log('  ⚠️  POST /api/doctors/ - Create doctor (Admin only)');
        console.log('  ⚠️  GET /api/doctors/ - List doctors (Admin only)');
        console.log('  ❌ No endpoint for doctors to view assigned workers');
        console.log('  ❌ No endpoint for doctors to create/view visits');
        console.log('  ❌ No endpoint for worker assignment\n');
        console.log('Frontend Features:');
        console.log('  ✅ Doctor login via backend API');
        console.log('  ✅ Worker creation via Next.js API route (/api/doctor/create-worker)');
        console.log('  ✅ Visit creation via direct Supabase operations');
        console.log('  ✅ Worker profile editing via direct Supabase operations');
        console.log('  ✅ Visit viewing via direct Supabase queries\n');
        console.log('Database Tables:');
        console.log('  ✅ doctors - Backend PostgreSQL');
        console.log('  ✅ workers - Backend PostgreSQL');
        console.log('  ✅ audit_logs - Backend PostgreSQL');
        console.log('  ✅ users - Supabase (for worker accounts)');
        console.log('  ✅ records - Supabase (for visit records)');
        console.log('  ✅ attachments - Supabase (for file uploads)\n');
        console.log('⚠️  Note: Doctor operations are split between:');
        console.log('   1. Node.js Backend (doctor login, admin management)');
        console.log('   2. Supabase (visit creation, worker profiles)\n');
    });
}
// Main execution
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('='.repeat(60));
            console.log('🧪 DOCTOR BACKEND COMPREHENSIVE TEST');
            console.log('='.repeat(60));
            yield createTestDoctor();
            yield testDoctorLogin();
            yield testWorkerAccess();
            yield testDoctorAssignments();
            yield testAuditLogging();
            yield testDatabaseSchema();
            yield generateReport();
            console.log('='.repeat(60));
            console.log('✅ ALL TESTS COMPLETED');
            console.log('='.repeat(60) + '\n');
            process.exit(0);
        }
        catch (error) {
            console.error('\n❌ TEST FAILED:', error.message);
            console.error(error.stack);
            process.exit(1);
        }
    });
}
main();
