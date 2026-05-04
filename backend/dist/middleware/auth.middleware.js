"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.requireAdminOrDoctor = exports.requireDoctor = exports.requireAdmin = exports.requireRole = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
/**
 * Enhanced authentication middleware that handles multiple token types
 * Supports: Admin tokens, Doctor tokens, and standard JWT tokens
 */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    try {
        const secret = process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod';
        const decoded = jsonwebtoken_1.default.verify(token, secret);
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
    }
    catch (err) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};
exports.authenticateToken = authenticateToken;
/**
 * Require specific role (with SUPER_ADMIN bypass)
 */
const requireRole = (role) => {
    return (req, res, next) => {
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
exports.requireRole = requireRole;
/**
 * Require admin role (SUPER_ADMIN, HOSPITAL_ADMIN, etc.)
 */
const requireAdmin = () => {
    return (req, res, next) => {
        var _a;
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        // Check if user is any type of admin (case insensitive)
        const role = ((_a = req.user.role) === null || _a === void 0 ? void 0 : _a.toUpperCase()) || '';
        if (role.includes('ADMIN') || role === 'SUPER_ADMIN') {
            return next();
        }
        return res.status(403).json({ error: 'Admin access required' });
    };
};
exports.requireAdmin = requireAdmin;
/**
 * Require doctor role (doctors or SUPER_ADMIN)
 */
const requireDoctor = () => {
    return (req, res, next) => {
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
exports.requireDoctor = requireDoctor;
/**
 * Require admin OR doctor role
 */
const requireAdminOrDoctor = () => {
    return (req, res, next) => {
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
exports.requireAdminOrDoctor = requireAdminOrDoctor;
/**
 * Optional authentication - adds user to req if token present, but doesn't require it
 */
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
        try {
            const secret = process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod';
            const decoded = jsonwebtoken_1.default.verify(token, secret);
            req.user = {
                id: decoded.adminId || decoded.doctorId || decoded.userId || decoded.id,
                role: decoded.role,
                adminId: decoded.adminId,
                doctorId: decoded.doctorId,
                userId: decoded.userId || decoded.id,
                email: decoded.email
            };
        }
        catch (err) {
            // Invalid token, but continue without user
            req.user = undefined;
        }
    }
    next();
};
exports.optionalAuth = optionalAuth;
