/**
 * Test Script to Verify Admin Backend Functionality
 * 
 * This script tests:
 * 1. Database connection
 * 2. Admin login
 * 3. Doctor creation and data storage
 * 4. Bot functionality
 * 
 * Run: npx ts-node src/test_admin_functionality.ts
 */

import pool from './config/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import axios from 'axios';

const JWT_SECRET = process.env.JWT_SECRET || 'med-mitra-super-secret-jwt-key-change-in-production-2025';
const BACKEND_URL = 'http://localhost:4000';

async function testDatabaseConnection() {
    console.log('\n1️⃣ Testing Database Connection...');
    try {
        const result = await pool.query('SELECT NOW()');
        console.log('✅ Database connected:', result.rows[0].now);
        return true;
    } catch (error: any) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
}

async function testTablesExist() {
    console.log('\n2️⃣ Checking Required Tables...');
    const tables = ['admins', 'doctors', 'audit_logs', 'workers', 'blood_donors'];
    
    for (const table of tables) {
        try {
            const result = await pool.query(
                `SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = $1
                )`,
                [table]
            );
            
            if (result.rows[0].exists) {
                console.log(`  ✅ Table "${table}" exists`);
                
                // Count rows
                const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
                console.log(`     └─ Rows: ${countResult.rows[0].count}`);
            } else {
                console.log(`  ❌ Table "${table}" NOT FOUND`);
            }
        } catch (error: any) {
            console.log(`  ⚠️  Error checking "${table}":`, error.message);
        }
    }
}

async function testAdminExists() {
    console.log('\n3️⃣ Checking Admin Account...');
    try {
        const result = await pool.query('SELECT admin_id, email, role FROM admins LIMIT 1');
        if (result.rows.length > 0) {
            const admin = result.rows[0];
            console.log('✅ Admin found:');
            console.log(`   Email: ${admin.email}`);
            console.log(`   Role: ${admin.role}`);
            return admin;
        } else {
            console.log('⚠️  No admin found. Run: npm run seed:admin');
            return null;
        }
    } catch (error: any) {
        console.error('❌ Error checking admin:', error.message);
        return null;
    }
}

async function testAdminLogin(email: string, password: string) {
    console.log('\n4️⃣ Testing Admin Login...');
    try {
        const response = await axios.post(`${BACKEND_URL}/api/admin/login`, {
            email,
            password
        });
        
        if (response.data.token) {
            console.log('✅ Admin login successful');
            console.log(`   Token: ${response.data.token.substring(0, 20)}...`);
            return response.data.token;
        }
    } catch (error: any) {
        console.error('❌ Admin login failed:', error.response?.data?.error || error.message);
        return null;
    }
}

async function testDoctorCreation(token: string) {
    console.log('\n5️⃣ Testing Doctor Creation...');
    try {
        const testDoctor = {
            fullName: 'Test Doctor ' + Date.now(),
            email: `test.doctor.${Date.now()}@test.com`,
            mobileNumber: '9876543210',
            medicalLicense: `TEST-LIC-${Date.now()}`,
            specialization: 'Cardiology',
            hospitalName: 'Test Hospital',
            hospitalId: 'TEST_HOSP_001',
            loginUsername: `testdoc${Date.now()}`
        };

        const response = await axios.post(
            `${BACKEND_URL}/api/doctors`,
            testDoctor,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.data.doctor) {
            console.log('✅ Doctor created successfully');
            console.log(`   Doctor ID: ${response.data.doctor.doctor_id}`);
            console.log(`   Email: ${response.data.doctor.email}`);
            console.log(`   Temp Password: ${response.data.tempPassword}`);
            
            // Verify in database
            const dbCheck = await pool.query(
                'SELECT * FROM doctors WHERE doctor_id = $1',
                [response.data.doctor.doctor_id]
            );
            
            if (dbCheck.rows.length > 0) {
                console.log('✅ Doctor data stored in database');
                return response.data.doctor.doctor_id;
            } else {
                console.log('❌ Doctor NOT found in database after creation!');
                return null;
            }
        }
    } catch (error: any) {
        console.error('❌ Doctor creation failed:', error.response?.data?.error || error.message);
        return null;
    }
}

async function testBotFunctionality(token: string) {
    console.log('\n6️⃣ Testing Bot Functionality...');
    try {
        // Test analyze endpoint
        const analyzeResponse = await axios.post(
            `${BACKEND_URL}/api/bot/analyze`,
            { query: 'Show me system statistics' },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (analyzeResponse.data) {
            console.log('✅ Bot analyze endpoint working');
            console.log(`   Response length: ${analyzeResponse.data.analysis?.length || 0} chars`);
            
            if (analyzeResponse.data.contextUsed) {
                console.log('✅ Context data retrieved:');
                console.log(`   - Doctors: ${analyzeResponse.data.contextUsed.stats?.totalDoctors || 0}`);
                console.log(`   - Workers: ${analyzeResponse.data.contextUsed.stats?.totalWorkers || 0}`);
                console.log(`   - Donors: ${analyzeResponse.data.contextUsed.stats?.totalDonors || 0}`);
            }
            
            return true;
        }
    } catch (error: any) {
        console.error('❌ Bot functionality failed:', error.response?.data?.error || error.message);
        if (error.code === 'ECONNREFUSED') {
            console.log('   ⚠️  ML Server is not running on port 8000');
        }
        return false;
    }
}

async function testAuditLogs() {
    console.log('\n7️⃣ Checking Audit Logs...');
    try {
        const result = await pool.query(
            'SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 5'
        );
        
        if (result.rows.length > 0) {
            console.log(`✅ Found ${result.rows.length} recent audit logs:`);
            result.rows.forEach((log, i) => {
                console.log(`   ${i + 1}. ${log.action} by ${log.user_type} at ${log.timestamp}`);
            });
        } else {
            console.log('⚠️  No audit logs found');
        }
    } catch (error: any) {
        console.error('❌ Error checking audit logs:', error.message);
    }
}

async function main() {
    console.log('🧪 Testing Admin Backend Functionality\n');
    console.log('='.repeat(50));

    // 1. Test database connection
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
        console.log('\n❌ Cannot proceed without database connection');
        process.exit(1);
    }

    // 2. Check tables
    await testTablesExist();

    // 3. Check admin exists
    const admin = await testAdminExists();
    if (!admin) {
        console.log('\n⚠️  Please create admin account first: npm run seed:admin');
        process.exit(1);
    }

    // 4. Test login
    const token = await testAdminLogin('admin@medimitra.in', 'admin&125');
    if (!token) {
        console.log('\n❌ Cannot proceed without valid token');
        process.exit(1);
    }

    // 5. Test doctor creation
    const doctorId = await testDoctorCreation(token);
    if (doctorId) {
        console.log('\n✅ Doctor creation and storage verified!');
    }

    // 6. Test bot
    await testBotFunctionality(token);

    // 7. Check audit logs
    await testAuditLogs();

    console.log('\n' + '='.repeat(50));
    console.log('✅ Testing Complete!\n');

    process.exit(0);
}

main().catch(console.error);
