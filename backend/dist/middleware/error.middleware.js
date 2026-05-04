"use strict";
/**
 * Error handling middleware
 * Catches all errors and sends standardized responses
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = exports.errorHandler = void 0;
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const errorHandler = (err, req, res, next) => {
    // Log error
    logger_1.logger.error('Error occurred:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
    });
    // Handle known errors
    if (err instanceof errors_1.AppError) {
        return (0, errors_1.handleError)(err, res);
    }
    // Handle Firestore errors
    if (err.code === 'not-found') {
        return res.status(404).json({ error: 'Resource not found' });
    }
    // Handle validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({ error: err.message });
    }
    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid token' });
    }
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
    }
    // Default error
    (0, errors_1.handleError)(err, res);
};
exports.errorHandler = errorHandler;
// 404 handler
const notFoundHandler = (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
};
exports.notFoundHandler = notFoundHandler;
