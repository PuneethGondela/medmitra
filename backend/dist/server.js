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
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const doctor_routes_1 = __importDefault(require("./routes/doctor.routes"));
const bot_routes_1 = __importDefault(require("./routes/bot.routes"));
const worker_routes_1 = __importDefault(require("./routes/worker.routes"));
const donor_routes_1 = __importDefault(require("./routes/donor.routes"));
const stats_routes_1 = __importDefault(require("./routes/stats.routes"));
const audit_routes_1 = __importDefault(require("./routes/audit.routes"));
const error_middleware_1 = require("./middleware/error.middleware");
// Config
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
// Security: Rate Limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: true,
    legacyHeaders: false,
});
// Middleware
app.use(limiter);
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Routes
app.use('/api/admin', auth_routes_1.default);
app.use('/api/doctors', doctor_routes_1.default);
app.use('/api/bot', bot_routes_1.default);
app.use('/api/workers', worker_routes_1.default);
app.use('/api/donors', donor_routes_1.default);
app.use('/api/stats', stats_routes_1.default);
app.use('/api/audit', audit_routes_1.default);
// Health Check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'Med Mitra Backend',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});
// TEMPORARY DEBUG ROUTE
const firebase_1 = require("./config/firebase");
const bcrypt_1 = __importDefault(require("bcrypt"));
app.get('/api/debug/fix-doctor', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const email = req.query.email;
    if (!email)
        return res.send("No email provided");
    try {
        const hash = yield bcrypt_1.default.hash("password123", 10);
        const docSnapshot = yield firebase_1.adminDb.collection(firebase_1.COLLECTIONS.DOCTORS).where('email', '==', email).get();
        if (!docSnapshot.empty) {
            yield docSnapshot.docs[0].ref.update({ password_hash: hash });
            return res.json({ status: "success", msg: "Doctor password reset to password123", id: docSnapshot.docs[0].id });
        }
        const adminSnapshot = yield firebase_1.adminDb.collection('admins').where('email', '==', email).get();
        if (!adminSnapshot.empty) {
            yield adminSnapshot.docs[0].ref.update({ password_hash: hash });
            return res.json({ status: "success", msg: "Admin password reset to password123", id: adminSnapshot.docs[0].id });
        }
        return res.json({ status: "error", msg: "User not found in Doctors or Admins" });
    }
    catch (e) {
        return res.json({ status: "error", msg: e.message });
    }
}));
// END DEBUG ROUTE
// Error handling middleware (must be last)
app.use(error_middleware_1.notFoundHandler);
app.use(error_middleware_1.errorHandler);
// Start
app.listen(PORT, () => {
    console.log(`✅ Backend server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
});
