import pool from './config/db';
import bcrypt from 'bcrypt';
import fetch from 'node-fetch';

const API_URL = 'http://localhost:4000/api/doctors/login';

const run = async () => {
    const email = 'test_verify@example.com';
    const password = 'TestPassword123!';

    try {
        console.log('1. Cleaning up old test user...');
        await pool.query('DELETE FROM doctors WHERE email = $1', [email]);

        console.log('2. Creating test user manually in DB (simulating Controller logic)...');
        const hash = await bcrypt.hash(password, 10);
        await pool.query(`
            INSERT INTO doctors (doctor_id, full_name, email, mobile_number, medical_license, specialization, hospital_name, hospital_id, login_username, password_hash, account_status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'ACTIVE')
        `, ['DOC_TEST_001', 'Test Doc', email, '0000000000', 'LIC-TEST', 'General', 'Test Hosp', 'HOSP-TEST', 'test.doc', hash]);
        console.log('   User created in DB.');

        console.log('3. Verifying Hash locally...');
        const res = await pool.query('SELECT * FROM doctors WHERE email = $1', [email]);
        const user = res.rows[0];
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) throw new Error('Local bcrypt comparison FAILED');
        console.log('   Local hash check PASSED.');

        console.log('4. Attempting Login via API...');
        const loginRes = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (loginRes.ok) {
            const data = await loginRes.json();
            console.log('   API Login PASSED! Token received.');
        } else {
            console.error('   API Login FAILED:', await loginRes.text());
            process.exit(1);
        }

        console.log('5. Cleanup...');
        await pool.query('DELETE FROM doctors WHERE email = $1', [email]);
        console.log('   Cleanup done.');
        process.exit(0);

    } catch (err) {
        console.error('TEST FAILED:', err);
        process.exit(1);
    }
};

run();
