import { Request, Response } from 'express';

// Mock firebase config before importing the controller
jest.mock('../../config/firebase', () => ({
    adminDb: {
        collection: jest.fn(),
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

jest.mock('axios', () => ({
    post: jest.fn(),
}));

jest.mock('../../services/ml-storage.service', () => ({
    storeMLResponse: jest.fn().mockResolvedValue(undefined),
    storeAnalysisResponse: jest.fn().mockResolvedValue(undefined),
}));

import { analyzeSystem } from '../bot.controller';
import { adminDb } from '../../config/firebase';
import axios from 'axios';

const mockRes = () => {
    const res: Partial<Response> = {
        json: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
        setHeader: jest.fn().mockReturnThis(),
    };
    (res.status as jest.Mock).mockReturnValue(res);
    return res as Response;
};

// Build a snapshot with docs that include timestamps and user_type/action for activity tracking
const makeAuditDocs = (entries: Array<{ user_type: string; action: string }>) =>
    entries.map(e => ({
        data: () => ({
            user_type: e.user_type,
            action: e.action,
            timestamp: { toDate: () => new Date() },
        }),
    }));

// Build a fluent Firestore query chain
const makeQueryChain = (result: { size: number; docs?: any[]; empty?: boolean }) => {
    const chain: any = {
        where: jest.fn(),
        orderBy: jest.fn(),
        limit: jest.fn(),
        get: jest.fn().mockResolvedValue({ size: result.size, docs: result.docs ?? [], empty: result.empty ?? false }),
    };
    chain.where.mockReturnValue(chain);
    chain.orderBy.mockReturnValue(chain);
    chain.limit.mockReturnValue(chain);
    return chain;
};

/**
 * getAdminContext calls (in order per analyzeSystem path):
 *  1. DOCTORS (active, non-deleted) -> doctors count
 *  2. WORKERS (active) -> workers count
 *  3. BLOOD_DONORS (available) -> donors count
 *  4. DOCTORS (active, non-deleted, ordered, limit 10) -> recent doctors
 *  5. WORKERS (ordered by joined_at, limit 10) -> recent workers
 *  6. WORKERS (active, assigned_doctor_id != null, limit 20) -> assigned workers
 *
 * detectSuspiciousActivity calls (inside getAdminContext):
 *  7. AUDIT_LOGS (timestamp >= 24h ago, ordered, limit 100) -> recent logs
 *  8. AUDIT_LOGS (action == LOGIN_FAILED, timestamp >= 1h ago) -> failed logins (uses .size)
 *  9. AUDIT_LOGS (timestamp >= 1h ago) -> hourly activity
 */
const setupAdminContextMocks = ({
    doctorCount = 3,
    workerCount = 2,
    donorCount = 5,
    failedLoginCount = 0,
    auditDocs = [] as any[],
    hourlyDocs = [] as any[],
} = {}) => {
    const doctorsCountChain = makeQueryChain({ size: doctorCount, docs: [] });
    const workersCountChain = makeQueryChain({ size: workerCount, docs: [] });
    const donorsCountChain = makeQueryChain({ size: donorCount, docs: [] });
    const recentDoctorsChain = makeQueryChain({ size: doctorCount, docs: [] });
    const recentWorkersChain = makeQueryChain({ size: workerCount, docs: [] });
    const assignedWorkersChain = makeQueryChain({ size: 0, docs: [] });
    const recentLogsChain = makeQueryChain({ size: auditDocs.length, docs: auditDocs });
    const failedLoginsChain = makeQueryChain({ size: failedLoginCount, docs: [] });
    const hourlyChain = makeQueryChain({ size: hourlyDocs.length, docs: hourlyDocs });

    let callCount = 0;
    (adminDb.collection as jest.Mock).mockImplementation((collectionName: string) => {
        callCount++;
        if (collectionName === 'doctors') {
            if (callCount === 1) return doctorsCountChain;
            return recentDoctorsChain;
        }
        if (collectionName === 'workers') {
            if (callCount === 2) return workersCountChain;
            if (callCount <= 6) return recentWorkersChain;
            return assignedWorkersChain;
        }
        if (collectionName === 'blood_donors') {
            return donorsCountChain;
        }
        if (collectionName === 'audit_logs') {
            const auditCallNum = callCount;
            if (auditCallNum <= 8) return recentLogsChain;
            if (auditCallNum <= 9) return failedLoginsChain;
            return hourlyChain;
        }
        // audit_logs for analyzeSystem itself
        return { add: jest.fn().mockResolvedValue({ id: 'log_id' }) };
    });

    return {
        doctorsCountChain, workersCountChain, donorsCountChain,
        failedLoginsChain, recentLogsChain, hourlyChain,
    };
};

describe('analyzeSystem (exercises getAdminContext and detectSuspiciousActivity)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('uses snapshot.size to get doctor, worker, and donor counts in context', async () => {
        // Use a simpler approach: mock by tracking call sequence per collection
        const docChain = makeQueryChain({ size: 4, docs: [] });
        const workerChain = makeQueryChain({ size: 6, docs: [] });
        const donorChain = makeQueryChain({ size: 9, docs: [] });
        const auditChain = makeQueryChain({ size: 0, docs: [] });
        const selfAuditChain = { add: jest.fn().mockResolvedValue({ id: 'x' }) };

        // Track per-collection call counters
        const doctorCalls: any[] = [docChain, docChain];
        const workerCalls: any[] = [workerChain, workerChain, workerChain];
        const auditCalls: any[] = [auditChain, auditChain, auditChain, selfAuditChain];

        let doctorCallIdx = 0;
        let workerCallIdx = 0;
        let auditCallIdx = 0;

        (adminDb.collection as jest.Mock).mockImplementation((name: string) => {
            if (name === 'doctors') return doctorCalls[doctorCallIdx++] ?? docChain;
            if (name === 'workers') return workerCalls[workerCallIdx++] ?? workerChain;
            if (name === 'blood_donors') return donorChain;
            if (name === 'audit_logs') return auditCalls[auditCallIdx++] ?? selfAuditChain;
            return auditChain;
        });

        (axios.post as jest.Mock).mockResolvedValue({
            data: { response: 'System analysis complete' },
        });

        const req = {
            body: { query: 'Check system health' },
            user: { adminId: 'admin_001' },
        } as any as Request;
        const res = mockRes();

        await analyzeSystem(req, res);

        // Should respond with analysis result
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ analysis: 'System analysis complete' })
        );

        // The contextUsed should be present (admin context was fetched)
        const response = (res.json as jest.Mock).mock.calls[0][0];
        expect(response).toHaveProperty('contextUsed');
    });

    it('uses failedLoginsSnapshot.size (not .data().count) to detect suspicious activity', async () => {
        // We test indirectly: if failedLoginCount > 10, it should appear in security patterns
        // Set up 11 failed logins so suspicious activity is detected

        // Build chains with per-collection tracking
        const noopChain = makeQueryChain({ size: 0, docs: [] });
        const selfAuditChain = { add: jest.fn().mockResolvedValue({ id: 'x' }) };

        // Suspicious: 11 failed logins in the last hour
        const failedLoginsChain = makeQueryChain({ size: 11, docs: [] });

        const doctorCalls: any[] = [noopChain, noopChain];
        const workerCalls: any[] = [noopChain, noopChain, noopChain];
        // audit_logs calls: recentLogs (24h), failedLogins (1h), hourly (1h), then self audit
        const auditCalls: any[] = [noopChain, failedLoginsChain, noopChain, selfAuditChain];

        let doctorIdx = 0, workerIdx = 0, auditIdx = 0;
        (adminDb.collection as jest.Mock).mockImplementation((name: string) => {
            if (name === 'doctors') return doctorCalls[doctorIdx++] ?? noopChain;
            if (name === 'workers') return workerCalls[workerIdx++] ?? noopChain;
            if (name === 'blood_donors') return noopChain;
            if (name === 'audit_logs') return auditCalls[auditIdx++] ?? selfAuditChain;
            return noopChain;
        });

        (axios.post as jest.Mock).mockResolvedValue({
            data: { response: 'High alert detected' },
        });

        const req = {
            body: { query: 'Security check' },
            user: { adminId: 'admin_001' },
        } as any as Request;
        const res = mockRes();

        await analyzeSystem(req, res);

        expect(res.json).toHaveBeenCalled();
        const response = (res.json as jest.Mock).mock.calls[0][0];
        // Security patterns should contain the failed logins alert
        const patterns = response.security?.patterns ?? [];
        const hasFailedLoginPattern = patterns.some(
            (p: any) => p.type === 'Multiple Failed Logins' && p.severity === 'HIGH'
        );
        expect(hasFailedLoginPattern).toBe(true);
    });

    it('does not flag suspicious activity when failed logins <= 10', async () => {
        const noopChain = makeQueryChain({ size: 0, docs: [] });
        const selfAuditChain = { add: jest.fn().mockResolvedValue({ id: 'x' }) };
        const failedLoginsChain = makeQueryChain({ size: 10, docs: [] }); // exactly 10, not > 10

        let doctorIdx = 0, workerIdx = 0, auditIdx = 0;
        const doctorCalls = [noopChain, noopChain];
        const workerCalls = [noopChain, noopChain, noopChain];
        const auditCalls = [noopChain, failedLoginsChain, noopChain, selfAuditChain];

        (adminDb.collection as jest.Mock).mockImplementation((name: string) => {
            if (name === 'doctors') return doctorCalls[doctorIdx++] ?? noopChain;
            if (name === 'workers') return workerCalls[workerIdx++] ?? noopChain;
            if (name === 'blood_donors') return noopChain;
            if (name === 'audit_logs') return auditCalls[auditIdx++] ?? selfAuditChain;
            return noopChain;
        });

        (axios.post as jest.Mock).mockResolvedValue({
            data: { response: 'No issues' },
        });

        const req = {
            body: { query: 'Security check' },
            user: { adminId: 'admin_001' },
        } as any as Request;
        const res = mockRes();

        await analyzeSystem(req, res);

        const response = (res.json as jest.Mock).mock.calls[0][0];
        const patterns = response.security?.patterns ?? [];
        const hasFailedLoginPattern = patterns.some(
            (p: any) => p.type === 'Multiple Failed Logins'
        );
        expect(hasFailedLoginPattern).toBe(false);
    });

    it('returns admin context stats using snapshot.size for each collection', async () => {
        const noopChain = makeQueryChain({ size: 0, docs: [] });
        const selfAuditChain = { add: jest.fn().mockResolvedValue({ id: 'x' }) };

        const doctorCountChain = makeQueryChain({ size: 7, docs: [] });
        const workerCountChain = makeQueryChain({ size: 4, docs: [] });
        const donorCountChain = makeQueryChain({ size: 12, docs: [] });

        let doctorIdx = 0, workerIdx = 0, auditIdx = 0;
        const doctorCalls = [doctorCountChain, noopChain]; // first call for count, second for recent
        const workerCalls = [workerCountChain, noopChain, noopChain]; // first for count, rest for others
        const auditCalls = [noopChain, noopChain, noopChain, selfAuditChain];

        (adminDb.collection as jest.Mock).mockImplementation((name: string) => {
            if (name === 'doctors') return doctorCalls[doctorIdx++] ?? noopChain;
            if (name === 'workers') return workerCalls[workerIdx++] ?? noopChain;
            if (name === 'blood_donors') return donorCountChain;
            if (name === 'audit_logs') return auditCalls[auditIdx++] ?? selfAuditChain;
            return noopChain;
        });

        (axios.post as jest.Mock).mockResolvedValue({
            data: { response: 'Stats ready' },
        });

        const req = {
            body: { query: 'How many users?' },
            user: { adminId: 'admin_001' },
        } as any as Request;
        const res = mockRes();

        await analyzeSystem(req, res);

        const response = (res.json as jest.Mock).mock.calls[0][0];
        // contextUsed should contain the stats with size-based counts
        expect(response.contextUsed?.stats?.totalDoctors).toBe(7);
        expect(response.contextUsed?.stats?.totalWorkers).toBe(4);
        expect(response.contextUsed?.stats?.totalDonors).toBe(12);
    });

    it('falls back gracefully when ML server is unavailable', async () => {
        const noopChain = makeQueryChain({ size: 0, docs: [] });
        const selfAuditChain = { add: jest.fn().mockResolvedValue({ id: 'x' }) };

        let doctorIdx = 0, workerIdx = 0, auditIdx = 0;
        (adminDb.collection as jest.Mock).mockImplementation((name: string) => {
            if (name === 'doctors') return [noopChain, noopChain][doctorIdx++] ?? noopChain;
            if (name === 'workers') return [noopChain, noopChain, noopChain][workerIdx++] ?? noopChain;
            if (name === 'blood_donors') return noopChain;
            if (name === 'audit_logs') return [noopChain, noopChain, noopChain, selfAuditChain][auditIdx++] ?? selfAuditChain;
            return noopChain;
        });

        // Simulate ML server being down (axios.post rejects)
        (axios.post as jest.Mock).mockRejectedValue(new Error('ECONNREFUSED'));

        const req = {
            body: { query: 'Analyze' },
            user: { adminId: 'admin_001' },
        } as any as Request;
        const res = mockRes();

        await analyzeSystem(req, res);

        // Should still respond (with fallback message from .catch())
        expect(res.json).toHaveBeenCalled();
        const response = (res.json as jest.Mock).mock.calls[0][0];
        expect(response).toHaveProperty('analysis');
        expect(typeof response.analysis).toBe('string');
    });

    it('returns 500 when an unexpected top-level error occurs', async () => {
        // Force adminDb.collection to throw immediately
        (adminDb.collection as jest.Mock).mockImplementation(() => {
            throw new Error('Firebase not initialized');
        });

        const req = {
            body: { query: 'Check' },
            user: { adminId: 'admin_001' },
        } as any as Request;
        const res = mockRes();

        await analyzeSystem(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: 'Failed to analyze system data' })
        );
    });

    it('detects unusual hourly activity pattern (>20 actions by same user_type+action)', async () => {
        // Create 25 hourly log docs with the same user_type/action to trigger MEDIUM alert
        const heavyDocs = Array.from({ length: 25 }, () => ({
            data: () => ({
                user_type: 'DOCTOR',
                action: 'VIEW_RECORD',
                timestamp: { toDate: () => new Date() },
            }),
        }));

        const noopChain = makeQueryChain({ size: 0, docs: [] });
        const selfAuditChain = { add: jest.fn().mockResolvedValue({ id: 'x' }) };
        const hourlyChain = makeQueryChain({ size: 25, docs: heavyDocs });

        let doctorIdx = 0, workerIdx = 0, auditIdx = 0;
        const doctorCalls = [noopChain, noopChain];
        const workerCalls = [noopChain, noopChain, noopChain];
        // Order: recentLogs (24h), failedLogins (1h count), hourly (1h full), selfAudit
        const auditCalls = [noopChain, noopChain, hourlyChain, selfAuditChain];

        (adminDb.collection as jest.Mock).mockImplementation((name: string) => {
            if (name === 'doctors') return doctorCalls[doctorIdx++] ?? noopChain;
            if (name === 'workers') return workerCalls[workerIdx++] ?? noopChain;
            if (name === 'blood_donors') return noopChain;
            if (name === 'audit_logs') return auditCalls[auditIdx++] ?? selfAuditChain;
            return noopChain;
        });

        (axios.post as jest.Mock).mockResolvedValue({
            data: { response: 'Activity analyzed' },
        });

        const req = {
            body: { query: 'Activity check' },
            user: { adminId: 'admin_001' },
        } as any as Request;
        const res = mockRes();

        await analyzeSystem(req, res);

        const response = (res.json as jest.Mock).mock.calls[0][0];
        const patterns = response.security?.patterns ?? [];
        const hasActivityPattern = patterns.some(
            (p: any) => p.type === 'Unusual Activity Pattern' && p.severity === 'MEDIUM'
        );
        expect(hasActivityPattern).toBe(true);
    });
});