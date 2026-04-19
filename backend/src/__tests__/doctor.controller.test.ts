import { Request, Response } from 'express';

// ---- Firestore mock helpers ----
const makeCountSnapshot = (count: number) => ({
    data: () => ({ count }),
});

const makeAggregateQuery = (count: number) => ({
    get: jest.fn().mockResolvedValue(makeCountSnapshot(count)),
});

const makeDocSnapshot = (exists: boolean, data: any = {}) => ({
    exists,
    id: data.id || 'mock-doc-id',
    data: () => data,
    ref: {
        update: jest.fn().mockResolvedValue(undefined),
        get: jest.fn(),
    },
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
    adminAuth: {
        createCustomToken: jest.fn().mockResolvedValue('mock-firebase-token'),
        createUser: jest.fn().mockResolvedValue({ uid: 'mock-uid' }),
    },
    COLLECTIONS: {
        DOCTORS: 'doctors',
        WORKERS: 'workers',
        BLOOD_DONORS: 'blood_donors',
        AUDIT_LOGS: 'audit_logs',
        RECORDS: 'records',
    },
}));

jest.mock('bcrypt', () => ({
    compare: jest.fn().mockResolvedValue(true),
    hash: jest.fn().mockResolvedValue('$2b$10$hashedpassword'),
}));

jest.mock('jsonwebtoken', () => ({
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
}));

jest.mock('firebase-admin/firestore', () => ({
    FieldValue: {
        serverTimestamp: jest.fn().mockReturnValue({ _methodName: 'serverTimestamp' }),
    },
}));

import { adminDb, adminAuth } from '../config/firebase';
import { createDoctor } from '../controllers/doctor.controller';

const mockRequest = (overrides: any = {}): Partial<Request> => ({
    body: {},
    params: {},
    ip: '127.0.0.1',
    ...overrides,
});

