import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthRequest extends Request {
    user?: any;
}

/**
 * Enhanced authentication middleware that handles multiple token types
 * Supports: Admin tokens, Doctor tokens, and standard JWT tokens
 */
export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    try {
        const secret = process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod';
        const decoded: any = jwt.verify(token, secret);

        // Normalize user object based on token type
        req.user = {
            id: decoded.adminId || decoded.doctorId || decoded.userId || decoded.id,
            role: decoded.role,
            adminId: decoded.adminId,
            doctorId: decoded.doctorId,
            userId: decoded.userId || decoded.id,
            email: decoded.email
        };

        next();
    } catch (err) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};

/**
 * Require specific role (with SUPER_ADMIN bypass)
 */
export const requireRole = (role: string) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // SUPER_ADMIN can access everything
        if (req.user.role === 'SUPER_ADMIN') {
            return next();
        }

        // Check exact role match
        if (req.user.role === role) {
            return next();
        }

        return res.status(403).json({ error: 'Insufficient permissions' });
    };
};

/**
 * Require admin role (SUPER_ADMIN, HOSPITAL_ADMIN, etc.)
 */
export const requireAdmin = () => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Check if user is any type of admin (case insensitive)
        const role = req.user.role?.toUpperCase() || '';
        if (role.includes('ADMIN') || role === 'SUPER_ADMIN') {
            return next();
        }

        return res.status(403).json({ error: 'Admin access required' });
    };
};

/**
 * Require doctor role (doctors or SUPER_ADMIN)
 */
export const requireDoctor = () => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // SUPER_ADMIN can access doctor endpoints
        if (req.user.role === 'SUPER_ADMIN') {
            return next();
        }

        // Check if user is a doctor
        if (req.user.role === 'doctor' || req.user.doctorId) {
            return next();
        }

        return res.status(403).json({ error: 'Doctor access required' });
    };
};

/**
 * Require admin OR doctor role
 */
export const requireAdminOrDoctor = () => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // SUPER_ADMIN can access everything
        if (req.user.role === 'SUPER_ADMIN') {
            return next();
        }

        // Check if user is admin or doctor
        const isAdmin = req.user.role && req.user.role.includes('ADMIN');
        const isDoctor = req.user.role === 'doctor' || req.user.doctorId;

        if (isAdmin || isDoctor) {
            return next();
        }

        return res.status(403).json({ error: 'Admin or Doctor access required' });
    };
};

/**
 * Optional authentication - adds user to req if token present, but doesn't require it
 */
export const optionalAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
        try {
            const secret = process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod';
            const decoded: any = jwt.verify(token, secret);

            req.user = {
                id: decoded.adminId || decoded.doctorId || decoded.userId || decoded.id,
                role: decoded.role,
                adminId: decoded.adminId,
                doctorId: decoded.doctorId,
                userId: decoded.userId || decoded.id,
                email: decoded.email
            };
        } catch (err) {
            // Invalid token, but continue without user
            req.user = undefined;
        }
    }

    next();
};
