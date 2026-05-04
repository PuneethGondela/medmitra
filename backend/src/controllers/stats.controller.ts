import { Request, Response } from 'express';
import { adminDb, COLLECTIONS } from '../config/firebase';

// Admin dashboard stats (full system view)
export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        // Get counts using Firestore aggregation queries (optimized)
        const [doctorsSnapshot, workersSnapshot, donorsSnapshot] = await Promise.all([
            adminDb.collection(COLLECTIONS.DOCTORS)
                .where('account_status', '==', 'ACTIVE')
                .where('deleted_at', '==', null)
                .count()
                .get(),
            adminDb.collection(COLLECTIONS.WORKERS)
                .where('status', '==', 'ACTIVE')
                .count()
                .get(),
            adminDb.collection(COLLECTIONS.BLOOD_DONORS)
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

    } catch (error: any) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

// Doctor-specific stats (their own data)
export const getDoctorStats = async (req: Request, res: Response) => {
    try {
        const doctorId = req.user?.doctorId;

        if (!doctorId) {
            return res.status(400).json({ error: 'Doctor ID not found in token' });
        }

        // Query Firestore records collection for this doctor's visits
        // Note: This assumes records collection has doctor_id field
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        try {
            // Use aggregation queries for better performance
            const [recordsSnapshot, workersSnapshot] = await Promise.all([
                adminDb.collection(COLLECTIONS.RECORDS)
                    .where('doctor_id', '==', doctorId)
                    .count()
                    .get(),
                adminDb.collection(COLLECTIONS.WORKERS)
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
        } catch (queryError) {
            // If records collection doesn't exist or query fails, return placeholder
            res.json({
                doctorId,
                todayVisits: 0,
                totalVisits: 0,
                assignedWorkers: 0,
                message: 'Visit data will be available once records are created'
            });
        }

    } catch (error: any) {
        console.error('Get doctor stats error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};
