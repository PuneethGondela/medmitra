"use strict";
/**
 * Logging utility
 * Provides structured logging
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.logger = {
    info: (message, data) => {
        console.log(`[INFO] ${new Date().toISOString()} - ${message}`, data || '');
    },
    error: (message, error) => {
        console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error || '');
    },
    warn: (message, data) => {
        console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, data || '');
    },
    debug: (message, data) => {
        if (process.env.NODE_ENV === 'development') {
            console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, data || '');
        }
    },
};
