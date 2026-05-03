import { expect, test, describe, jest, beforeEach, afterEach, mock } from "bun:test";
import { Request, Response } from 'express';

// Mock dependencies
mock.module('firebase-admin', () => {
    return {
        apps: [],
        initializeApp: jest.fn(),
        credential: { cert: jest.fn() },
        auth: jest.fn(),
        firestore: jest.fn(),
        storage: jest.fn(),
        default: {
            apps: [],
            initializeApp: jest.fn(),
            credential: { cert: jest.fn() },
            auth: jest.fn(),
            firestore: jest.fn(),
            storage: jest.fn()
        }
    };
});

mock.module('firebase-admin/firestore', () => {
    return {
        FieldValue: { serverTimestamp: jest.fn().mockReturnValue('mocked-timestamp') }
    };
});

mock.module('../config/firebase', () => {
    return {
        adminDb: { collection: jest.fn() },
        adminAuth: {},
        COLLECTIONS: { ADMINS: 'admins' }
    };
});

mock.module('../lib/firebase-admin', () => {
    return {
        adminDb: {},
        adminAuth: {},
        adminStorage: {},
        default: {}
    };
});

mock.module('bcrypt', () => {
    const mockHash = jest.fn();
    return {
        hash: mockHash,
        compare: jest.fn(),
        default: {
            hash: mockHash,
            compare: jest.fn()
        }
    };
});

const { createInitialAdmin } = await import("./auth.controller");
const { adminDb, COLLECTIONS } = await import('../config/firebase');
const bcrypt = await import('bcrypt');

describe("auth.controller", () => {
    describe("createInitialAdmin", () => {
        let req: Partial<Request>;
        let res: Partial<Response>;
        let jsonMock: ReturnType<typeof jest.fn>;
        let statusMock: ReturnType<typeof jest.fn>;
        let originalConsoleError: any;

        beforeEach(() => {
            req = {
                body: {
                    email: 'test@example.com',
                    password: 'password123'
                }
            };
            jsonMock = jest.fn();
            statusMock = jest.fn().mockReturnValue({ json: jsonMock });
            res = {
                status: statusMock,
                json: jsonMock
            } as any;

            originalConsoleError = console.error;
            console.error = jest.fn();

            // Default mock implementations for bcrypt and firebase
            (bcrypt.hash as jest.Mock).mockClear();
            (adminDb.collection as jest.Mock).mockClear();
        });

        afterEach(() => {
            console.error = originalConsoleError;
        });

        test("should return 500 when creating admin fails in firestore", async () => {
            // Setup mocks
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');

            const mockEmptySnapshot = { empty: true };
            const mockGet = jest.fn().mockResolvedValue(mockEmptySnapshot);
            const mockLimit = jest.fn().mockReturnValue({ get: mockGet });
            const mockWhere = jest.fn().mockReturnValue({ limit: mockLimit });

            const mockAdd = jest.fn().mockRejectedValue(new Error('Firestore error'));

            (adminDb.collection as jest.Mock).mockReturnValue({
                where: mockWhere,
                add: mockAdd
            });

            await createInitialAdmin(req as Request, res as Response);

            expect(adminDb.collection).toHaveBeenCalledWith(COLLECTIONS.ADMINS);
            expect(mockAdd).toHaveBeenCalled();
            expect(console.error).toHaveBeenCalledWith('Create admin error:', expect.any(Error));
            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Failed to create admin',
                details: 'Firestore error'
            });
        });

        test("should return 400 when admin already exists", async () => {
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');

            const mockNotEmptySnapshot = { empty: false };
            const mockGet = jest.fn().mockResolvedValue(mockNotEmptySnapshot);
            const mockLimit = jest.fn().mockReturnValue({ get: mockGet });
            const mockWhere = jest.fn().mockReturnValue({ limit: mockLimit });

            (adminDb.collection as jest.Mock).mockReturnValue({
                where: mockWhere
            });

            await createInitialAdmin(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Admin with this email already exists' });
        });

        test("should return 400 when missing email or password", async () => {
            req.body = { email: 'test@example.com' };
            await createInitialAdmin(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Email and password required' });

            req.body = { password: 'password123' };
            await createInitialAdmin(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Email and password required' });
        });

        test("should return 500 when bcrypt hashing fails", async () => {
            // Force hash to reject
            const error = new Error('Bcrypt hashing error');
            (bcrypt.hash as jest.Mock).mockImplementation(() => Promise.reject(error));

            await createInitialAdmin(req as Request, res as Response);

            expect(console.error).toHaveBeenCalledWith('Create admin error:', error);
            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Failed to create admin',
                details: 'Bcrypt hashing error'
            });
        });

        test("should create admin successfully", async () => {
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');

            const mockEmptySnapshot = { empty: true };
            const mockGet = jest.fn().mockResolvedValue(mockEmptySnapshot);
            const mockLimit = jest.fn().mockReturnValue({ get: mockGet });
            const mockWhere = jest.fn().mockReturnValue({ limit: mockLimit });

            const mockAdd = jest.fn().mockResolvedValue({ id: 'new-admin-id' });

            (adminDb.collection as jest.Mock).mockReturnValue({
                where: mockWhere,
                add: mockAdd
            });

            await createInitialAdmin(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(201);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'Admin created' });
        });
    });
});
