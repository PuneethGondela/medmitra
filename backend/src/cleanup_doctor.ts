import pool from './config/db';

const clean = async () => {
    try {
        await pool.query("DELETE FROM doctors WHERE email = 'doctor@gmail.com'");
        console.log('Cleaned up doctor@gmail.com');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

clean();
