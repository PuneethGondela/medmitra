import { adminAuth, adminDb } from '../lib/firebase-admin';

async function seedUsers() {
  const users = [
    { email: 'admin@test.com', password: 'password123', name: 'Test Admin', role: 'admin' },
    { email: 'doctor@test.com', password: 'password123', name: 'Test Doctor', role: 'doctor' },
    { email: 'worker@test.com', password: 'password123', name: 'Test Worker', role: 'worker', phone: '1234567890' }
  ];

  for (const u of users) {
    try {
      let uid;
      try {
        const existing = await adminAuth.getUserByEmail(u.email);
        uid = existing.uid;
        console.log(`User ${u.email} already exists.`);
        await adminAuth.updateUser(uid, { password: u.password });
      } catch (e: any) {
        if (e.code === 'auth/user-not-found') {
          const userRecord = await adminAuth.createUser({
            email: u.email,
            password: u.password,
            displayName: u.name,
          });
          uid = userRecord.uid;
          console.log(`Created user ${u.email}`);
        } else {
          throw e;
        }
      }

      await adminDb.collection('users').doc(uid).set({
        email: u.email,
        name: u.name,
        role: u.role,
        ...(u.phone ? { phone: u.phone } : {}),
        created_at: new Date().toISOString(),
      }, { merge: true });

      console.log(`Updated Firestore for ${u.email} with role ${u.role}`);
    } catch (error) {
      console.error(`Error seeding ${u.email}:`, error);
    }
  }
}

seedUsers().then(() => {
  console.log('Seeding complete');
  process.exit(0);
}).catch(console.error);
