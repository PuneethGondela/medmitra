import { Request, Response } from 'express';
import { adminDb, COLLECTIONS } from '../config/firebase';

export const getAuditLogs = async (req: Request, res: Response) => {
    try {
        const snapshot = await adminDb.collection('audit_logs') // Using direct name in case COLLECTIONS missing
            .orderBy('timestamp', 'desc')
            .limit(50)
            .get();

        const logs = await Promise.all(snapshot.docs.map(async doc => {
            const data = doc.data();
            let actorName = 'Unknown';

            // Try to resolve actor name
            try {
                if (data.user_type === 'ADMIN' && data.user_id) {
                    // Start simplified - fetching names could be expensive in loop
                    // For now, return basic info needed for frontend
                }
            } catch (e) {
                // ignore
            }

            return {
                id: doc.id,
                ...data,
                created_at: data.timestamp?.toDate() || new Date().toISOString()
            };
        }));

        res.json(logs);
    } catch (error: any) {
        console.error('Get audit logs error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
