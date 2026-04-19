import { Request, Response } from 'express';

// Mock firebase config before importing the controller
jest.mock('../../config/firebase', () => ({
    adminDb: {
        collection: jest.fn(),
    },
    adminAuth: {
        createCustomToken: jest.fn(),
        createUser: jest.fn(),
    },
    COLLECTIONS: {
        DOCTORS: 'doctors',
        WORKERS: 'workers',
        BLOOD_DONORS: 'blood_donors',
        RECORDS: 'records',
        AUDIT_LOGS: 'audit_logs',
    },
}));

jest.mock('firebase-admin/firestore', () => ({
    FieldValue: {
        serverTimestamp: jest.fn().mockReturnValue('SERVER_TIMESTAMP'),
    },
}));

jest.mock('bcrypt', () => ({
    compare: jest.fn(),
    hash: jest.fn().mockResolvedValue('hashed_password'),
}));

jest.mock('jsonwebtoken', () => ({
    sign: jest.fn().mockReturnValue('mock_jwt_token'),
}));

import { createDoctor } from '../doctor.controller';
import { adminDb, adminAuth } from '../../config/firebase';
import bcrypt from 'bcrypt';

const mockRes = () => {
    const res: Partial<Response> = {
        json: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
    };
    (res.status as jest.Mock).mockReturnValue(res);
    return res as Response;
};

// Helper: make a query chain returning an empty snapshot (for duplicate checks)
const makeEmptyQueryChain = () => {
    const chain: any = {
        where: jest.fn(),
        limit: jest.fn(),
        get: jest.fn().mockResolvedValue({ empty: true, size: 0, docs: [] }),
        orderBy: jest.fn(),
    };
    chain.where.mockReturnValue(chain);
    chain.limit.mockReturnValue(chain);
    chain.orderBy.mockReturnValue(chain);
    return chain;
};

// Helper: make a query chain for a full snapshot with given size (no .where/.limit)
const makeFullSnapshotChain = (size: number) => {
    const chain: any = {
        where: jest.fn(),
        get: jest.fn().mockResolvedValue({ empty: size === 0, size, docs: [] }),
        doc: jest.fn(),
        orderBy: jest.fn(),
        limit: jest.fn(),
    };
    chain.where.mockReturnValue(chain);
    chain.orderBy.mockReturnValue(chain);
    chain.limit.mockReturnValue(chain);
    return chain;
};

const validDoctorBody = {
    fullName: 'Dr. Jane Smith',
    email: 'jane.smith@hospital.com',
    mobileNumber: '9876543210',
    medicalLicense: 'LIC-2024-001',
    specialization: 'Cardiology',
    hospitalName: 'City Hospital',
    hospitalId: 'HOSP_001',
    loginUsername: 'janesmith',
    password: 'SecurePass123!',
};

