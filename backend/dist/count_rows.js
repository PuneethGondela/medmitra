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
const check = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const doctors = yield db_1.default.query('SELECT COUNT(*) FROM doctors');
        const workers = yield db_1.default.query('SELECT COUNT(*) FROM workers');
        console.log(`Doctors count: ${doctors.rows[0].count}`);
        console.log(`Workers count: ${workers.rows[0].count}`);
        process.exit(0);
    }
    catch (err) {
        console.error(err);
        process.exit(1);
    }
});
check();
