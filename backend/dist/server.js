"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const doctor_routes_1 = __importDefault(require("./routes/doctor.routes"));
const bot_routes_1 = __importDefault(require("./routes/bot.routes"));
const worker_routes_1 = __importDefault(require("./routes/worker.routes"));
const donor_routes_1 = __importDefault(require("./routes/donor.routes"));
const stats_routes_1 = __importDefault(require("./routes/stats.routes"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
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
// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'Med Mitra Backend' });
});
// Start
app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
