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
const db_1 = __importDefault(require("./config/db"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const reset = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const password = 'Doctor@123';
        const hash = yield bcrypt_1.default.hash(password, 10);
        // Update if exists, or insert if not (covering all bases)
        const res = yield db_1.default.query(`
            INSERT INTO doctors (doctor_id, full_name, email, mobile_number, medical_license, specialization, hospital_name, hospital_id, login_username, password_hash, account_status)
            VALUES ('DOC_FORCE_RECOVERY', 'Recovery Doc', 'doctor@gmail.com', '9999999999', 'LIC-REC', 'General', 'General Hosp', 'HOSP-GEN', 'recovery.doc', $1, 'ACTIVE')
            ON CONFLICT (email)
            DO UPDATE SET password_hash = $1, account_status = 'ACTIVE';
        `, [hash]);
        console.log('Password for doctor@gmail.com reset to Doctor@123');
        process.exit(0);
    }
    catch (err) {
        console.error(err);
        process.exit(1);
    }
});
reset();
