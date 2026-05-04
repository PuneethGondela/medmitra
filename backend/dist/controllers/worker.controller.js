"use strict";
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
exports.searchWorkers = exports.getWorkerById = exports.getAllWorkers = void 0;
const db_1 = __importDefault(require("../config/db"));
// Get all workers (Read-Only)
const getAllWorkers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield db_1.default.query(`
      SELECT * FROM workers
      ORDER BY joined_at DESC
    `);
        res.json(result.rows);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getAllWorkers = getAllWorkers;
// Get single worker
const getWorkerById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const result = yield db_1.default.query('SELECT * FROM workers WHERE worker_id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Worker not found' });
        }
        // Fetch stats for this worker later (e.g. number of patients registered)
        // const stats = await pool.query('...');
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getWorkerById = getWorkerById;
// Search workers
const searchWorkers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { q } = req.query;
        if (!q)
            return (0, exports.getAllWorkers)(req, res);
        const result = yield db_1.default.query(`
            SELECT * FROM workers
            WHERE full_name ILIKE $1 OR mobile_number ILIKE $1 OR assigned_village ILIKE $1
        `, [`%${q}%`]);
        res.json(result.rows);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.searchWorkers = searchWorkers;