describe('createDoctor', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (adminAuth as any).createUser = jest.fn().mockResolvedValue({ uid: 'DOC_2024_001' });
    });

    it('generates doctor ID using snapshot.size + 1 (not .data().count)', async () => {
        // 3 empty duplicate-check queries + 1 full snapshot for count + 1 doc().set + 1 audit add
        const emailCheck = makeEmptyQueryChain();
        const licenseCheck = makeEmptyQueryChain();
        const usernameCheck = makeEmptyQueryChain();
        // Full collection scan for counting - size is 4 so next ID should be 005
        const countChain = makeFullSnapshotChain(4);
        const docRef = { set: jest.fn().mockResolvedValue(undefined) };
        const auditChain = { add: jest.fn().mockResolvedValue({ id: 'audit_id' }) };

        (adminDb.collection as jest.Mock)
            .mockImplementationOnce(() => emailCheck)    // email check
            .mockImplementationOnce(() => licenseCheck) // license check
            .mockImplementationOnce(() => usernameCheck)// username check
            .mockImplementationOnce(() => ({            // count all doctors
                get: jest.fn().mockResolvedValue({ size: 4, docs: [] }),
                doc: jest.fn().mockReturnValue(docRef),
            }))
            .mockImplementationOnce(() => ({            // doc().set()
                doc: jest.fn().mockReturnValue(docRef),
            }))
            .mockImplementationOnce(() => auditChain);  // audit_logs

        // Make the DOCTORS collection doc().set() work
        (adminDb.collection as jest.Mock).mockImplementation((collectionName: string) => {
            if (collectionName === 'doctors') {
                return {
                    where: jest.fn().mockReturnThis(),
                    limit: jest.fn().mockReturnThis(),
                    get: jest.fn().mockResolvedValue({ size: 4, empty: true, docs: [] }),
                    doc: jest.fn().mockReturnValue(docRef),
                };
            }
            if (collectionName === 'audit_logs') {
                return auditChain;
            }
            return makeEmptyQueryChain();
        });

        const req = { body: validDoctorBody, user: { adminId: 'admin_1' } } as any as Request;
        const res = mockRes();

        await createDoctor(req, res);

        // Should get 201 with a doctor that has an ID using size + 1
        expect(res.status).toHaveBeenCalledWith(201);
        const responseArg = (res.json as jest.Mock).mock.calls[0][0];
        expect(responseArg.doctor.doctor_id).toMatch(/^DOC_\d{4}_\d{3}$/);
        // With size=4, count = 4+1 = 5 -> "005"
        expect(responseArg.doctor.doctor_id).toMatch(/005$/);
    });

    it('generates correct doctor ID with zero existing doctors', async () => {
        const docRef = { set: jest.fn().mockResolvedValue(undefined) };
        const auditChain = { add: jest.fn().mockResolvedValue({ id: 'audit_id' }) };

        // All checks empty, count snapshot has size=0
        (adminDb.collection as jest.Mock).mockImplementation((collectionName: string) => {
            if (collectionName === 'doctors') {
                return {
                    where: jest.fn().mockReturnThis(),
                    limit: jest.fn().mockReturnThis(),
                    get: jest.fn().mockResolvedValue({ size: 0, empty: true, docs: [] }),
                    doc: jest.fn().mockReturnValue(docRef),
                };
            }
            if (collectionName === 'audit_logs') {
                return auditChain;
            }
            return makeEmptyQueryChain();
        });

        const req = { body: validDoctorBody, user: { adminId: 'admin_1' } } as any as Request;
        const res = mockRes();

        await createDoctor(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        const responseArg = (res.json as jest.Mock).mock.calls[0][0];
        // With size=0, count = 0+1 = 1 -> "001"
        expect(responseArg.doctor.doctor_id).toMatch(/001$/);
    });

    it('generates correct doctor ID with many existing doctors', async () => {
        const docRef = { set: jest.fn().mockResolvedValue(undefined) };
        const auditChain = { add: jest.fn().mockResolvedValue({ id: 'audit_id' }) };

        (adminDb.collection as jest.Mock).mockImplementation((collectionName: string) => {
            if (collectionName === 'doctors') {
                return {
                    where: jest.fn().mockReturnThis(),
                    limit: jest.fn().mockReturnThis(),
                    get: jest.fn().mockResolvedValue({ size: 99, empty: true, docs: [] }),
                    doc: jest.fn().mockReturnValue(docRef),
                };
            }
            if (collectionName === 'audit_logs') {
                return auditChain;
            }
            return makeEmptyQueryChain();
        });

        const req = { body: validDoctorBody, user: { adminId: 'admin_1' } } as any as Request;
        const res = mockRes();

        await createDoctor(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        const responseArg = (res.json as jest.Mock).mock.calls[0][0];
        // With size=99, count = 99+1 = 100 -> "100"
        expect(responseArg.doctor.doctor_id).toMatch(/100$/);
    });

    it('returns 400 when email already exists', async () => {
        // emailCheck returns non-empty snapshot
        (adminDb.collection as jest.Mock).mockImplementation((collectionName: string) => {
            if (collectionName === 'doctors') {
                return {
                    where: jest.fn().mockReturnThis(),
                    limit: jest.fn().mockReturnThis(),
                    get: jest.fn().mockResolvedValue({ empty: false, size: 1, docs: [{}] }),
                };
            }
            return makeEmptyQueryChain();
        });

        const req = { body: validDoctorBody } as any as Request;
        const res = mockRes();

        await createDoctor(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Doctor with this email already exists' });
    });

    it('returns 400 when request body fails Zod validation', async () => {
        const invalidBody = { email: 'not-an-email', fullName: 'A' }; // fails schema
        const req = { body: invalidBody } as any as Request;
        const res = mockRes();

        await createDoctor(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        const response = (res.json as jest.Mock).mock.calls[0][0];
        expect(Array.isArray(response.error)).toBe(true);
    });

    it('does not include password_hash in the response', async () => {
        const docRef = { set: jest.fn().mockResolvedValue(undefined) };
        const auditChain = { add: jest.fn().mockResolvedValue({ id: 'audit_id' }) };

        (adminDb.collection as jest.Mock).mockImplementation((collectionName: string) => {
            if (collectionName === 'doctors') {
                return {
                    where: jest.fn().mockReturnThis(),
                    limit: jest.fn().mockReturnThis(),
                    get: jest.fn().mockResolvedValue({ size: 2, empty: true, docs: [] }),
                    doc: jest.fn().mockReturnValue(docRef),
                };
            }
            if (collectionName === 'audit_logs') {
                return auditChain;
            }
            return makeEmptyQueryChain();
        });

        const req = { body: validDoctorBody, user: { adminId: 'admin_1' } } as any as Request;
        const res = mockRes();

        await createDoctor(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        const responseArg = (res.json as jest.Mock).mock.calls[0][0];
        expect(responseArg.doctor.password_hash).toBeUndefined();
    });

    it('returns 500 when Firestore throws an unexpected error', async () => {
        (adminDb.collection as jest.Mock).mockImplementation(() => {
            throw new Error('Firestore connection failed');
        });

        const req = { body: validDoctorBody } as any as Request;
        const res = mockRes();

        await createDoctor(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: 'Internal server error' })
        );
    });

    it('uses default temp password when no password provided', async () => {
        const docRef = { set: jest.fn().mockResolvedValue(undefined) };
        const auditChain = { add: jest.fn().mockResolvedValue({ id: 'audit_id' }) };

        (adminDb.collection as jest.Mock).mockImplementation((collectionName: string) => {
            if (collectionName === 'doctors') {
                return {
                    where: jest.fn().mockReturnThis(),
                    limit: jest.fn().mockReturnThis(),
                    get: jest.fn().mockResolvedValue({ size: 1, empty: true, docs: [] }),
                    doc: jest.fn().mockReturnValue(docRef),
                };
            }
            if (collectionName === 'audit_logs') {
                return auditChain;
            }
            return makeEmptyQueryChain();
        });

        const bodyWithoutPassword = { ...validDoctorBody };
        delete (bodyWithoutPassword as any).password;

        const req = { body: bodyWithoutPassword, user: { adminId: 'admin_1' } } as any as Request;
        const res = mockRes();

        await createDoctor(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        const responseArg = (res.json as jest.Mock).mock.calls[0][0];
        // tempPassword should be the default
        expect(responseArg.tempPassword).toBe('TempPassword2026!');
    });
});