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
exports.searchWorkers = exports.getWorkerById = exports.getAllWorkers = void 0;
const firebase_1 = require("../config/firebase");
// Get all workers (Read-Only)
const getAllWorkers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const snapshot = yield firebase_1.adminDb.collection(firebase_1.COLLECTIONS.WORKERS)
            // .where('role', '==', 'worker') // Not needed if in workers collection, unless mixed
            .orderBy('created_at', 'desc')
            .get();
        const workers = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        res.json(workers);
    }
    catch (error) {
        console.error('Get all workers error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});
exports.getAllWorkers = getAllWorkers;
// Get single worker
const getWorkerById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const workerDoc = yield firebase_1.adminDb.collection(firebase_1.COLLECTIONS.WORKERS).doc(id).get();
        if (!workerDoc.exists) {
            return res.status(404).json({ error: 'Worker not found' });
        }
        res.json(Object.assign({ id: workerDoc.id }, workerDoc.data()));
    }
    catch (error) {
        console.error('Get worker by ID error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});
exports.getWorkerById = getWorkerById;
// Search workers
const searchWorkers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { q } = req.query;
        if (!q) {
            return (0, exports.getAllWorkers)(req, res);
        }
        const queryText = q.toLowerCase();
        const snapshot = yield firebase_1.adminDb.collection(firebase_1.COLLECTIONS.WORKERS)
            // .where('role', '==', 'worker')
            .get();
        // Filter in memory (Firestore doesn't support ILIKE, so we filter client-side)
        const workers = snapshot.docs
            .map(doc => {
            const data = doc.data();
            return Object.assign({ id: doc.id }, data);
        })
            .filter((w) => (w.full_name && w.full_name.toLowerCase().includes(queryText)) ||
            (w.mobile_number && w.mobile_number.includes(queryText)) ||
            (w.email && w.email.toLowerCase().includes(queryText)) ||
            (w.assigned_village && w.assigned_village.toLowerCase().includes(queryText)));
        res.json(workers);
    }
    catch (error) {
        console.error('Search workers error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});
exports.searchWorkers = searchWorkers;
