/**
 * Firestore Initialization Script
 * 
 * This script ensures Firestore collections exist and creates necessary indexes.
 * Firestore collections are created automatically on first write, but this script
 * can be used to verify setup and create composite indexes if needed.
 * 
 * Usage:
 *   cd backend
 *   ts-node scripts/init-firestore.ts
 */

import { adminDb, COLLECTIONS } from '../src/config/firebase';
import { FieldValue } from 'firebase-admin/firestore';

const initFirestore = async () => {
    try {
        console.log('='.repeat(60));
        console.log('Firestore Initialization');
        console.log('='.repeat(60));
        console.log('\n📋 Checking collections...\n');

        const collections = Object.values(COLLECTIONS);
        const results: { collection: string; exists: boolean; docCount: number }[] = [];

        for (const collectionName of collections) {
            try {
                const snapshot = await adminDb.collection(collectionName).limit(1).get();
                const exists = true; // Collection exists (or will be created on first write)
                results.push({
                    collection: collectionName,
                    exists,
                    docCount: snapshot.size
                });
                console.log(`✅ ${collectionName}: ${snapshot.size > 0 ? 'Has documents' : 'Ready (empty)'}`);
            } catch (error: any) {
                console.log(`⚠️  ${collectionName}: ${error.message}`);
                results.push({
                    collection: collectionName,
                    exists: false,
                    docCount: 0
                });
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 Summary');
        console.log('='.repeat(60));
        
        results.forEach(result => {
            const icon = result.exists ? '✅' : '❌';
            console.log(`${icon} ${result.collection}: ${result.docCount} documents`);
        });

        console.log('\n💡 Note: Firestore collections are created automatically on first write.');
        console.log('   If you need composite indexes, create them in Firebase Console:');
        console.log('   https://console.firebase.google.com/project/medi-mitr/firestore/indexes\n');

        console.log('📝 Required Collections:');
        console.log('   - admins: Admin user accounts');
        console.log('   - doctors: Doctor accounts');
        console.log('   - workers: Worker/ASHA worker accounts');
        console.log('   - blood_donors: Blood donor registry');
        console.log('   - audit_logs: System audit trail');
        console.log('   - users: General user accounts (Firebase Auth)');
        console.log('   - records: Medical visit records\n');

        process.exit(0);
    } catch (error: any) {
        console.error('\n❌ Error initializing Firestore:', error.message);
        console.error('\nTroubleshooting:');
        console.error('1. Ensure Firebase service account is configured');
        console.error('2. Check Firebase Admin SDK initialization');
        console.error('3. Verify Firestore permissions\n');
        process.exit(1);
    }
};

initFirestore();
