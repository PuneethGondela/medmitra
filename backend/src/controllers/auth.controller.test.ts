import { expect, it, describe, beforeEach, afterEach, jest, mock } from "bun:test";

mock.module("firebase-admin", () => ({ apps: [], default: { apps: [] } }));
mock.module("firebase-admin/firestore", () => ({
    FieldValue: {
        serverTimestamp: jest.fn().mockReturnValue("mock-timestamp")
    }
}));

mock.module("../config/firebase", () => ({
    adminDb: {
        collection: jest.fn()
    },
    adminAuth: {},
    COLLECTIONS: {
        ADMINS: "admins",
        AUDIT_LOGS: "audit_logs"
    }
}));

import { loginAdmin } from "./auth.controller";
import { adminDb, COLLECTIONS } from "../config/firebase";
import { Request, Response } from "express";
import bcrypt from "bcrypt";

describe("auth.controller - loginAdmin", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let jsonMock: any;
    let statusMock: any;
    let originalConsoleError: typeof console.error;
    let originalConsoleWarn: typeof console.warn;

    beforeEach(() => {
        req = {
            body: {
                email: "test@example.com",
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

        process.env.JWT_SECRET = "test-secret";

        // Suppress console.error during the test to keep output clean
        originalConsoleError = console.error;
        console.error = jest.fn();

        originalConsoleWarn = console.warn;
        console.warn = jest.fn();
    });

    afterEach(() => {
        console.error = originalConsoleError;
        console.warn = originalConsoleWarn;
        jest.clearAllMocks();
    });

    it("should return 500 when an internal server error occurs (e.g. DB failure)", async () => {
        // Setup the mock to throw an error
        const mockError = new Error("Database connection failed");

        (adminDb.collection as any).mockImplementation(() => {
            throw mockError;
        });

        // Call the function
        await loginAdmin(req as Request, res as Response);

        // Verify the response
        expect(statusMock).toHaveBeenCalledWith(500);
        expect(jsonMock).toHaveBeenCalledWith({
            error: "Internal server error",
            details: mockError.message,
        });

        // Verify console.error was called
        expect(console.error).toHaveBeenCalledWith("LOGIN ERROR:", mockError);
    });

    it("should log a warning if audit log fails but still return success", async () => {
        const hash = await bcrypt.hash("password123", 10);

        const mockUpdate = jest.fn().mockResolvedValue(true);
        const adminDoc = {
            exists: true,
            id: "admin-123",
            data: () => ({ password_hash: hash, role: "ADMIN", email: "test@example.com" }),
            ref: { update: mockUpdate }
        };
        const mockGet = jest.fn().mockResolvedValue({ empty: false, docs: [adminDoc] });
        const mockLimit = jest.fn().mockReturnValue({ get: mockGet });
        const mockWhere = jest.fn().mockReturnValue({ limit: mockLimit });

        const mockAddError = new Error("Firestore add failed");
        const mockAdd = jest.fn().mockImplementation(() => { throw mockAddError; });

        (adminDb.collection as any).mockImplementation((collectionName: string) => {
            if (collectionName === "admins" || collectionName === COLLECTIONS.ADMINS) {
                return { where: mockWhere, doc: jest.fn().mockReturnValue({ update: mockUpdate }) };
            }
            if (collectionName === "audit_logs" || collectionName === COLLECTIONS.AUDIT_LOGS) {
                return { add: mockAdd };
            }
            return {};
        });

        await loginAdmin(req as Request, res as Response);

        expect(console.warn).toHaveBeenCalledWith('Audit log failed (non-critical):', mockAddError);
        expect(jsonMock).toHaveBeenCalled();
        expect(statusMock).not.toHaveBeenCalledWith(500);
        expect(statusMock).not.toHaveBeenCalledWith(401);
    });
});
