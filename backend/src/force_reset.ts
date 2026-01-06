import pool from './config/db';
import bcrypt from 'bcrypt';

const reset = async () => {
    try {
        const password = 'Doctor@123';
        const hash = await bcrypt.hash(password, 10);

        // Update if exists, or insert if not (covering all bases)
        const res = await pool.query(`
            INSERT INTO doctors (doctor_id, full_name, email, mobile_number, medical_license, specialization, hospital_name, hospital_id, login_username, password_hash, account_status)
            VALUES ('DOC_FORCE_RECOVERY', 'Recovery Doc', 'doctor@gmail.com', '9999999999', 'LIC-REC', 'General', 'General Hosp', 'HOSP-GEN', 'recovery.doc', $1, 'ACTIVE')
            ON CONFLICT (email) 
            DO UPDATE SET password_hash = $1, account_status = 'ACTIVE';
        `, [hash]);

        console.log('Password for doctor@gmail.com reset to Doctor@123');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

reset();
