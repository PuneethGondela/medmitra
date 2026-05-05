import { mock, expect, it, describe, beforeEach, afterEach, jest } from "bun:test";

mock.module("firebase-admin", () => {
    return {
        apps: [],
        default: { apps: [] },
        initializeApp: () => ({}),
        credential: { cert: () => ({}) }
    };
});

mock.module("qrcode", () => ({
    toDataURL: jest.fn(),
    default: {
        toDataURL: jest.fn()
    }
}));

const mockCollection = jest.fn();
mock.module("../config/firebase", () => {
    return {
        adminDb: {
            collection: mockCollection
        },
        adminAuth: {},
        COLLECTIONS: {
            ADMINS: "admins",
            AUDIT_LOGS: "audit_logs"
        }
    };
});

// Have to use dynamic import because of circular dependency in mocks
const QRCode = require("qrcode");
const { loginAdmin } = require("./auth.controller");
const { adminDb } = require("../config/firebase");

describe("auth.controller - loginAdmin", () => {
    let req: any;
    let res: any;
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

        originalConsoleError = console.error;
        console.error = jest.fn();
        mockCollection.mockClear();
    });

    afterEach(() => {
        console.error = originalConsoleError;
        jest.clearAllMocks();
    });

    it("should return 500 when an internal server error occurs (e.g. DB failure)", async () => {
        const mockError = new Error("Database connection failed");
        mockCollection.mockImplementation(() => {
            throw mockError;
        });

        await loginAdmin(req, res);

        expect(statusMock).toHaveBeenCalledWith(500);
        expect(jsonMock).toHaveBeenCalledWith({
            error: "Internal server error",
            details: mockError.message,
        });
        expect(console.error).toHaveBeenCalledWith("LOGIN ERROR:", mockError);
    });
});

describe("auth.controller - input validation", () => {
    let req: any;
    let res: any;
    let jsonMock: any;
    let statusMock: any;

    beforeEach(() => {
        req = {
            body: {},
        };
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        res = {
            status: statusMock,
            json: jsonMock,
        };
    });

    it("should reject inputs exceeding 255 characters", async () => {
        req.body.email = "a".repeat(256) + "@example.com";
        req.body.password = "password123";

        await loginAdmin(req, res);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({
            error: "Input fields exceed maximum length",
        });
    });
});
