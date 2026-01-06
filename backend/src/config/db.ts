import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars from root .env.local if present, or backend .env
// In production, these should be set in the environment
dotenv.config(); // Load from .env in current directory provided by CWD or default behavior

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for Supabase
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
export default pool;
