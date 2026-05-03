import { expect, it, describe, beforeEach, afterEach, jest, mock } from "bun:test";

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
