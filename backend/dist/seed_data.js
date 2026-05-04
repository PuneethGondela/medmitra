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
const seed = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('Seeding demo data to Firestore...');
        // 1. Seed Doctors
        const password = 'Doctor@123';
        const hashedPassword = yield bcrypt_1.default.hash(password, 10);
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
            const docRef = firebase_1.adminDb.collection(firebase_1.COLLECTIONS.DOCTORS).doc(doc.doctor_id);
            yield docRef.set(Object.assign(Object.assign({}, doc), { password_hash: hashedPassword, account_status: 'ACTIVE', created_at: firestore_1.FieldValue.serverTimestamp(), updated_at: firestore_1.FieldValue.serverTimestamp() }));
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
            const workerRef = firebase_1.adminDb.collection(firebase_1.COLLECTIONS.WORKERS).doc(worker.worker_id);
            yield workerRef.set(Object.assign(Object.assign({}, worker), { joined_at: firestore_1.FieldValue.serverTimestamp() }));
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
    }
    catch (err) {
        console.error('Error seeding data:', err);
        process.exit(1);
    }
});
seed();
