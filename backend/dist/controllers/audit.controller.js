"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditLogs = void 0;
const firebase_1 = require("../config/firebase");
const getAuditLogs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const snapshot = yield firebase_1.adminDb.collection('audit_logs') // Using direct name in case COLLECTIONS missing
            .orderBy('timestamp', 'desc')
            .limit(50)
            .get();
        const logs = yield Promise.all(snapshot.docs.map((doc) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            const data = doc.data();
            let actorName = 'Unknown';
            // Try to resolve actor name
            try {
                if (data.user_type === 'ADMIN' && data.user_id) {
                    // Start simplified - fetching names could be expensive in loop
                    // For now, return basic info needed for frontend
                }
            }
            catch (e) {
                // ignore
            }
            return Object.assign(Object.assign({ id: doc.id }, data), { created_at: ((_a = data.timestamp) === null || _a === void 0 ? void 0 : _a.toDate()) || new Date().toISOString() });
        })));
        res.json(logs);
    }
    catch (error) {
        console.error('Get audit logs error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});
exports.getAuditLogs = getAuditLogs;
