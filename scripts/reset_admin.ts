import { adminAuth } from '../backend/src/lib/firebase-admin';

async function resetAdminPassword() {
    const email = 'admin@medimitra.in';
    const newPassword = 'MedmitraAdmin2026!';

    try {
        console.log(`Looking up user with email: ${email}`);
        const userRecord = await adminAuth.getUserByEmail(email);

        console.log(`User found (UID: ${userRecord.uid}). Updating password...`);
        await adminAuth.updateUser(userRecord.uid, {
            password: newPassword
        });

        console.log(`\n✅ Success! Password for ${email} has been updated.`);
        console.log(`New Password: ${newPassword}`);
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            console.error(`❌ Error: User with email ${email} does not exist in Firebase Auth.`);
        } else {
            console.error(`❌ Error updating password:`, error.message || error);
        }
    }
}

resetAdminPassword().then(() => process.exit(0)).catch(() => process.exit(1));
