import { Request, Response } from 'express';
import { adminDb, COLLECTIONS } from '../config/firebase';

// Get all workers (Read-Only)
export const getAllWorkers = async (req: Request, res: Response) => {
    try {
        const snapshot = await adminDb.collection(COLLECTIONS.WORKERS)
            // .where('role', '==', 'worker') // Not needed if in workers collection, unless mixed
            .orderBy('created_at', 'desc')
            .get();

        const workers = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json(workers);
    } catch (error: any) {
        console.error('Get all workers error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

// Get single worker
export const getWorkerById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const workerDoc = await adminDb.collection(COLLECTIONS.WORKERS).doc(id).get();

        if (!workerDoc.exists) {
            return res.status(404).json({ error: 'Worker not found' });
        }

        res.json({
            id: workerDoc.id,
            ...workerDoc.data()
        });
    } catch (error: any) {
        console.error('Get worker by ID error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

// Search workers
export const searchWorkers = async (req: Request, res: Response) => {
    try {
        const { q } = req.query;
        if (!q) {
            return getAllWorkers(req, res);
        }

        const queryText = (q as string).toLowerCase();
        const snapshot = await adminDb.collection(COLLECTIONS.WORKERS)
            // .where('role', '==', 'worker')
            .get();

        // Filter in memory (Firestore doesn't support ILIKE, so we filter client-side)
        const workers = snapshot.docs
            .map(doc => {
                const data = doc.data() as any;
                return {
                    id: doc.id,
                    ...data
                };
            })
            .filter((w: any) =>
                (w.full_name && w.full_name.toLowerCase().includes(queryText)) ||
                (w.mobile_number && w.mobile_number.includes(queryText)) ||
                (w.email && w.email.toLowerCase().includes(queryText)) ||
                (w.assigned_village && w.assigned_village.toLowerCase().includes(queryText))
            );

        res.json(workers);
    } catch (error: any) {
        console.error('Search workers error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};
