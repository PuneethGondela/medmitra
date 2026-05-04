import pool from './config/db';
import { text } from 'stream/consumers';

const run = async () => {
    try {
        // Read query from stdin
        const chunks = [];
        for await (const chunk of process.stdin) {
            chunks.push(chunk);
        }
        const query = Buffer.concat(chunks).toString('utf8').trim();

        if (!query) {
            console.error('No query provided');
            process.exit(1);
        }

        console.log('Running Query:', query);
        const res = await pool.query(query);
        console.table(res.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

run();
