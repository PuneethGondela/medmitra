import { expect, it, describe, beforeEach, afterEach, jest, mock } from "bun:test";

mock.module('firebase-admin', () => ({
    apps: [],
    default: { apps: [] }
}));

mock.module('firebase-admin/firestore', () => ({
    FieldValue: {
        serverTimestamp: jest.fn(() => 'mocked-timestamp')
    }
}));

// We'll mock the config
mock.module("../config/firebase", () => {
    return {
        adminDb: {
            collection: jest.fn()
        },
        adminAuth: {
            createCustomToken: jest.fn()
        },
        COLLECTIONS: {
            DOCTORS: "doctors",
            AUDIT_LOGS: "audit_logs"
        }
    };
});

import { loginDoctor } from "./doctor.controller";
import { adminDb, adminAuth, COLLECTIONS } from "../config/firebase";
import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

describe("doctor.controller - loginDoctor", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let jsonMock: any;
    let statusMock: any;
    let originalConsoleWarn: typeof console.warn;
    let originalConsoleError: typeof console.error;

    beforeEach(() => {
        req = {
            body: {
                email: "doctor@example.com",
                password: "password123",
            },
            ip: "127.0.0.1"
        };
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        res = {
            status: statusMock,
            json: jsonMock,
        };

        // Mock bcrypt and jwt directly using spyOn
        jest.spyOn(bcrypt, 'compare').mockImplementation(async () => true);
        jest.spyOn(jwt, 'sign').mockImplementation(() => "mocked-jwt-token");

        // Suppress console output during tests
        originalConsoleWarn = console.warn;
        originalConsoleError = console.error;
        console.warn = jest.fn();
        console.error = jest.fn();
    });

    afterEach(() => {
        console.warn = originalConsoleWarn;
        console.error = originalConsoleError;
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    it("should successfully login a doctor (happy path)", async () => {
        const mockUpdate = jest.fn().mockResolvedValue(true);

        // Setup Firestore mocks for successful login
        const mockDoctorDoc = {
            id: "doc123",
            data: () => ({
                email: "doctor@example.com",
                password_hash: "hashed_password",
                account_status: "ACTIVE",
                full_name: "Dr. Smith",
                specialization: "Cardiology"
            }),
            ref: {
                update: mockUpdate
            }
        };

        const mockGet = jest.fn().mockResolvedValue({
            empty: false,
            docs: [mockDoctorDoc]
        });

        const mockLimit = jest.fn().mockReturnValue({ get: mockGet });
        const mockWhere = jest.fn().mockReturnValue({ limit: mockLimit });

        const mockAdd = jest.fn().mockResolvedValue({ id: "audit123" });

        (adminDb.collection as any).mockImplementation((collectionName: string) => {
            if (collectionName === COLLECTIONS.DOCTORS) {
                return { where: mockWhere };
            }
            if (collectionName === COLLECTIONS.AUDIT_LOGS) {
                return { add: mockAdd };
            }
            return {};
        });

        (adminAuth.createCustomToken as any).mockResolvedValue("mocked-firebase-token");

        await loginDoctor(req as Request, res as Response);

        expect(statusMock).not.toHaveBeenCalled();
        expect(jsonMock).toHaveBeenCalledWith({
            token: "mocked-jwt-token",
            firebaseToken: "mocked-firebase-token",
            user: {
                id: "doc123",
                name: "Dr. Smith",
                email: "doctor@example.com",
                role: "doctor",
                specialization: "Cardiology"
            }
        });

        // Ensure audit log was created
        expect(mockAdd).toHaveBeenCalled();
    });

    it("should handle audit log failure non-critically during login", async () => {
        const mockUpdate = jest.fn().mockResolvedValue(true);

        const mockDoctorDoc = {
            id: "doc123",
            data: () => ({
                email: "doctor@example.com",
                password_hash: "hashed_password",
                account_status: "ACTIVE",
                full_name: "Dr. Smith",
                specialization: "Cardiology"
            }),
            ref: {
                update: mockUpdate
            }
        };

        const mockGet = jest.fn().mockResolvedValue({
            empty: false,
            docs: [mockDoctorDoc]
        });

        const mockLimit = jest.fn().mockReturnValue({ get: mockGet });
        const mockWhere = jest.fn().mockReturnValue({ limit: mockLimit });

        const auditError = new Error("Firestore write failed");
        const mockAdd = jest.fn().mockRejectedValue(auditError);

        (adminDb.collection as any).mockImplementation((collectionName: string) => {
            if (collectionName === COLLECTIONS.DOCTORS) {
                return { where: mockWhere };
            }
            if (collectionName === COLLECTIONS.AUDIT_LOGS) {
                return { add: mockAdd };
            }
            return {};
        });

        (adminAuth.createCustomToken as any).mockResolvedValue("mocked-firebase-token");

        await loginDoctor(req as Request, res as Response);

        // Expect console.warn to be called for the audit error
        expect(console.warn).toHaveBeenCalledWith("Audit log failed (non-critical):", auditError);

        // Expect login to still succeed
        expect(statusMock).not.toHaveBeenCalled();
        expect(jsonMock).toHaveBeenCalledWith({
            token: "mocked-jwt-token",
            firebaseToken: "mocked-firebase-token",
            user: {
                id: "doc123",
                name: "Dr. Smith",
                email: "doctor@example.com",
                role: "doctor",
                specialization: "Cardiology"
            }
        });
    });
});
