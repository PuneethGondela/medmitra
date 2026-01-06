import { adminDb, COLLECTIONS } from './config/firebase';
import bcrypt from 'bcrypt';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Seed Default Admin Account
 * 
 * Creates or updates the default admin account:
 * Email: admin@medimitra.in
 * Password: admin&125
 * Role: SUPER_ADMIN
 * 
 * Usage:
 *   cd backend
 *   ts-node src/seed_admin.ts
 */
const seedAdmin = async () => {
    const email = 'admin@medimitra.in';
    const mobile_number = '9876543210';
    const password = 'admin&125';

    try {
        console.log('='.repeat(60));
        console.log('Med Mitra - Admin Account Seeding');
        console.log('='.repeat(60));
        console.log(`\n📧 Email: ${email}`);
        console.log(`📱 Mobile: ${mobile_number}`);
        console.log(`🔐 Password: ${password}`);
        console.log(`👤 Role: admin`);
        console.log(`\n💡 You can login with either email OR mobile number!\n`);

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        // Check if admin exists (by email or mobile)
        const [emailCheck, mobileCheck] = await Promise.all([
            adminDb.collection(COLLECTIONS.ADMINS).where('email', '==', email).limit(1).get(),
            adminDb.collection(COLLECTIONS.ADMINS).where('mobile_number', '==', mobile_number).limit(1).get()
        ]);

        const existingDoc = emailCheck.docs[0] || mobileCheck.docs[0];

        if (existingDoc) {
            // Update existing
            await existingDoc.ref.update({
                email,
                mobile_number,
                password_hash: hash,
                role: 'SUPER_ADMIN',
                updated_at: FieldValue.serverTimestamp()
            });
            console.log('✅ Existing admin updated successfully!');
        } else {
            // Insert new
            await adminDb.collection(COLLECTIONS.ADMINS).add({
                email,
                mobile_number,
                password_hash: hash,
                role: 'admin',
                created_at: FieldValue.serverTimestamp(),
                updated_at: FieldValue.serverTimestamp()
            });
            console.log('✅ New admin user created successfully!');
        }

        console.log('\n' + '='.repeat(60));
        console.log('✨ Admin account ready!');
        console.log('='.repeat(60));
        console.log('\n📝 Login Credentials:');
        console.log(`   Email: ${email}`);
        console.log(`   Mobile: ${mobile_number}`);
        console.log(`   Password: ${password}`);
        console.log('\n🌐 Login at: http://localhost:3000/login');
        console.log('   or: http://localhost:3000/admin/login\n');

        process.exit(0);
    } catch (err: any) {
        console.error('\n❌ Error seeding admin:', err.message);
        console.error('\nTroubleshooting:');
        console.error('1. Ensure Firebase service account is configured');
        console.error('2. Check Firebase Admin SDK initialization');
        console.error('3. Verify Firestore permissions\n');
        process.exit(1);
    }
};

seedAdmin();
