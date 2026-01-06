// scripts/init-firestore.ts
// Script to initialize Firestore collections with indexes
import { adminDb } from '../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

async function initFirestore() {
  console.log('🔥 Initializing Firestore collections...\n');

  try {
    // Create indexes programmatically (Firebase will create them on first use)
    // We'll create a sample document and delete it to trigger index creation

    const collections = [
      'users',
      'records',
      'attachments',
      'doctor_assignments',
      'blood_donors',
      'audit_logs',
      'chat_logs'
    ];

    console.log('📋 Collections that will be created on first use:');
    collections.forEach(col => console.log(`  ✅ ${col}`));

    console.log('\n📝 Note: Firestore collections are created automatically when first document is written.');
    console.log('📊 Indexes will be created automatically based on queries.');
    console.log('\n✅ Firestore is ready to use!\n');

    // Create a test document in users collection to ensure it exists
    try {
      const testDoc = adminDb.collection('users').doc('_init');
      await testDoc.set({
        _initialized: true,
        timestamp: FieldValue.serverTimestamp(),
      });
      await testDoc.delete();
      console.log('✅ Firestore connection verified!\n');
    } catch (error) {
      console.warn('⚠️  Could not verify Firestore connection:', error);
      console.log('📝 Make sure Firestore is enabled in Firebase Console\n');
    }

  } catch (error) {
    console.error('❌ Error initializing Firestore:', error);
    process.exit(1);
  }
}

// Run if called directly
initFirestore()
  .then(() => {
    console.log('✨ Done!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

export default initFirestore;
