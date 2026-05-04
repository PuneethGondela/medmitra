"use strict";
/**
 * Connectivity Test Script
 * Tests all backend connections and endpoints
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
const axios_1 = __importDefault(require("axios"));
const BASE_URL = process.env.BACKEND_URL || 'http://localhost:4000';
const ML_SERVER_URL = process.env.ML_SERVER_URL || 'http://localhost:8000';
const results = [];
function logResult(result) {
    results.push(result);
    const icon = result.passed ? '✅' : '❌';
    const time = result.responseTime ? ` (${result.responseTime}ms)` : '';
    console.log(`${icon} ${result.name}${time}`);
    if (result.error) {
        console.log(`   Error: ${result.error}`);
    }
}
function testEndpoint(name_1, url_1) {
    return __awaiter(this, arguments, void 0, function* (name, url, method = 'GET', data) {
        const startTime = Date.now();
        try {
            const response = yield (0, axios_1.default)({
                method,
                url,
                data,
                timeout: 5000,
                validateStatus: () => true, // Don't throw on any status
            });
            const responseTime = Date.now() - startTime;
            logResult({
                name,
                passed: response.status < 500, // Accept 2xx, 3xx, 4xx but not 5xx
                error: response.status >= 500 ? `HTTP ${response.status}` : undefined,
                responseTime
            });
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            logResult({
                name,
                passed: false,
                error: error.code === 'ECONNREFUSED' ? 'Connection refused - server not running' : error.message,
                responseTime
            });
        }
    });
}
function runTests() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('='.repeat(60));
        console.log('Backend Connectivity Test');
        console.log('='.repeat(60));
        console.log('');
        // Backend Health Check
        console.log('📡 Backend Server Tests');
        console.log('-'.repeat(60));
        yield testEndpoint('Backend Health Check', `${BASE_URL}/health`);
        // Admin Endpoints
        console.log('');
        console.log('👤 Admin Endpoints');
        console.log('-'.repeat(60));
        yield testEndpoint('Admin Login Endpoint', `${BASE_URL}/api/admin/login`, 'POST', {
            identifier: 'admin@medimitra.in',
            password: 'admin&125'
        });
        // Doctor Endpoints
        console.log('');
        console.log('👨‍⚕️ Doctor Endpoints');
        console.log('-'.repeat(60));
        yield testEndpoint('Doctor Login Endpoint', `${BASE_URL}/api/doctors/login`, 'POST', {
            email: 'test@example.com',
            password: 'test'
        });
        // Bot/AI Endpoints
        console.log('');
        console.log('🤖 Bot/AI Endpoints');
        console.log('-'.repeat(60));
        yield testEndpoint('Bot Chat Endpoint', `${BASE_URL}/api/bot/chat`, 'POST', {
            messages: [{ role: 'user', content: 'Hello' }],
            role: 'user'
        });
        // ML Server
        console.log('');
        console.log('🧠 ML Server Tests');
        console.log('-'.repeat(60));
        try {
            const mlStart = Date.now();
            yield axios_1.default.get(`${ML_SERVER_URL}/health`, { timeout: 3000 });
            const mlTime = Date.now() - mlStart;
            logResult({
                name: 'ML Server Health',
                passed: true,
                responseTime: mlTime
            });
        }
        catch (error) {
            logResult({
                name: 'ML Server Health',
                passed: false,
                error: error.code === 'ECONNREFUSED' ? 'ML Server not running' : error.message
            });
        }
        // Summary
        console.log('');
        console.log('='.repeat(60));
        console.log('📊 Test Summary');
        console.log('='.repeat(60));
        const passed = results.filter(r => r.passed).length;
        const failed = results.filter(r => !r.passed).length;
        const total = results.length;
        console.log(`Total Tests: ${total}`);
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
        console.log('');
        if (failed > 0) {
            console.log('⚠️ Failed Tests:');
            results.filter(r => !r.passed).forEach(r => {
                console.log(`  ❌ ${r.name}: ${r.error}`);
            });
            console.log('');
            console.log('💡 Tips:');
            console.log('  1. Ensure backend server is running: cd backend && npm run dev');
            console.log('  2. Ensure ML server is running: cd ml-server && python main.py');
            console.log('  3. Check .env files for correct URLs');
        }
        process.exit(failed > 0 ? 1 : 0);
    });
}
runTests().catch(console.error);
