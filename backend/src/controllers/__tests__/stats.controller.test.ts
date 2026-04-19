import { Request, Response } from 'express';

// Mock firebase config before importing the controller
jest.mock('../../config/firebase', () => ({
    adminDb: {
        collection: jest.fn(),
    },
    COLLECTIONS: {
        DOCTORS: 'doctors',
        WORKERS: 'workers',
        BLOOD_DONORS: 'blood_donors',
        RECORDS: 'records',
        AUDIT_LOGS: 'audit_logs',
    },
}));

import { getDashboardStats, getDoctorStats } from '../stats.controller';
import { adminDb } from '../../config/firebase';

// Helper to build a mock Firestore query chain returning a snapshot with given size
const makeQueryChain = (snapshot: { size: number; docs?: any[] }) => {
    const chain: any = {
        where: jest.fn(),
        get: jest.fn().mockResolvedValue(snapshot),
        orderBy: jest.fn(),
        limit: jest.fn(),
    };
    chain.where.mockReturnValue(chain);
    chain.orderBy.mockReturnValue(chain);
    chain.limit.mockReturnValue(chain);
    return chain;
};

const mockRes = () => {
    const res: Partial<Response> = {
        json: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
    };
    (res.status as jest.Mock).mockReturnValue(res);
    return res as Response;
};

describe('getDashboardStats', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns counts from snapshot.size for doctors, workers, and donors', async () => {
        const doctorChain = makeQueryChain({ size: 5 });
        const workerChain = makeQueryChain({ size: 3 });
        const donorChain = makeQueryChain({ size: 8 });

        (adminDb.collection as jest.Mock)
            .mockImplementationOnce(() => doctorChain)  // DOCTORS
            .mockImplementationOnce(() => workerChain)  // WORKERS
            .mockImplementationOnce(() => donorChain);  // BLOOD_DONORS

        const req = {} as Request;
        const res = mockRes();

        await getDashboardStats(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                counts: expect.objectContaining({
                    doctors: 5,
                    workers: 3,
                    donors: 8,
                }),
            })
        );
    });

    it('applies correct Firestore filters for active, non-deleted doctors', async () => {
        const doctorChain = makeQueryChain({ size: 2 });
        const workerChain = makeQueryChain({ size: 1 });
        const donorChain = makeQueryChain({ size: 4 });

        (adminDb.collection as jest.Mock)
            .mockImplementationOnce(() => doctorChain)
            .mockImplementationOnce(() => workerChain)
            .mockImplementationOnce(() => donorChain);

        await getDashboardStats({} as Request, mockRes());

        expect(doctorChain.where).toHaveBeenCalledWith('account_status', '==', 'ACTIVE');
        expect(doctorChain.where).toHaveBeenCalledWith('deleted_at', '==', null);
        expect(workerChain.where).toHaveBeenCalledWith('status', '==', 'ACTIVE');
        expect(donorChain.where).toHaveBeenCalledWith('status', '==', 'AVAILABLE');
    });

    it('includes chartData with final entry using actual doctor and worker counts', async () => {
        const doctorChain = makeQueryChain({ size: 10 });
        const workerChain = makeQueryChain({ size: 7 });
        const donorChain = makeQueryChain({ size: 2 });

        (adminDb.collection as jest.Mock)
            .mockImplementationOnce(() => doctorChain)
            .mockImplementationOnce(() => workerChain)
            .mockImplementationOnce(() => donorChain);

        const res = mockRes();
        await getDashboardStats({} as Request, res);

        const response = (res.json as jest.Mock).mock.calls[0][0];
        const lastChartEntry = response.chartData[response.chartData.length - 1];
        expect(lastChartEntry.doctors).toBe(10);
        expect(lastChartEntry.workers).toBe(7);
    });

    it('returns 500 when Firestore query fails', async () => {
        const errorChain = makeQueryChain({ size: 0 });
        errorChain.get = jest.fn().mockRejectedValue(new Error('Firestore unavailable'));

        (adminDb.collection as jest.Mock).mockReturnValue(errorChain);

        const res = mockRes();
        await getDashboardStats({} as Request, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: 'Internal server error' })
        );
    });

    it('returns zero counts when all collections are empty', async () => {
        const emptyChain = makeQueryChain({ size: 0 });

        (adminDb.collection as jest.Mock)
            .mockImplementationOnce(() => emptyChain)
            .mockImplementationOnce(() => emptyChain)
            .mockImplementationOnce(() => emptyChain);

        const res = mockRes();
        await getDashboardStats({} as Request, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                counts: expect.objectContaining({
                    doctors: 0,
                    workers: 0,
                    donors: 0,
                }),
            })
        );
    });
});

describe('getDoctorStats', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const makeReq = (doctorId: string | undefined) =>
        ({ user: doctorId ? { doctorId } : {} } as any as Request);

    it('returns 400 when doctorId is missing from token', async () => {
        const req = makeReq(undefined);
        const res = mockRes();

        await getDoctorStats(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Doctor ID not found in token' });
    });

    it('returns visit and worker counts using snapshot.size', async () => {
        const recordsChain = makeQueryChain({ size: 12 });
        const workersChain = makeQueryChain({ size: 3 });

        (adminDb.collection as jest.Mock)
            .mockImplementationOnce(() => recordsChain)  // RECORDS
            .mockImplementationOnce(() => workersChain); // WORKERS

        const req = makeReq('DOC_2024_001');
        const res = mockRes();

        await getDoctorStats(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                doctorId: 'DOC_2024_001',
                totalVisits: 12,
                assignedWorkers: 3,
                todayVisits: 0,
            })
        );
    });

    it('filters records and workers by doctorId', async () => {
        const recordsChain = makeQueryChain({ size: 5 });
        const workersChain = makeQueryChain({ size: 2 });

        (adminDb.collection as jest.Mock)
            .mockImplementationOnce(() => recordsChain)
            .mockImplementationOnce(() => workersChain);

        await getDoctorStats(makeReq('DOC_2024_002'), mockRes());

        expect(recordsChain.where).toHaveBeenCalledWith('doctor_id', '==', 'DOC_2024_002');
        expect(workersChain.where).toHaveBeenCalledWith('assigned_doctor_id', '==', 'DOC_2024_002');
    });

    it('returns placeholder response when Firestore query fails', async () => {
        const failingChain = makeQueryChain({ size: 0 });
        failingChain.get = jest.fn().mockRejectedValue(new Error('Collection not found'));

        (adminDb.collection as jest.Mock).mockReturnValue(failingChain);

        const req = makeReq('DOC_2024_003');
        const res = mockRes();

        await getDoctorStats(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                doctorId: 'DOC_2024_003',
                todayVisits: 0,
                totalVisits: 0,
                assignedWorkers: 0,
            })
        );
    });

    it('returns zero assignedWorkers when no workers assigned', async () => {
        const recordsChain = makeQueryChain({ size: 7 });
        const workersChain = makeQueryChain({ size: 0 });

        (adminDb.collection as jest.Mock)
            .mockImplementationOnce(() => recordsChain)
            .mockImplementationOnce(() => workersChain);

        const res = mockRes();
        await getDoctorStats(makeReq('DOC_2024_004'), res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                totalVisits: 7,
                assignedWorkers: 0,
            })
        );
    });

    it('returns 500 on unexpected outer error', async () => {
        // Simulate an error thrown before the inner try block (e.g., doctorId access throws)
        const req = {
            get user() {
                throw new Error('Unexpected error');
            },
        } as any as Request;
        const res = mockRes();

        await getDoctorStats(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: 'Internal server error' })
        );
    });
});