import { Request, Response } from 'express';
import { adminDb, COLLECTIONS } from '../config/firebase';
import { FieldValue } from 'firebase-admin/firestore';

export const getAllDonors = async (req: Request, res: Response) => {
    try {
        const { bloodGroup, city } = req.query;
        let query = adminDb.collection(COLLECTIONS.BLOOD_DONORS);

        // Note: Firestore doesn't support multiple where clauses easily,
        // so we'll filter client-side if both filters are provided
        if (bloodGroup && city) {
            const snapshot = await query
                .where('blood_group', '==', bloodGroup)
                .where('status', '==', 'AVAILABLE')
                .orderBy('registered_at', 'desc')
                .get();

            // Filter by city client-side
            const donors = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(donor => {
                    const donorCity = (donor.city || '').toLowerCase();
                    return donorCity.includes(String(city).toLowerCase());
                });

            return res.json(donors);
        } else if (bloodGroup) {
            const snapshot = await query
                .where('blood_group', '==', bloodGroup)
                .where('status', '==', 'AVAILABLE')
                .orderBy('registered_at', 'desc')
                .get();

            const donors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return res.json(donors);
        } else if (city) {
            const snapshot = await query
                .where('status', '==', 'AVAILABLE')
                .orderBy('registered_at', 'desc')
                .get();

            // Filter by city client-side
            const donors = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(donor => {
                    const donorCity = (donor.city || '').toLowerCase();
                    return donorCity.includes(String(city).toLowerCase());
                });

            return res.json(donors);
        } else {
            // No filters
            const snapshot = await query
                .where('status', '==', 'AVAILABLE')
                .orderBy('registered_at', 'desc')
                .get();

            const donors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return res.json(donors);
        }
    } catch (error: any) {
        console.error('Get all donors error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

export const createDonor = async (req: Request, res: Response) => {
    try {
        const { fullName, bloodGroup, mobileNumber, age, gender, city } = req.body;

        if (!fullName || !bloodGroup || !mobileNumber) {
            return res.status(400).json({ error: 'Full name, blood group, and mobile number are required' });
        }

        // Check if donor with this mobile already exists
        const existing = await adminDb.collection(COLLECTIONS.BLOOD_DONORS)
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
            registered_at: FieldValue.serverTimestamp()
        };

        const donorRef = await adminDb.collection(COLLECTIONS.BLOOD_DONORS).add(donorData);

        // Audit Log
        const adminId = req.user?.adminId;
        if (adminId) {
            await adminDb.collection(COLLECTIONS.AUDIT_LOGS).add({
                user_id: adminId,
                user_type: 'ADMIN',
                action: 'CREATE_DONOR',
                resource: 'donors',
                resource_id: donorRef.id,
                details: { fullName, bloodGroup },
                timestamp: FieldValue.serverTimestamp()
            });
        }

        res.status(201).json({ message: 'Donor registered successfully', id: donorRef.id });
    } catch (error: any) {
        console.error('Create donor error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};
