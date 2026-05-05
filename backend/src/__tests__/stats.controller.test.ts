import { Request, Response } from 'express';

// ---- Helpers for building the Firestore mock chain ----
const makeCountSnapshot = (count: number) => ({
    data: () => ({ count }),
});

const makeAggregateQuery = (count: number) => ({
    get: jest.fn().mockResolvedValue(makeCountSnapshot(count)),
});

const makeQuery = (
    docs: any[] = [],
    countValue = 0
) => ({
    where: jest.fn().mockReturnThis(),
    count: jest.fn().mockReturnValue(makeAggregateQuery(countValue)),
    get: jest.fn().mockResolvedValue({ docs, size: docs.length, empty: docs.length === 0 }),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
});

// Factory: returns a fresh collection mock with configurable count/docs
const makeCollectionMock = (countValue = 0, docs: any[] = []) => ({
    where: jest.fn().mockReturnValue(makeQuery(docs, countValue)),
    count: jest.fn().mockReturnValue(makeAggregateQuery(countValue)),
    add: jest.fn().mockResolvedValue({ id: 'mock-doc-id' }),
    doc: jest.fn().mockReturnValue({ get: jest.fn(), set: jest.fn(), update: jest.fn(), ref: {} }),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({ docs, size: docs.length, empty: docs.length === 0 }),
});

// ---- Module mocks ----
jest.mock('../config/firebase', () => ({
    adminDb: {
        collection: jest.fn(),
    },
    COLLECTIONS: {
        DOCTORS: 'doctors',
        WORKERS: 'workers',
        BLOOD_DONORS: 'blood_donors',
        AUDIT_LOGS: 'audit_logs',
        RECORDS: 'records',
    },
}));

import { adminDb } from '../config/firebase';
import { getDashboardStats, getDoctorStats } from '../controllers/stats.controller';

// ---- Test helpers ----
const mockRequest = (overrides: Partial<Request> = {}): Partial<Request> => ({
    body: {},
    params: {},
    ...overrides,
});

