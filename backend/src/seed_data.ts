import { adminDb, COLLECTIONS } from './config/firebase';
import bcrypt from 'bcrypt';
import { FieldValue } from 'firebase-admin/firestore';

const seed = async () => {
    try {
        console.log('Seeding demo data to Firestore...');

        // 1. Seed Doctors
        const password = 'Doctor@123';
        const hashedPassword = await bcrypt.hash(password, 10);

        const doctors = [
            {
                doctor_id: 'DOC_001',
                full_name: 'Dr. Priya Sharma',
                email: 'priya.sharma@example.com',
                mobile_number: '9876543210',
                medical_license: 'LIC-1001',
                specialization: 'Cardiology',
                hospital_name: 'City General',
                hospital_id: 'HOSP-1',
                login_username: 'dr.priya',
                role: 'doctor',
                permissions: {
                    canAddVisits: true,
                    canEditOwnVisits: true,
                    canDeleteVisits: false,
                    canViewAllWorkers: false
                }
            },
            {
                doctor_id: 'DOC_002',
                full_name: 'Dr. Rahul Verma',
                email: 'rahul.verma@example.com',
                mobile_number: '9876543211',
                medical_license: 'LIC-1002',
                specialization: 'Neurosurgery',
                hospital_name: 'Apollo',
                hospital_id: 'HOSP-2',
                login_username: 'dr.rahul',
                role: 'doctor',
                permissions: {
                    canAddVisits: true,
                    canEditOwnVisits: true,
                    canDeleteVisits: false,
                    canViewAllWorkers: false
                }
            },
            {
                doctor_id: 'DOC_003',
                full_name: 'Dr. Anjali Gupta',
                email: 'anjali.gupta@example.com',
                mobile_number: '9876543212',
                medical_license: 'LIC-1003',
                specialization: 'Pediatrics',
                hospital_name: 'Fortis',
                hospital_id: 'HOSP-3',
                login_username: 'dr.anjali',
                role: 'doctor',
                permissions: {
                    canAddVisits: true,
                    canEditOwnVisits: true,
                    canDeleteVisits: false,
                    canViewAllWorkers: false
                }
            }
        ];

        console.log('Seeding doctors...');
        for (const doc of doctors) {
            const docRef = adminDb.collection(COLLECTIONS.DOCTORS).doc(doc.doctor_id);
            await docRef.set({
                ...doc,
                password_hash: hashedPassword,
                account_status: 'ACTIVE',
                created_at: FieldValue.serverTimestamp(),
                updated_at: FieldValue.serverTimestamp()
            });
            console.log(`✅ Seeded doctor: ${doc.full_name}`);
        }

        // 2. Seed Workers
        const workers = [
            {
                worker_id: 'WRK_001',
                full_name: 'Sita Devi',
                mobile_number: '9988776655',
                email: 'sita@example.com',
                assigned_village: 'Rampur',
                status: 'ACTIVE',
                role: 'worker'
            },
            {
                worker_id: 'WRK_002',
                full_name: 'Gita Ben',
                mobile_number: '9988776656',
                email: 'gita@example.com',
                assigned_village: 'Shyamnagar',
                status: 'ACTIVE',
                role: 'worker'
            },
            {
                worker_id: 'WRK_003',
                full_name: 'Ramesh Kumar',
                mobile_number: '9988776657',
                email: 'ramesh@example.com',
                assigned_village: 'Laldora',
                status: 'ACTIVE',
                role: 'worker'
            }
        ];

        console.log('Seeding workers...');
        for (const worker of workers) {
            const workerRef = adminDb.collection(COLLECTIONS.WORKERS).doc(worker.worker_id);
            await workerRef.set({
                ...worker,
                joined_at: FieldValue.serverTimestamp()
            });
            console.log(`✅ Seeded worker: ${worker.full_name}`);
        }

        console.log('\n' + '='.repeat(60));
        console.log('✨ Seed data successfully written to Firestore!');
        console.log('='.repeat(60));
        console.log('\n📝 Doctor Login Credentials:');
        console.log(`   Email: priya.sharma@example.com`);
        console.log(`   Password: ${password}`);
        console.log('\n🌐 Login at: http://localhost:3000/login\n');

        process.exit(0);
    } catch (err: any) {
        console.error('Error seeding data:', err);
        process.exit(1);
    }
};

seed();
