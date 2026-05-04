"use strict";
/**
 * Migration Script: Add mobile_number column to admins table
 *
 * Run this to update existing database:
 *   cd backend
 *   npx ts-node src/db/add_mobile_column.ts
 */
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
const db_1 = __importDefault(require("../config/db"));
function addMobileColumn() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('🔧 Adding mobile_number column to admins table...\n');
            // Check if column exists
            const checkColumn = yield db_1.default.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'admins' AND column_name = 'mobile_number'
        `);
            if (checkColumn.rows.length > 0) {
                console.log('✅ mobile_number column already exists\n');
                // Update existing admin if needed
                const updateResult = yield db_1.default.query(`
                UPDATE admins
                SET mobile_number = '9876543210'
                WHERE email = 'admin@medimitra.in' AND (mobile_number IS NULL OR mobile_number = '')
                RETURNING admin_id
            `);
                if (updateResult.rows.length > 0) {
                    console.log('✅ Updated existing admin with mobile number: 9876543210\n');
                }
                process.exit(0);
                return;
            }
            // Add column
            yield db_1.default.query(`
            ALTER TABLE admins
            ADD COLUMN mobile_number VARCHAR(20) UNIQUE
        `);
            // Make email nullable
            yield db_1.default.query(`
            ALTER TABLE admins
            ALTER COLUMN email DROP NOT NULL
        `);
            // Add constraint
            yield db_1.default.query(`
            ALTER TABLE admins
            ADD CONSTRAINT admins_identifier_check
            CHECK (email IS NOT NULL OR mobile_number IS NOT NULL)
        `);
            // Create index
            yield db_1.default.query(`
            CREATE INDEX IF NOT EXISTS idx_admins_mobile
            ON admins(mobile_number)
            WHERE mobile_number IS NOT NULL
        `);
            console.log('✅ mobile_number column added successfully!\n');
            // Update existing admin
            yield db_1.default.query(`
            UPDATE admins
            SET mobile_number = '9876543210'
            WHERE email = 'admin@medimitra.in'
        `);
            console.log('✅ Updated existing admin with mobile number: 9876543210\n');
            console.log('✨ Migration complete!\n');
            process.exit(0);
        }
        catch (error) {
            console.error('\n❌ Migration failed:', error.message);
            // If constraint already exists, that's okay
            if (error.message.includes('already exists')) {
                console.log('⚠️  Some constraints may already exist - this is normal\n');
                process.exit(0);
            }
            process.exit(1);
        }
    });
}
addMobileColumn();
