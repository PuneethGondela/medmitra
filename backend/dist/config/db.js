"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.query = void 0;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
// Load env vars from root .env.local if present, or backend .env
// In production, these should be set in the environment
dotenv_1.default.config(); // Load from .env in current directory provided by CWD or default behavior
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});
const query = (text, params) => pool.query(text, params);
exports.query = query;
exports.default = pool;
