import { mock, expect, it, describe, beforeEach, afterEach, jest } from "bun:test";

mock.module('firebase-admin', () => {
    const auth = () => ({});
    const firestore = () => ({});
    const storage = () => ({});
    return {
        apps: [],
        default: { apps: [] },
        initializeApp: () => ({}),
        credential: { cert: () => ({}) },
        auth,
        firestore,
        storage
    };
});

mock.module('firebase-admin/firestore', () => ({
    FieldValue: {
        serverTimestamp: () => 'mocked-timestamp'
    }
}));

const mockCollection = jest.fn();
const mockCreateCustomToken = jest.fn();

mock.module("../config/firebase", () => {
    return {
        adminDb: {
            collection: mockCollection
        },
        adminAuth: {
            createCustomToken: mockCreateCustomToken
        },
        COLLECTIONS: {
            DOCTORS: "doctors",
            AUDIT_LOGS: "audit_logs"
        }
    };
});

const { loginDoctor } = require("./doctor.controller");
const { COLLECTIONS } = require("../config/firebase");
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

describe("doctor.controller - loginDoctor", () => {
    let req: any;
    let res: any;
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

        jest.spyOn(bcrypt, 'compare').mockImplementation(async () => true);
        jest.spyOn(jwt, 'sign').mockImplementation(() => "mocked-jwt-token" as any);

        originalConsoleWarn = console.warn;
        originalConsoleError = console.error;
        console.warn = jest.fn();
        console.error = jest.fn();
        mockCollection.mockClear();
        mockCreateCustomToken.mockClear();
    });

    afterEach(() => {
        console.warn = originalConsoleWarn;
        console.error = originalConsoleError;
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    it("should successfully login a doctor (happy path)", async () => {
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
            ref: { update: mockUpdate }
        };

        const mockGet = jest.fn().mockResolvedValue({
            empty: false,
            docs: [mockDoctorDoc]
        });

        const mockLimit = jest.fn().mockReturnValue({ get: mockGet });
        const mockWhere = jest.fn().mockReturnValue({ limit: mockLimit });
        const mockAdd = jest.fn().mockResolvedValue({ id: "audit123" });

        mockCollection.mockImplementation((collectionName: string) => {
            if (collectionName === COLLECTIONS.DOCTORS) return { where: mockWhere };
            if (collectionName === COLLECTIONS.AUDIT_LOGS) return { add: mockAdd };
            return {};
        });

        mockCreateCustomToken.mockResolvedValue("mocked-firebase-token");

        await loginDoctor(req, res);

        expect(statusMock).not.toHaveBeenCalled();
    });

    it("should reject inputs exceeding 255 characters", async () => {
        req.body.email = "a".repeat(256) + "@example.com";
        req.body.password = "password123";

        await loginDoctor(req, res);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({
            error: "Input fields exceed maximum length",
        });
    });
});
