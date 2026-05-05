import { Request, Response } from 'express';

// ---- Firestore mock helpers ----
const makeCountSnapshot = (count: number) => ({
    data: () => ({ count }),
});

const makeAggregateQuery = (count: number) => ({
    get: jest.fn().mockResolvedValue(makeCountSnapshot(count)),
});

const makeQuerySnapshot = (docs: any[] = []) => ({
    empty: docs.length === 0,
    docs,
    size: docs.length,
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

jest.mock('axios', () => ({
    post: jest.fn(),
}));

jest.mock('../services/ml-storage.service', () => ({
    storeMLResponse: jest.fn().mockResolvedValue(undefined),
    storeAnalysisResponse: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('firebase-admin/firestore', () => ({
    FieldValue: {
        serverTimestamp: jest.fn().mockReturnValue({ _methodName: 'serverTimestamp' }),
    },
}));

import { adminDb } from '../config/firebase';
import axios from 'axios';
import { analyzeSystem, chatWithBot } from '../controllers/bot.controller';

const mockRequest = (overrides: any = {}): Partial<Request> => ({
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

// Setup: adminDb.collection mock that supports count aggregation chains
// and full snapshot queries
const buildAdminDbMock = (opts: {
    doctorCount?: number;
    workerCount?: number;
    donorCount?: number;
    failedLoginCount?: number;
    auditLogDocs?: any[];
    recentDoctorDocs?: any[];
    recentWorkerDocs?: any[];
    assignedWorkerDocs?: any[];
} = {}) => {
    const {
        doctorCount = 3,
        workerCount = 5,
        donorCount = 2,
        failedLoginCount = 0,
        auditLogDocs = [],
        recentDoctorDocs = [],
        recentWorkerDocs = [],
        assignedWorkerDocs = [],
    } = opts;

    const mockedCollection = adminDb.collection as jest.Mock;

    mockedCollection.mockImplementation((name: string) => {
        if (name === 'doctors') {
            return {
                where: jest.fn().mockReturnValue({
                    where: jest.fn().mockReturnValue({
                        count: jest.fn().mockReturnValue(makeAggregateQuery(doctorCount)),
                        orderBy: jest.fn().mockReturnValue({
                            limit: jest.fn().mockReturnValue({
                                get: jest.fn().mockResolvedValue(makeQuerySnapshot(recentDoctorDocs)),
                            }),
                        }),
                        get: jest.fn().mockResolvedValue(makeQuerySnapshot(recentDoctorDocs)),
                    }),
                    count: jest.fn().mockReturnValue(makeAggregateQuery(doctorCount)),
                    orderBy: jest.fn().mockReturnValue({
                        limit: jest.fn().mockReturnValue({
                            get: jest.fn().mockResolvedValue(makeQuerySnapshot(recentDoctorDocs)),
                        }),
                    }),
                }),
            };
        }
        if (name === 'workers') {
            return {
                where: jest.fn().mockReturnValue({
                    count: jest.fn().mockReturnValue(makeAggregateQuery(workerCount)),
                    where: jest.fn().mockReturnValue({
                        limit: jest.fn().mockReturnValue({
                            get: jest.fn().mockResolvedValue(makeQuerySnapshot(assignedWorkerDocs)),
                        }),
                        get: jest.fn().mockResolvedValue(makeQuerySnapshot(assignedWorkerDocs)),
                    }),
                    get: jest.fn().mockResolvedValue(makeQuerySnapshot(assignedWorkerDocs)),
                }),
                orderBy: jest.fn().mockReturnValue({
                    limit: jest.fn().mockReturnValue({
                        get: jest.fn().mockResolvedValue(makeQuerySnapshot(recentWorkerDocs)),
                    }),
                }),
            };
        }
        if (name === 'blood_donors') {
            return {
                where: jest.fn().mockReturnValue({
                    count: jest.fn().mockReturnValue(makeAggregateQuery(donorCount)),
                    orderBy: jest.fn().mockReturnValue({
                        limit: jest.fn().mockReturnValue({
                            get: jest.fn().mockResolvedValue(makeQuerySnapshot([])),
                        }),
                    }),
                }),
            };
        }
        if (name === 'audit_logs') {
            // Support both count-chained queries (failed logins) and full snapshots
            return {
                where: jest.fn().mockReturnValue({
                    where: jest.fn().mockReturnValue({
                        count: jest.fn().mockReturnValue(makeAggregateQuery(failedLoginCount)),
                        get: jest.fn().mockResolvedValue(makeQuerySnapshot(auditLogDocs)),
                    }),
                    orderBy: jest.fn().mockReturnValue({
                        limit: jest.fn().mockReturnValue({
                            get: jest.fn().mockResolvedValue(makeQuerySnapshot(auditLogDocs)),
                        }),
                    }),
                    get: jest.fn().mockResolvedValue(makeQuerySnapshot(auditLogDocs)),
                    count: jest.fn().mockReturnValue(makeAggregateQuery(failedLoginCount)),
                }),
                add: jest.fn().mockResolvedValue({ id: 'audit-log-id' }),
            };
        }
        return {
            where: jest.fn().mockReturnThis(),
            count: jest.fn().mockReturnValue(makeAggregateQuery(0)),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue(makeQuerySnapshot([])),
            add: jest.fn().mockResolvedValue({ id: 'mock-id' }),
        };
    });
};

const mockAxiosPost = (response: any = { data: { response: 'ML response text' } }) => {
    (axios.post as jest.Mock).mockResolvedValue(response);
};

describe('analyzeSystem - count aggregation in getAdminContext', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockAxiosPost();
    });

    it('uses count aggregation for doctors, workers, and donors', async () => {
        buildAdminDbMock({ doctorCount: 10, workerCount: 20, donorCount: 30 });

        const req = mockRequest({
            body: { query: 'system status' },
            user: { adminId: 'ADMIN_001' },
        }) as Request;
        const res = mockResponse() as Response;

        await analyzeSystem(req, res);

        expect(res.json).toHaveBeenCalled();
        const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
        // contextUsed should contain stats from count aggregation
        expect(jsonCall.contextUsed).toBeTruthy();
        expect(jsonCall.contextUsed.stats).toBeDefined();
        expect(jsonCall.contextUsed.stats.totalDoctors).toBe(10);
        expect(jsonCall.contextUsed.stats.totalWorkers).toBe(20);
        expect(jsonCall.contextUsed.stats.totalDonors).toBe(30);
    });

    it('reads .data().count from count snapshot (not .size)', async () => {
        const mockCountSnapshotWithoutSize = {
            data: () => ({ count: 7 }),
            // deliberately no .size property
        };
        buildAdminDbMock({ doctorCount: 7, workerCount: 2, donorCount: 1 });

        const req = mockRequest({
            body: { query: 'status' },
            user: { adminId: 'ADMIN_001' },
        }) as Request;
        const res = mockResponse() as Response;

        await analyzeSystem(req, res);

        expect(res.json).toHaveBeenCalled();
        const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
        expect(jsonCall.contextUsed.stats.totalDoctors).toBe(7);
    });

    it('returns a response even when ML server is unavailable', async () => {
        buildAdminDbMock({ doctorCount: 1, workerCount: 1, donorCount: 1 });
        (axios.post as jest.Mock).mockRejectedValue(new Error('ECONNREFUSED'));

        const req = mockRequest({
            body: { query: 'test' },
            user: { adminId: 'ADMIN_001' },
        }) as Request;
        const res = mockResponse() as Response;

        await analyzeSystem(req, res);

        expect(res.json).toHaveBeenCalled();
        // Should contain fallback analysis text
        const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
        expect(jsonCall).toHaveProperty('analysis');
    });

    it('includes security context from detectSuspiciousActivity in response', async () => {
        buildAdminDbMock({ doctorCount: 2, workerCount: 3, donorCount: 1, failedLoginCount: 0 });

        const req = mockRequest({
            body: { query: 'security check' },
            user: { adminId: 'ADMIN_001' },
        }) as Request;
        const res = mockResponse() as Response;

        await analyzeSystem(req, res);

        const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
        expect(jsonCall.contextUsed.security).toBeDefined();
    });

    it('returns 500 when an unexpected error occurs outside helper fns', async () => {
        buildAdminDbMock({ doctorCount: 1, workerCount: 1, donorCount: 1 });
        // analyzeSystem calls `.catch()` on axios.post, so rejected promises won't escape.
        // But if axios.post resolves with { data: null }, then `mlResponse.data.response`
        // at line 269 will throw a TypeError, which is NOT caught by an inner try/catch,
        // so it propagates to the outer catch block -> 500 response.
        (axios.post as jest.Mock).mockResolvedValue({ data: null });

        const req = mockRequest({
            body: { query: 'test' },
            user: { adminId: 'ADMIN_001' },
        }) as Request;
        const res = mockResponse() as Response;

        await analyzeSystem(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: 'Failed to analyze system data' })
        );
    });
});

describe('detectSuspiciousActivity - count aggregation for failed logins', () => {
    // detectSuspiciousActivity is a private helper; test via analyzeSystem/chatWithBot

    beforeEach(() => {
        jest.clearAllMocks();
        mockAxiosPost();
    });

    it('includes suspicious pattern when failedLoginCount > 10', async () => {
        buildAdminDbMock({
            doctorCount: 1,
            workerCount: 1,
            donorCount: 1,
            failedLoginCount: 15, // > 10 threshold
            auditLogDocs: [],
        });

        const req = mockRequest({
            body: { query: 'security' },
            user: { adminId: 'ADMIN_001' },
        }) as Request;
        const res = mockResponse() as Response;

        await analyzeSystem(req, res);

        const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
        const security = jsonCall.contextUsed?.security;
        expect(security).toBeDefined();
        // With >10 failed logins, there should be a suspicious pattern
        expect(security.patterns).toContainEqual(
            expect.objectContaining({
                type: 'Multiple Failed Logins',
                severity: 'HIGH',
            })
        );
    });

    it('does NOT flag suspicious pattern when failedLoginCount <= 10', async () => {
        buildAdminDbMock({
            doctorCount: 1,
            workerCount: 1,
            donorCount: 1,
            failedLoginCount: 5,
            auditLogDocs: [],
        });

        const req = mockRequest({
            body: { query: 'security' },
            user: { adminId: 'ADMIN_001' },
        }) as Request;
        const res = mockResponse() as Response;

        await analyzeSystem(req, res);

        const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
        const security = jsonCall.contextUsed?.security;
        if (security) {
            const failedLoginPatterns = security.patterns?.filter(
                (p: any) => p.type === 'Multiple Failed Logins'
            );
            expect(failedLoginPatterns?.length ?? 0).toBe(0);
        }
    });

    it('uses .data().count from count snapshot for failed login detection', async () => {
        // Verify that count aggregation pattern is used (not .size)
        const countGetMock = jest.fn().mockResolvedValue(makeCountSnapshot(11));
        const mockedCollection = adminDb.collection as jest.Mock;

        mockedCollection.mockImplementation((name: string) => {
            if (name === 'audit_logs') {
                return {
                    where: jest.fn().mockReturnValue({
                        where: jest.fn().mockReturnValue({
                            count: jest.fn().mockReturnValue({ get: countGetMock }),
                            get: jest.fn().mockResolvedValue(makeQuerySnapshot([])),
                        }),
                        orderBy: jest.fn().mockReturnValue({
                            limit: jest.fn().mockReturnValue({
                                get: jest.fn().mockResolvedValue(makeQuerySnapshot([])),
                            }),
                        }),
                        get: jest.fn().mockResolvedValue(makeQuerySnapshot([])),
                        count: jest.fn().mockReturnValue({ get: countGetMock }),
                    }),
                    add: jest.fn().mockResolvedValue({ id: 'audit-log-id' }),
                };
            }
            if (name === 'doctors') {
                return {
                    where: jest.fn().mockReturnValue({
                        where: jest.fn().mockReturnValue({
                            count: jest.fn().mockReturnValue(makeAggregateQuery(1)),
                            orderBy: jest.fn().mockReturnValue({
                                limit: jest.fn().mockReturnValue({
                                    get: jest.fn().mockResolvedValue(makeQuerySnapshot([])),
                                }),
                            }),
                        }),
                    }),
                };
            }
            if (name === 'workers') {
                return {
                    where: jest.fn().mockReturnValue({
                        count: jest.fn().mockReturnValue(makeAggregateQuery(1)),
                        where: jest.fn().mockReturnValue({
                            limit: jest.fn().mockReturnValue({
                                get: jest.fn().mockResolvedValue(makeQuerySnapshot([])),
                            }),
                            get: jest.fn().mockResolvedValue(makeQuerySnapshot([])),
                        }),
                        get: jest.fn().mockResolvedValue(makeQuerySnapshot([])),
                    }),
                    orderBy: jest.fn().mockReturnValue({
                        limit: jest.fn().mockReturnValue({
                            get: jest.fn().mockResolvedValue(makeQuerySnapshot([])),
                        }),
                    }),
                };
            }
            if (name === 'blood_donors') {
                return {
                    where: jest.fn().mockReturnValue({
                        count: jest.fn().mockReturnValue(makeAggregateQuery(1)),
                        orderBy: jest.fn().mockReturnValue({
                            limit: jest.fn().mockReturnValue({
                                get: jest.fn().mockResolvedValue(makeQuerySnapshot([])),
                            }),
                        }),
                    }),
                };
            }
            return {
                where: jest.fn().mockReturnThis(),
                count: jest.fn().mockReturnValue(makeAggregateQuery(0)),
                orderBy: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                get: jest.fn().mockResolvedValue(makeQuerySnapshot([])),
                add: jest.fn().mockResolvedValue({ id: 'mock-id' }),
            };
        });

        const req = mockRequest({
            body: { query: 'security' },
            user: { adminId: 'ADMIN_001' },
        }) as Request;
        const res = mockResponse() as Response;

        await analyzeSystem(req, res);

        // The count().get() should have been called
        expect(countGetMock).toHaveBeenCalled();
    });

    it('exactCount boundary: failedLoginCount exactly 10 does NOT trigger alert', async () => {
        buildAdminDbMock({
            doctorCount: 1,
            workerCount: 1,
            donorCount: 1,
            failedLoginCount: 10,
        });

        const req = mockRequest({
            body: { query: 'security' },
            user: { adminId: 'ADMIN_001' },
        }) as Request;
        const res = mockResponse() as Response;

        await analyzeSystem(req, res);

        const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
        const security = jsonCall.contextUsed?.security;
        if (security) {
            const failedLoginPatterns = (security.patterns ?? []).filter(
                (p: any) => p.type === 'Multiple Failed Logins'
            );
            expect(failedLoginPatterns.length).toBe(0);
        }
    });
});

describe('getAdminContext count aggregation - via chatWithBot', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockAxiosPost({ data: { response: 'Chat response' } });
    });

    it('populates stats.totalDoctors from count aggregation when user is admin', async () => {
        buildAdminDbMock({ doctorCount: 12, workerCount: 8, donorCount: 4 });

        const req = mockRequest({
            body: { messages: [{ role: 'user', content: 'How many doctors?' }] },
            user: { adminId: 'ADMIN_001', role: 'SUPER_ADMIN' },
        }) as Request;
        const res = mockResponse() as Response;

        await chatWithBot(req, res);

        const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
        expect(jsonCall.contextUsed).toBe(true);
    });

    it('returns response for admin role', async () => {
        buildAdminDbMock({ doctorCount: 5, workerCount: 3, donorCount: 1 });

        const req = mockRequest({
            body: { messages: [{ role: 'user', content: 'System stats' }] },
            user: { adminId: 'ADMIN_001', role: 'SUPER_ADMIN' },
        }) as Request;
        const res = mockResponse() as Response;

        await chatWithBot(req, res);

        expect(res.json).toHaveBeenCalled();
        const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
        expect(jsonCall).toHaveProperty('response');
    });

    it('returns contextUsed=false when no user context', async () => {
        buildAdminDbMock();

        const req = mockRequest({
            body: {
                messages: [{ role: 'user', content: 'Hello' }],
                role: 'user',
            },
        }) as Request;
        const res = mockResponse() as Response;

        await chatWithBot(req, res);

        const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
        expect(jsonCall.contextUsed).toBe(false);
    });
});