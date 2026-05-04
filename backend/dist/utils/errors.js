"use strict";
/**
 * Error handling utilities
 * Provides standardized error responses
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.handleError = exports.AppError = void 0;
class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
const handleError = (err, res) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal server error';
    console.error('Error:', {
        message: err.message,
        stack: err.stack,
        statusCode,
    });
    res.status(statusCode).json(Object.assign({ error: message }, (process.env.NODE_ENV === 'development' && { stack: err.stack })));
};
exports.handleError = handleError;
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
