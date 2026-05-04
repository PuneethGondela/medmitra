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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDoctorStats = exports.getDashboardStats = void 0;
const firebase_1 = require("../config/firebase");
// Admin dashboard stats (full system view)
const getDashboardStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Get counts using Firestore aggregation queries (optimized)
        const [doctorsSnapshot, workersSnapshot, donorsSnapshot] = yield Promise.all([
            firebase_1.adminDb.collection(firebase_1.COLLECTIONS.DOCTORS)
                .where('account_status', '==', 'ACTIVE')
                .where('deleted_at', '==', null)
                .count()
                .get(),
            firebase_1.adminDb.collection(firebase_1.COLLECTIONS.WORKERS)
                .where('status', '==', 'ACTIVE')
                .count()
                .get(),
            firebase_1.adminDb.collection(firebase_1.COLLECTIONS.BLOOD_DONORS)
                .where('status', '==', 'AVAILABLE')
                .count()
                .get()
        ]);
        const doctorCount = doctorsSnapshot.data().count;
        const workerCount = workersSnapshot.data().count;
        const donorCount = donorsSnapshot.data().count;
        // Mock Visits Count (since visits are in Firestore records collection)
        // In real app: query Firestore records collection for today's visits
        const todayVisits = Math.floor(Math.random() * 50) + 10;
        // 2. Growth Data (Mocked matching the last 6 months for chart)
        const growthData = [
            { name: 'Jul', doctors: 4, workers: 2 },
            { name: 'Aug', doctors: 6, workers: 5 },
            { name: 'Sep', doctors: 8, workers: 10 },
            { name: 'Oct', doctors: 12, workers: 18 },
            { name: 'Nov', doctors: 15, workers: 25 },
            { name: 'Dec', doctors: doctorCount, workers: workerCount },
        ];
        res.json({
            counts: {
                doctors: doctorCount,
                workers: workerCount,
                donors: donorCount,
                visits: todayVisits
            },
            chartData: growthData
        });
    }
    catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});
exports.getDashboardStats = getDashboardStats;
// Doctor-specific stats (their own data)
const getDoctorStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const doctorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.doctorId;
        if (!doctorId) {
            return res.status(400).json({ error: 'Doctor ID not found in token' });
        }
        // Query Firestore records collection for this doctor's visits
        // Note: This assumes records collection has doctor_id field
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        try {
            // Use aggregation queries for better performance
            const [recordsSnapshot, workersSnapshot] = yield Promise.all([
                firebase_1.adminDb.collection(firebase_1.COLLECTIONS.RECORDS)
                    .where('doctor_id', '==', doctorId)
                    .count()
                    .get(),
                firebase_1.adminDb.collection(firebase_1.COLLECTIONS.WORKERS)
                    .where('assigned_doctor_id', '==', doctorId)
                    .count()
                    .get()
            ]);
            const allVisits = recordsSnapshot.data().count;
            const assignedWorkersCount = workersSnapshot.data().count;
            // Count today's visits (you'd filter by date in a real query)
            // For now, return placeholder - you'd need to add proper date filtering
            const todayVisits = 0; // Would need proper date query
            res.json({
                doctorId,
                todayVisits,
                totalVisits: allVisits,
                assignedWorkers: assignedWorkersCount
            });
        }
        catch (queryError) {
            // If records collection doesn't exist or query fails, return placeholder
            res.json({
                doctorId,
                todayVisits: 0,
                totalVisits: 0,
                assignedWorkers: 0,
                message: 'Visit data will be available once records are created'
            });
        }
    }
    catch (error) {
        console.error('Get doctor stats error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});
exports.getDoctorStats = getDoctorStats;