const mockResponse = (): Partial<Response> => {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe('getDashboardStats', () => {
    const mockedCollection = adminDb.collection as jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('uses count aggregation (not .size) for doctors, workers, and donors', async () => {
        const doctorQuery = makeQuery([], 5);
        const workerQuery = makeQuery([], 3);
        const donorQuery = makeQuery([], 7);

        mockedCollection.mockImplementation((name: string) => {
            if (name === 'doctors') return { where: jest.fn().mockReturnValue({ where: jest.fn().mockReturnValue({ count: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue(makeCountSnapshot(5)) }) }) }) };
            if (name === 'workers') return { where: jest.fn().mockReturnValue({ count: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue(makeCountSnapshot(3)) }) }) };
            if (name === 'blood_donors') return { where: jest.fn().mockReturnValue({ count: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue(makeCountSnapshot(7)) }) }) };
            return makeCollectionMock();
        });

        const req = mockRequest() as Request;
        const res = mockResponse() as Response;

        await getDashboardStats(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                counts: expect.objectContaining({
                    doctors: 5,
                    workers: 3,
                    donors: 7,
                }),
            })
        );
    });

    it('returns counts object with doctors, workers, donors, and visits keys', async () => {
        mockedCollection.mockImplementation((name: string) => {
            if (name === 'doctors') return { where: jest.fn().mockReturnValue({ where: jest.fn().mockReturnValue({ count: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue(makeCountSnapshot(2)) }) }) }) };
            if (name === 'workers') return { where: jest.fn().mockReturnValue({ count: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue(makeCountSnapshot(4)) }) }) };
            if (name === 'blood_donors') return { where: jest.fn().mockReturnValue({ count: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue(makeCountSnapshot(6)) }) }) };
            return makeCollectionMock();
        });

        const req = mockRequest() as Request;
        const res = mockResponse() as Response;

        await getDashboardStats(req, res);

        const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
        expect(jsonCall.counts).toHaveProperty('doctors');
        expect(jsonCall.counts).toHaveProperty('workers');
        expect(jsonCall.counts).toHaveProperty('donors');
        expect(jsonCall.counts).toHaveProperty('visits');
        expect(jsonCall).toHaveProperty('chartData');
    });

    it('reflects count aggregation values in chartData last entry', async () => {
        mockedCollection.mockImplementation((name: string) => {
            if (name === 'doctors') return { where: jest.fn().mockReturnValue({ where: jest.fn().mockReturnValue({ count: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue(makeCountSnapshot(10)) }) }) }) };
            if (name === 'workers') return { where: jest.fn().mockReturnValue({ count: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue(makeCountSnapshot(20)) }) }) };
            if (name === 'blood_donors') return { where: jest.fn().mockReturnValue({ count: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue(makeCountSnapshot(0)) }) }) };
            return makeCollectionMock();
        });

        const req = mockRequest() as Request;
        const res = mockResponse() as Response;

        await getDashboardStats(req, res);

        const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
        const lastChartEntry = jsonCall.chartData[jsonCall.chartData.length - 1];
        expect(lastChartEntry.doctors).toBe(10);
        expect(lastChartEntry.workers).toBe(20);
    });

    it('handles zero counts returned by aggregation', async () => {
        mockedCollection.mockImplementation((name: string) => {
            if (name === 'doctors') return { where: jest.fn().mockReturnValue({ where: jest.fn().mockReturnValue({ count: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue(makeCountSnapshot(0)) }) }) }) };
            if (name === 'workers') return { where: jest.fn().mockReturnValue({ count: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue(makeCountSnapshot(0)) }) }) };
            if (name === 'blood_donors') return { where: jest.fn().mockReturnValue({ count: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue(makeCountSnapshot(0)) }) }) };
            return makeCollectionMock();
        });

        const req = mockRequest() as Request;
        const res = mockResponse() as Response;

        await getDashboardStats(req, res);

        const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
        expect(jsonCall.counts.doctors).toBe(0);
        expect(jsonCall.counts.workers).toBe(0);
        expect(jsonCall.counts.donors).toBe(0);
    });

    it('returns 500 when Firestore aggregation fails', async () => {
        mockedCollection.mockImplementation(() => ({
            where: jest.fn().mockReturnValue({
                where: jest.fn().mockReturnValue({
                    count: jest.fn().mockReturnValue({
                        get: jest.fn().mockRejectedValue(new Error('Firestore unavailable')),
                    }),
                }),
                count: jest.fn().mockReturnValue({
                    get: jest.fn().mockRejectedValue(new Error('Firestore unavailable')),
                }),
            }),
        }));

        const req = mockRequest() as Request;
        const res = mockResponse() as Response;

        await getDashboardStats(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: 'Internal server error' })
        );
    });
});

