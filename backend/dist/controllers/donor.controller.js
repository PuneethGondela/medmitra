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
exports.createDonor = exports.getAllDonors = void 0;
const firebase_1 = require("../config/firebase");
const firestore_1 = require("firebase-admin/firestore");
const getAllDonors = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { bloodGroup, city } = req.query;
        let query = firebase_1.adminDb.collection(firebase_1.COLLECTIONS.BLOOD_DONORS);
        // Note: Firestore doesn't support multiple where clauses easily,
        // so we'll filter client-side if both filters are provided
        if (bloodGroup && city) {
            const snapshot = yield query
                .where('blood_group', '==', bloodGroup)
                .where('status', '==', 'AVAILABLE')
                .orderBy('registered_at', 'desc')
                .get();
            // Filter by city client-side
            const donors = snapshot.docs
                .map(doc => (Object.assign({ id: doc.id }, doc.data())))
                .filter(donor => {
                const donorCity = (donor.city || "").toLowerCase();
                return donorCity.includes(String(city).toLowerCase());
            });
            return res.json(donors);
        }
        else if (bloodGroup) {
            const snapshot = yield query
                .where('blood_group', '==', bloodGroup)
                .where('status', '==', 'AVAILABLE')
                .orderBy('registered_at', 'desc')
                .get();
            const donors = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
            return res.json(donors);
        }
        else if (city) {
            const snapshot = yield query
                .where('status', '==', 'AVAILABLE')
                .orderBy('registered_at', 'desc')
                .get();
            // Filter by city client-side
            const donors = snapshot.docs
                .map(doc => (Object.assign({ id: doc.id }, doc.data())))
                .filter(donor => {
                const donorCity = (donor.city || "").toLowerCase();
                return donorCity.includes(String(city).toLowerCase());
            });
            return res.json(donors);
        }
        else {
            // No filters
            const snapshot = yield query
                .where('status', '==', 'AVAILABLE')
                .orderBy('registered_at', 'desc')
                .get();
            const donors = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
            return res.json(donors);
        }
    }
    catch (error) {
        console.error('Get all donors error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});
exports.getAllDonors = getAllDonors;
const createDonor = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { fullName, bloodGroup, mobileNumber, age, gender, city } = req.body;
        if (!fullName || !bloodGroup || !mobileNumber) {
            return res.status(400).json({ error: 'Full name, blood group, and mobile number are required' });
        }
        // Check if donor with this mobile already exists
        const existing = yield firebase_1.adminDb.collection(firebase_1.COLLECTIONS.BLOOD_DONORS)
            .where('mobile_number', '==', mobileNumber)
            .limit(1)
            .get();
        if (!existing.empty) {
            return res.status(400).json({ error: 'Donor with this mobile number already exists' });
        }
        const donorData = {
            full_name: fullName,
            blood_group: bloodGroup,
            mobile_number: mobileNumber,
            age: age || null,
            gender: gender || null,
            city: city || null,
            status: 'AVAILABLE',
            registered_at: firestore_1.FieldValue.serverTimestamp()
        };
        const donorRef = yield firebase_1.adminDb.collection(firebase_1.COLLECTIONS.BLOOD_DONORS).add(donorData);
        // Audit Log
        const adminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.adminId;
        if (adminId) {
            yield firebase_1.adminDb.collection(firebase_1.COLLECTIONS.AUDIT_LOGS).add({
                user_id: adminId,
                user_type: 'ADMIN',
                action: 'CREATE_DONOR',
                resource: 'donors',
                resource_id: donorRef.id,
                details: { fullName, bloodGroup },
                timestamp: firestore_1.FieldValue.serverTimestamp()
            });
        }
        res.status(201).json({ message: 'Donor registered successfully', id: donorRef.id });
    }
    catch (error) {
        console.error('Create donor error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});
exports.createDonor = createDonor;
