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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const firebase_1 = require("./config/firebase");
const bcrypt_1 = __importDefault(require("bcrypt"));
const firestore_1 = require("firebase-admin/firestore");
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
const seedAdmin = () => __awaiter(void 0, void 0, void 0, function* () {
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
        const salt = yield bcrypt_1.default.genSalt(10);
        const hash = yield bcrypt_1.default.hash(password, salt);
        // Check if admin exists (by email or mobile)
        const [emailCheck, mobileCheck] = yield Promise.all([
            firebase_1.adminDb.collection(firebase_1.COLLECTIONS.ADMINS).where('email', '==', email).limit(1).get(),
            firebase_1.adminDb.collection(firebase_1.COLLECTIONS.ADMINS).where('mobile_number', '==', mobile_number).limit(1).get()
        ]);
        const existingDoc = emailCheck.docs[0] || mobileCheck.docs[0];
        if (existingDoc) {
            // Update existing
            yield existingDoc.ref.update({
                email,
                mobile_number,
                password_hash: hash,
                role: 'SUPER_ADMIN',
                updated_at: firestore_1.FieldValue.serverTimestamp()
            });
            console.log('✅ Existing admin updated successfully!');
        }
        else {
            // Insert new
            yield firebase_1.adminDb.collection(firebase_1.COLLECTIONS.ADMINS).add({
                email,
                mobile_number,
                password_hash: hash,
                role: 'admin',
                created_at: firestore_1.FieldValue.serverTimestamp(),
                updated_at: firestore_1.FieldValue.serverTimestamp()
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
    }
    catch (err) {
        console.error('\n❌ Error seeding admin:', err.message);
        console.error('\nTroubleshooting:');
        console.error('1. Ensure Firebase service account is configured');
        console.error('2. Check Firebase Admin SDK initialization');
        console.error('3. Verify Firestore permissions\n');
        process.exit(1);
    }
});
seedAdmin();