describe('getDoctorStats', () => {
    const mockedCollection = adminDb.collection as jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns 400 when doctorId is missing from token', async () => {
        const req = mockRequest({ user: {} } as any) as Request;
        const res = mockResponse() as Response;

        await getDoctorStats(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: 'Doctor ID not found in token' })
        );
    });

    it('uses count aggregation for records and workers in Promise.all', async () => {
        const doctorId = 'DOC_2025_001';
        mockedCollection.mockImplementation((name: string) => {
            if (name === 'records') return {
                where: jest.fn().mockReturnValue({
                    count: jest.fn().mockReturnValue({
                        get: jest.fn().mockResolvedValue(makeCountSnapshot(15)),
                    }),
                }),
            };
            if (name === 'workers') return {
                where: jest.fn().mockReturnValue({
                    count: jest.fn().mockReturnValue({
                        get: jest.fn().mockResolvedValue(makeCountSnapshot(4)),
                    }),
                }),
            };
            return makeCollectionMock();
        });

        const req = mockRequest({ user: { doctorId } } as any) as Request;
        const res = mockResponse() as Response;

        await getDoctorStats(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                doctorId,
                totalVisits: 15,
                assignedWorkers: 4,
                todayVisits: 0,
            })
        );
    });

    it('reads count from .data().count (not .size) for records', async () => {
        const doctorId = 'DOC_2025_002';
        const recordsCountSnapshot = makeCountSnapshot(42);
        const recordsGetMock = jest.fn().mockResolvedValue(recordsCountSnapshot);

        mockedCollection.mockImplementation((name: string) => {
            if (name === 'records') return {
                where: jest.fn().mockReturnValue({
                    count: jest.fn().mockReturnValue({ get: recordsGetMock }),
                }),
            };
            if (name === 'workers') return {
                where: jest.fn().mockReturnValue({
                    count: jest.fn().mockReturnValue({
                        get: jest.fn().mockResolvedValue(makeCountSnapshot(0)),
                    }),
                }),
            };
            return makeCollectionMock();
        });

        const req = mockRequest({ user: { doctorId } } as any) as Request;
        const res = mockResponse() as Response;

        await getDoctorStats(req, res);

        expect(recordsGetMock).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ totalVisits: 42 })
        );
    });

    it('reads count from .data().count (not .size) for workers', async () => {
        const doctorId = 'DOC_2025_003';
        const workersCountSnapshot = makeCountSnapshot(8);
        const workersGetMock = jest.fn().mockResolvedValue(workersCountSnapshot);

        mockedCollection.mockImplementation((name: string) => {
            if (name === 'records') return {
                where: jest.fn().mockReturnValue({
                    count: jest.fn().mockReturnValue({
                        get: jest.fn().mockResolvedValue(makeCountSnapshot(0)),
                    }),
                }),
            };
            if (name === 'workers') return {
                where: jest.fn().mockReturnValue({
                    count: jest.fn().mockReturnValue({ get: workersGetMock }),
                }),
            };
            return makeCollectionMock();
        });

        const req = mockRequest({ user: { doctorId } } as any) as Request;
        const res = mockResponse() as Response;

        await getDoctorStats(req, res);

        expect(workersGetMock).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ assignedWorkers: 8 })
        );
    });

    it('falls back to placeholder when query fails', async () => {
        const doctorId = 'DOC_2025_004';
        mockedCollection.mockImplementation((name: string) => {
            if (name === 'records') return {
                where: jest.fn().mockReturnValue({
                    count: jest.fn().mockReturnValue({
                        get: jest.fn().mockRejectedValue(new Error('Collection not found')),
                    }),
                }),
            };
            if (name === 'workers') return {
                where: jest.fn().mockReturnValue({
                    count: jest.fn().mockReturnValue({
                        get: jest.fn().mockRejectedValue(new Error('Collection not found')),
                    }),
                }),
            };
            return makeCollectionMock();
        });

        const req = mockRequest({ user: { doctorId } } as any) as Request;
        const res = mockResponse() as Response;

        await getDoctorStats(req, res);

        // Should not call res.status(500); returns placeholder with 0 counts
        expect(res.status).not.toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                doctorId,
                todayVisits: 0,
                totalVisits: 0,
                assignedWorkers: 0,
            })
        );
    });

    it('includes doctorId in response', async () => {
        const doctorId = 'DOC_2026_007';
        mockedCollection.mockImplementation((name: string) => {
            return {
                where: jest.fn().mockReturnValue({
                    count: jest.fn().mockReturnValue({
                        get: jest.fn().mockResolvedValue(makeCountSnapshot(1)),
                    }),
                }),
            };
        });

        const req = mockRequest({ user: { doctorId } } as any) as Request;
        const res = mockResponse() as Response;

        await getDoctorStats(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ doctorId })
        );
    });

    it('returns 500 for unexpected outer errors', async () => {
        // Force an error in the outer try block (not the inner query try)
        // by making the user check throw via a getter
        const req = {} as any;
        Object.defineProperty(req, 'user', {
            get: () => { throw new Error('Unexpected token error'); }
        });
        const res = mockResponse() as Response;

        await getDoctorStats(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: 'Internal server error' })
        );
    });
});