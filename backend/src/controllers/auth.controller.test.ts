import { expect, it, describe, beforeEach, afterEach, jest, mock } from "bun:test";


mock.module("qrcode", () => ({
    toDataURL: jest.fn(),
    default: {
        toDataURL: jest.fn()
    }
}));


mock.module("../config/firebase", () => {
    const updateMock = jest.fn();
    const docMock = jest.fn().mockReturnValue({ update: updateMock });
    const collectionMock = jest.fn().mockReturnValue({ doc: docMock });
    return {
        adminDb: {
            collection: collectionMock
        },
        adminAuth: {},
        COLLECTIONS: {
            ADMINS: "admins",
            AUDIT_LOGS: "audit_logs"
        }
    };
});


import { loginAdmin, generate2FA } from "./auth.controller";
import QRCode from "qrcode";
import { adminDb } from "../config/firebase";
import { Request, Response } from "express";

describe("auth.controller - loginAdmin", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let jsonMock: any;
    let statusMock: any;
    let originalConsoleError: typeof console.error;

    beforeEach(() => {
        req = {
            body: {
                email: "test@example.com",
                password: "password123",
            },
        };
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        res = {
            status: statusMock,
            json: jsonMock,
        };

        // Suppress console.error during the test to keep output clean
        originalConsoleError = console.error;
        console.error = jest.fn();
    });

    afterEach(() => {
        console.error = originalConsoleError;
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
});


describe("auth.controller - generate2FA", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let jsonMock: any;
    let statusMock: any;
    let originalConsoleError: typeof console.error;

    beforeEach(() => {
        req = {
            user: { adminId: "test-admin-id" }
        } as any;
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        res = {
            status: statusMock,
            json: jsonMock,
        };

        originalConsoleError = console.error;
        console.error = jest.fn();
    });

    afterEach(() => {
        console.error = originalConsoleError;
        jest.clearAllMocks();
    });

    it("should return 500 when an internal server error occurs during 2FA generation", async () => {
        const mockError = new Error("Failed to generate QR code");

        // Force QRCode.toDataURL to throw an error
        (QRCode.toDataURL as any).mockRejectedValueOnce(mockError);

        // Ensure adminDb.collection.doc.update succeeds so it gets to QRCode
        const updateMock = jest.fn().mockResolvedValueOnce(true);
        const docMock = jest.fn().mockReturnValue({ update: updateMock });
        (adminDb.collection as any).mockReturnValue({ doc: docMock });

        await generate2FA(req as Request, res as Response);

        expect(statusMock).toHaveBeenCalledWith(500);
        expect(jsonMock).toHaveBeenCalledWith({
            error: "Failed to generate 2FA",
            details: mockError.message,
        });

        expect(console.error).toHaveBeenCalledWith(mockError);
    });
});
