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
exports.getDashboardStats = void 0;
const db_1 = __importDefault(require("../config/db"));
const getDashboardStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // 1. Basic Counts
        const doctorCount = yield db_1.default.query('SELECT COUNT(*) FROM doctors WHERE account_status = \'ACTIVE\'');
        const workerCount = yield db_1.default.query('SELECT COUNT(*) FROM workers WHERE status = \'ACTIVE\'');
        const donorCount = yield db_1.default.query('SELECT COUNT(*) FROM blood_donors WHERE status = \'AVAILABLE\'');
        // Mock Visits Count (since we don't have visits table yet)
        // In real app: SELECT COUNT(*) FROM visits WHERE date = CURRENT_DATE
        const todayVisits = Math.floor(Math.random() * 50) + 10;
        // 2. Growth Data (Mocked matching the last 6 months for chart)
        const growthData = [
            { name: 'Jul', doctors: 4, workers: 2 },
            { name: 'Aug', doctors: 6, workers: 5 },
            { name: 'Sep', doctors: 8, workers: 10 },
            { name: 'Oct', doctors: 12, workers: 18 },
            { name: 'Nov', doctors: 15, workers: 25 },
            { name: 'Dec', doctors: parseInt(doctorCount.rows[0].count), workers: parseInt(workerCount.rows[0].count) },
        ];
        res.json({
            counts: {
                doctors: parseInt(doctorCount.rows[0].count),
                workers: parseInt(workerCount.rows[0].count),
                donors: parseInt(donorCount.rows[0].count),
                visits: todayVisits
            },
            chartData: growthData
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getDashboardStats = getDashboardStats;