const mockResponse = (): Partial<Response> => {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

// Helper: create a collection mock that returns empty snapshots for duplicate checks
// and the specified count for the count aggregation
const buildCollectionMockForCreateDoctor = (doctorCount: number) => {
    const mockedCollection = adminDb.collection as jest.Mock;

    mockedCollection.mockImplementation((name: string) => {
        if (name === 'doctors') {
            return {
                // Duplicate check queries (email, license, username) via .where().limit().get()
                where: jest.fn().mockReturnValue({
                    limit: jest.fn().mockReturnValue({
                        get: jest.fn().mockResolvedValue(makeQuerySnapshot([])), // empty = no duplicate
                    }),
                }),
                // Count aggregation for ID generation
                count: jest.fn().mockReturnValue(makeAggregateQuery(doctorCount)),
                // Document set
                doc: jest.fn().mockReturnValue({
                    set: jest.fn().mockResolvedValue(undefined),
                }),
            };
        }
        if (name === 'audit_logs') {
            return {
                add: jest.fn().mockResolvedValue({ id: 'audit-log-id' }),
            };
        }
        return {
            where: jest.fn().mockReturnThis(),
            count: jest.fn().mockReturnValue(makeAggregateQuery(0)),
            get: jest.fn().mockResolvedValue(makeQuerySnapshot([])),
            add: jest.fn().mockResolvedValue({}),
            doc: jest.fn().mockReturnValue({ set: jest.fn(), get: jest.fn() }),
        };
    });
};

const validDoctorBody = {
    fullName: 'Dr. John Smith',
    email: 'john.smith@hospital.com',
    medicalLicense: 'ML12345',
    specialization: 'Cardiology',
    hospitalName: 'City Hospital',
    hospitalId: 'HOSP_001',
    loginUsername: 'dr.john.smith',
    password: 'SecurePass123!',
};

describe('createDoctor - count aggregation for Doctor ID generation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('uses count().get() aggregation instead of fetching all documents', async () => {
        // If count aggregation is used, the doctor ID will use count+1 = 6 from our mock.
        // A full snapshot would have returned .size which is not mocked.
        buildCollectionMockForCreateDoctor(5);
        const year = new Date().getFullYear();

        const req = mockRequest({ body: validDoctorBody, user: { adminId: 'ADMIN_001' } }) as Request;
        const res = mockResponse() as Response;

        await createDoctor(req, res);

        // Successfully created with a doctor_id derived from count (5+1=6 -> "006")
        expect(res.status).toHaveBeenCalledWith(201);
        const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
        expect(jsonCall.doctor.doctor_id).toBe(`DOC_${year}_006`);
    });

    it('generates doctor ID using count + 1', async () => {
        buildCollectionMockForCreateDoctor(9); // count = 9, so next ID = 10
        const year = new Date().getFullYear();

        const req = mockRequest({ body: validDoctorBody, user: { adminId: 'ADMIN_001' } }) as Request;
        const res = mockResponse() as Response;

        await createDoctor(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
        expect(jsonCall.doctor.doctor_id).toBe(`DOC_${year}_010`);
    });

    it('pads doctor ID count to 3 digits', async () => {
        buildCollectionMockForCreateDoctor(0); // count = 0, so next ID = 1 -> "001"
        const year = new Date().getFullYear();

        const req = mockRequest({ body: validDoctorBody, user: { adminId: 'ADMIN_001' } }) as Request;
        const res = mockResponse() as Response;

        await createDoctor(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
        expect(jsonCall.doctor.doctor_id).toBe(`DOC_${year}_001`);
    });

    it('generates a doctor ID with 3-digit padded sequence for count = 99', async () => {
        buildCollectionMockForCreateDoctor(99); // count = 99, next = 100
        const year = new Date().getFullYear();

        const req = mockRequest({ body: validDoctorBody, user: { adminId: 'ADMIN_001' } }) as Request;
        const res = mockResponse() as Response;

        await createDoctor(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
        expect(jsonCall.doctor.doctor_id).toBe(`DOC_${year}_100`);
    });

    it('does not include password_hash in response', async () => {
        buildCollectionMockForCreateDoctor(1);

        const req = mockRequest({ body: validDoctorBody, user: { adminId: 'ADMIN_001' } }) as Request;
        const res = mockResponse() as Response;

        await createDoctor(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
        expect(jsonCall.doctor).not.toHaveProperty('password_hash');
    });

    it('returns 400 when email already exists', async () => {
        const mockedCollection = adminDb.collection as jest.Mock;
        const existingDoc = makeDocSnapshot(true, { email: validDoctorBody.email });

        mockedCollection.mockImplementation((name: string) => {
            if (name === 'doctors') {
                return {
                    where: jest.fn().mockReturnValue({
                        limit: jest.fn().mockReturnValue({
                            get: jest.fn().mockResolvedValue(makeQuerySnapshot([existingDoc])),
                        }),
                    }),
                    count: jest.fn().mockReturnValue(makeAggregateQuery(2)),
                    doc: jest.fn().mockReturnValue({ set: jest.fn() }),
                };
            }
            return { add: jest.fn(), doc: jest.fn() };
        });

        const req = mockRequest({ body: validDoctorBody }) as Request;
        const res = mockResponse() as Response;

        await createDoctor(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: 'Doctor with this email already exists' })
        );
    });

    it('returns 400 for invalid request body (zod validation)', async () => {
        const req = mockRequest({
            body: { fullName: 'A', email: 'not-an-email' }, // missing required fields
        }) as Request;
        const res = mockResponse() as Response;

        await createDoctor(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('calls count() on the doctors collection (not a full snapshot get)', async () => {
        buildCollectionMockForCreateDoctor(3);
        const mockedCollection = adminDb.collection as jest.Mock;

        const req = mockRequest({ body: validDoctorBody, user: { adminId: 'ADMIN_001' } }) as Request;
        const res = mockResponse() as Response;

        await createDoctor(req, res);

        // Find the call where count was invoked on the doctors collection
        let countWasCalled = false;
        for (const call of mockedCollection.mock.results) {
            if (call.value && typeof call.value.count === 'function') {
                const mockFn = call.value.count as jest.Mock;
                if (mockFn.mock && mockFn.mock.calls.length > 0) {
                    countWasCalled = true;
                }
            }
        }
        expect(countWasCalled).toBe(true);
    });

    it('returns tempPassword in response', async () => {
        buildCollectionMockForCreateDoctor(2);

        const req = mockRequest({ body: validDoctorBody, user: { adminId: 'ADMIN_001' } }) as Request;
        const res = mockResponse() as Response;

        await createDoctor(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
        expect(jsonCall).toHaveProperty('tempPassword');
    });

    it('uses provided password (not auto-generated) when password is in body', async () => {
        buildCollectionMockForCreateDoctor(2);
        const bcrypt = require('bcrypt');

        const req = mockRequest({
            body: { ...validDoctorBody, password: 'MyCustomPass123!' },
            user: { adminId: 'ADMIN_001' },
        }) as Request;
        const res = mockResponse() as Response;

        await createDoctor(req, res);

        expect(bcrypt.hash).toHaveBeenCalledWith('MyCustomPass123!', 10);
    });

    it('returns 500 on Firestore count aggregation failure', async () => {
        const mockedCollection = adminDb.collection as jest.Mock;

        mockedCollection.mockImplementation((name: string) => {
            if (name === 'doctors') {
                return {
                    where: jest.fn().mockReturnValue({
                        limit: jest.fn().mockReturnValue({
                            get: jest.fn().mockResolvedValue(makeQuerySnapshot([])),
                        }),
                    }),
                    count: jest.fn().mockReturnValue({
                        get: jest.fn().mockRejectedValue(new Error('Firestore count failed')),
                    }),
                    doc: jest.fn().mockReturnValue({ set: jest.fn() }),
                };
            }
            return { add: jest.fn(), doc: jest.fn() };
        });

        const req = mockRequest({ body: validDoctorBody, user: { adminId: 'ADMIN_001' } }) as Request;
        const res = mockResponse() as Response;

        await createDoctor(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: 'Internal server error' })
        );
    });
});