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
const seedAdmin = () => __awaiter(void 0, void 0, void 0, function* () {
    const email = 'admin@medimitr.com';
    const password = 'admin123';
    try {
        console.log(`Seeding admin user: ${email}`);
        // Hash password
        const salt = yield bcrypt_1.default.genSalt(10);
        const hash = yield bcrypt_1.default.hash(password, salt);
        // Check if admin exists
        const result = yield db_1.default.query('SELECT * FROM admins WHERE email = $1', [email]);
        if (result.rows.length > 0) {
            // Update existing
            yield db_1.default.query('UPDATE admins SET password_hash = $1 WHERE email = $2', [hash, email]);
            console.log('Existing admin password updated.');
        }
        else {
            // Insert new
            yield db_1.default.query('INSERT INTO admins (email, password_hash, role) VALUES ($1, $2, $3)', [email, hash, 'SUPER_ADMIN']);
            console.log('New admin user created.');
        }
        process.exit(0);
    }
    catch (err) {
        console.error('Error seeding admin:', err);
        process.exit(1);
    }
});
seedAdmin();
