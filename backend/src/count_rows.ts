import pool from './config/db';

const check = async () => {
    try {
        const doctors = await pool.query('SELECT COUNT(*) FROM doctors');
        const workers = await pool.query('SELECT COUNT(*) FROM workers');

        console.log(`Doctors count: ${doctors.rows[0].count}`);
        console.log(`Workers count: ${workers.rows[0].count}`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

check();
