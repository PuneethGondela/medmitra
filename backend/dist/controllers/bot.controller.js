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
exports.chatWithBot = exports.speakText = exports.analyzeSystem = void 0;
const db_1 = __importDefault(require("../config/db"));
const axios_1 = __importDefault(require("axios"));
const ML_SERVER_URL = process.env.ML_SERVER_URL || 'http://localhost:8000';
const analyzeSystem = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { query } = req.body;
        // 1. Fetch relevant system data (context)
        // Gather Last 20 Audit Logs
        const logRes = yield db_1.default.query('SELECT action, user_type, timestamp FROM audit_logs ORDER BY timestamp DESC LIMIT 20');
        // Gather Stats
        const docCount = yield db_1.default.query('SELECT COUNT(*) FROM doctors');
        const doctorStats = { total: docCount.rows[0].count };
        const contextData = {
            recent_logs: logRes.rows,
            doctor_stats: doctorStats,
            timestamp: new Date().toISOString()
        };
        // 2. Send to ML Server
        const mlResponse = yield axios_1.default.post(`${ML_SERVER_URL}/api/admin/analyze`, {
            query: query || "Summarize the recent activity.",
            context_data: contextData
        });
        // 3. Log this interaction (Audit)
        yield db_1.default.query('INSERT INTO audit_logs (user_id, user_type, action, resource, details) VALUES ($1, $2, $3, $4, $5)',
        // @ts-ignore
        [req.user.adminId, 'ADMIN', 'AI_ANALYSIS', 'bot', { query }]);
        res.json({
            analysis: mlResponse.data.response,
            contextUsed: contextData
        });
    }
    catch (error) {
        console.error('Bot Error:', error.message);
        res.status(500).json({ error: 'Failed to analyze system data' });
    }
});
exports.analyzeSystem = analyzeSystem;
const speakText = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { text } = req.body;
        const response = yield axios_1.default.post(`${ML_SERVER_URL}/api/tts`, { text }, {
            responseType: 'stream'
        });
        res.setHeader('Content-Type', 'audio/mpeg');
        response.data.pipe(res);
    }
    catch (error) {
        console.error('TTS Error:', error.message);
        res.status(500).json({ error: 'Failed to generate speech' });
    }
});
exports.speakText = speakText;
const chatWithBot = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { messages, max_tokens, temperature } = req.body;
        // Forward to ML Server
        const response = yield axios_1.default.post(`${ML_SERVER_URL}/api/chat`, {
            messages,
            max_tokens,
            temperature
        });
        res.json(response.data);
    }
    catch (error) {
        console.error('Chat Bot Error:', error.message);
        // Fallback if ML server is down
        if (error.code === 'ECONNREFUSED') {
            return res.json({ response: "I am currently offline (ML Server disconnected). Please try again later." });
        }
        res.status(500).json({ error: 'Failed to chat with bot' });
    }
});
exports.chatWithBot = chatWithBot;
