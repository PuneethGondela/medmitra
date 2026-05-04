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
exports.translateText = exports.chatWithBot = exports.speakText = exports.analyzeSystem = void 0;
const firebase_1 = require("../config/firebase");
const axios_1 = __importDefault(require("axios"));
const firestore_1 = require("firebase-admin/firestore");
const ml_storage_service_1 = require("../services/ml-storage.service");
const ML_SERVER_URL = process.env.ML_SERVER_URL || 'http://localhost:8000';
// Helper function to detect suspicious activity
const detectSuspiciousActivity = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        const oneHourAgo = new Date();
        oneHourAgo.setHours(oneHourAgo.getHours() - 1);
        // Get recent audit logs from last 24 hours
        const recentLogsSnapshot = yield firebase_1.adminDb.collection(firebase_1.COLLECTIONS.AUDIT_LOGS)
            .where('timestamp', '>=', oneDayAgo)
            .orderBy('timestamp', 'desc')
            .limit(100)
            .get();
        // Group by user_type and action (client-side)
        const activityMap = new Map();
        recentLogsSnapshot.docs.forEach(doc => {
            var _a;
            const data = doc.data();
            const key = `${data.user_type}_${data.action}`;
            const existing = activityMap.get(key) || { count: 0, lastAction: new Date(0) };
            activityMap.set(key, {
                count: existing.count + 1,
                lastAction: ((_a = data.timestamp) === null || _a === void 0 ? void 0 : _a.toDate()) || new Date()
            });
        });
        // Get failed logins from last hour (optimized counting)
        const failedLoginsSnapshot = yield firebase_1.adminDb.collection(firebase_1.COLLECTIONS.AUDIT_LOGS)
            .where('action', '==', 'LOGIN_FAILED')
            .where('timestamp', '>=', oneHourAgo)
            .count()
            .get();
        const failedLoginCount = failedLoginsSnapshot.data().count;
        const suspiciousPatterns = [];
        if (failedLoginCount > 10) {
            suspiciousPatterns.push({
                type: 'Multiple Failed Logins',
                severity: 'HIGH',
                description: `${failedLoginCount} failed login attempts in the last hour`
            });
        }
        // Check for unusual activity patterns (more than 20 actions in last hour)
        // Note: we still need the full snapshot here to group by user_type/action client-side
        const oneHourAgoSnapshot = yield firebase_1.adminDb.collection(firebase_1.COLLECTIONS.AUDIT_LOGS)
            .where('timestamp', '>=', oneHourAgo)
            .get();
        const hourlyActivityMap = new Map();
        oneHourAgoSnapshot.docs.forEach(doc => {
            const data = doc.data();
            const key = `${data.user_type}_${data.action}`;
            hourlyActivityMap.set(key, (hourlyActivityMap.get(key) || 0) + 1);
        });
        hourlyActivityMap.forEach((count, key) => {
            if (count > 20) {
                const [userType, action] = key.split('_');
                suspiciousPatterns.push({
                    type: 'Unusual Activity Pattern',
                    severity: 'MEDIUM',
                    description: `${count} ${action} actions by ${userType} in the last hour`
                });
            }
        });
        // Format recent activity
        const recentActivity = Array.from(activityMap.entries()).map(([key, value]) => {
            const [userType, action] = key.split('_');
            return {
                user_type: userType,
                action,
                count: value.count,
                last_action: value.lastAction
            };
        });
        return {
            patterns: suspiciousPatterns,
            recentActivity
        };
    }
    catch (error) {
        console.error('Error detecting suspicious activity:', error);
        return { patterns: [], recentActivity: [] };
    }
});
// Helper function to get admin dashboard context
const getAdminContext = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [doctorsCountSnapshot, workersCountSnapshot, donorsCountSnapshot] = yield Promise.all([
            firebase_1.adminDb.collection(firebase_1.COLLECTIONS.DOCTORS)
                .where('account_status', '==', 'ACTIVE')
                .where('deleted_at', '==', null)
                .count()
                .get(),
            firebase_1.adminDb.collection(firebase_1.COLLECTIONS.WORKERS)
                .where('status', '==', 'ACTIVE')
                .count()
                .get(),
            firebase_1.adminDb.collection(firebase_1.COLLECTIONS.BLOOD_DONORS)
                .where('status', '==', 'AVAILABLE')
                .count()
                .get()
        ]);
        // Get recent doctors (last 10)
        const recentDoctorsSnapshot = yield firebase_1.adminDb.collection(firebase_1.COLLECTIONS.DOCTORS)
            .where('account_status', '==', 'ACTIVE')
            .where('deleted_at', '==', null)
            .orderBy('created_at', 'desc')
            .limit(10)
            .get();
        // Get recent workers (last 10)
        const recentWorkersSnapshot = yield firebase_1.adminDb.collection(firebase_1.COLLECTIONS.WORKERS)
            .orderBy('joined_at', 'desc')
            .limit(10)
            .get();
        // Get doctor assignments (from workers with assigned_doctor_id)
        const assignedWorkersSnapshot = yield firebase_1.adminDb.collection(firebase_1.COLLECTIONS.WORKERS)
            .where('status', '==', 'ACTIVE')
            .where('assigned_doctor_id', '!=', null)
            .limit(20)
            .get();
        const doctorAssignments = yield Promise.all(assignedWorkersSnapshot.docs.map((workerDoc) => __awaiter(void 0, void 0, void 0, function* () {
            const worker = workerDoc.data();
            const doctorId = worker.assigned_doctor_id;
            if (doctorId) {
                const doctorDoc = yield firebase_1.adminDb.collection(firebase_1.COLLECTIONS.DOCTORS).doc(doctorId).get();
                const doctor = doctorDoc.data();
                return {
                    worker_id: workerDoc.id,
                    worker_name: worker.full_name,
                    doctor_name: (doctor === null || doctor === void 0 ? void 0 : doctor.full_name) || 'Unknown',
                    specialization: (doctor === null || doctor === void 0 ? void 0 : doctor.specialization) || 'Unknown'
                };
            }
            return null;
        })));
        const suspicious = yield detectSuspiciousActivity();
        return {
            stats: {
                totalDoctors: doctorsCountSnapshot.data().count,
                totalWorkers: workersCountSnapshot.data().count,
                totalDonors: donorsCountSnapshot.data().count
            },
            recentDoctors: recentDoctorsSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    doctor_id: doc.id,
                    full_name: data.full_name,
                    email: data.email,
                    specialization: data.specialization,
                    last_login: data.last_login
                };
            }),
            recentWorkers: recentWorkersSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    worker_id: doc.id,
                    full_name: data.full_name,
                    email: data.email,
                    assigned_village: data.assigned_village,
                    status: data.status
                };
            }),
            doctorAssignments: doctorAssignments.filter(a => a !== null),
            security: suspicious,
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        console.error('Error getting admin context:', error);
        return null;
    }
});
// Helper function to get doctor context
const getDoctorContext = (doctorId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [donorsSnapshot, assignedWorkersSnapshot] = yield Promise.all([
            firebase_1.adminDb.collection(firebase_1.COLLECTIONS.BLOOD_DONORS)
                .where('status', '==', 'AVAILABLE')
                .orderBy('registered_at', 'desc')
                .limit(20)
                .get(),
            firebase_1.adminDb.collection(firebase_1.COLLECTIONS.WORKERS)
                .where('status', '==', 'ACTIVE')
                .where('assigned_doctor_id', '==', doctorId)
                .get()
        ]);
        return {
            availableDonors: donorsSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    donor_id: doc.id,
                    full_name: data.full_name,
                    blood_group: data.blood_group,
                    mobile_number: data.mobile_number,
                    city: data.city,
                    age: data.age,
                    gender: data.gender
                };
            }),
            assignedWorkers: assignedWorkersSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    worker_id: doc.id,
                    full_name: data.full_name,
                    mobile_number: data.mobile_number,
                    assigned_village: data.assigned_village
                };
            }),
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        console.error('Error getting doctor context:', error);
        return null;
    }
});
const analyzeSystem = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { query } = req.body;
        // Get comprehensive admin context
        const contextData = yield getAdminContext();
        // 2. Send to ML Server
        const mlResponse = yield axios_1.default.post(`${ML_SERVER_URL}/api/admin/analyze`, {
            query: query || "Analyze the system security and activity.",
            context_data: contextData
        }).catch(() => ({ data: { response: 'ML Server unavailable. Security status: ' + JSON.stringify((contextData === null || contextData === void 0 ? void 0 : contextData.security) || {}) } }));
        // 3. Log this interaction (Audit)
        try {
            const adminId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.adminId) || 'SYSTEM';
            yield firebase_1.adminDb.collection(firebase_1.COLLECTIONS.AUDIT_LOGS).add({
                user_id: adminId,
                user_type: 'ADMIN',
                action: 'AI_ANALYSIS',
                resource: 'bot',
                details: { query },
                timestamp: firestore_1.FieldValue.serverTimestamp()
            });
        }
        catch (logError) {
            console.error('Failed to log:', logError);
        }
        const analysisText = mlResponse.data.response;
        // Store analysis response
        try {
            const adminId = ((_b = req.user) === null || _b === void 0 ? void 0 : _b.adminId) || 'SYSTEM';
            yield (0, ml_storage_service_1.storeAnalysisResponse)(adminId, query, analysisText, contextData);
        }
        catch (storageError) {
            console.warn('Failed to store analysis response:', storageError);
            // Don't fail the request if storage fails
        }
        res.json({
            analysis: analysisText,
            contextUsed: contextData,
            security: contextData === null || contextData === void 0 ? void 0 : contextData.security
        });
    }
    catch (error) {
        console.error('Bot Error:', error.message);
        res.status(500).json({ error: 'Failed to analyze system data', details: error.message });
    }
});
exports.analyzeSystem = analyzeSystem;
const speakText = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { text } = req.body;
        const response = yield axios_1.default.post(`${ML_SERVER_URL}/api/tts`, { text }, {
            responseType: 'stream'
        });
        res.setHeader('Content-Type', 'audio/mpeg');
        response.data.pipe(res);
    }
    catch (error) {
        console.error('TTS Error:', error.message);
        res.status(500).json({ error: 'Failed to generate speech', details: error.message });
    }
});
exports.speakText = speakText;
const chatWithBot = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    try {
        const { messages, max_tokens, temperature, role: requestedRole, userId } = req.body;
        // Determine user role from token if available
        let userRole = requestedRole || 'user';
        let contextData = null;
        let systemPrompt = '';
        if (req.user) {
            if (req.user.role === 'SUPER_ADMIN' || req.user.adminId) {
                userRole = 'admin';
                contextData = yield getAdminContext();
                systemPrompt = `You are Med Mitra Security & Analytics AI. Your PRIMARY role is to analyze the LIVE SYSTEM DATA provided below and answer questions about application trends, user statistics, and security status.

Current Capabilities & Focus:
1.  **Trend Analysis**: Analyze the counts of Doctors, Workers, and Donors. (e.g., "There are X doctors currently active...").
2.  **Security Monitoring**: Report any "Security Alerts" or suspicious patterns found in the data immediately.
3.  **System Health**: Summarize the overall state of the application based on the "Current System Context".

Guidelines:
- **ALWAYS** use the numbers from the "Current System Data" section. Do not guess or use outside knowledge for system stats.
- If asked "How many doctors?", look at 'stats.totalDoctors'.
- If asked "Monitor security", summarize the 'security' section.
- Be concise and professional.`;
            }
            else if (req.user.role === 'doctor' || req.user.doctorId) {
                userRole = 'doctor';
                contextData = yield getDoctorContext(req.user.doctorId || "");
                const donorList = ((_a = contextData === null || contextData === void 0 ? void 0 : contextData.availableDonors) === null || _a === void 0 ? void 0 : _a.map((d) => `${d.full_name} - ${d.blood_group} - ${d.city} - ${d.mobile_number}`).join('\n')) || 'No donors available';
                systemPrompt = `You are Med Mitra Doctor Assistant AI. You help doctors find blood donors, manage assigned patients, and access medical resources.

Available Donors (${((_b = contextData === null || contextData === void 0 ? void 0 : contextData.availableDonors) === null || _b === void 0 ? void 0 : _b.length) || 0}):
${donorList}

Assigned Workers/Patients: ${((_c = contextData === null || contextData === void 0 ? void 0 : contextData.assignedWorkers) === null || _c === void 0 ? void 0 : _c.length) || 0}

Your capabilities:
1. Donor Finder: Help find blood donors by blood group, city, age, or availability. Provide contact information when requested.
2. Patient Management: Show assigned workers/patients with their details
3. Medical Resources: Provide medical information, treatment guidelines, and protocols
4. Appointment Scheduling: Help manage patient visits and schedules
5. Prescription Support: Assist with medication recommendations

When users ask about donors, search the available donors list and provide detailed information including name, blood group, location, and contact details.`;
            }
        }
        // For worker/user role or when no auth
        if (userRole === 'user' || userRole === 'worker') {
            systemPrompt = `You are Med Mitra Health Assistant AI. You provide personalized health guidance, ancient remedies, diet plans, and medical advice to workers/users.

Your capabilities:
1. Health Suggestions: Provide personalized health recommendations based on user's medical history and symptoms
2. Ancient Techniques: Suggest traditional Indian remedies (Ayurveda, Yoga, Herbal treatments) and practices. Include specific poses, herbs, and routines.
3. Visit Summaries: Summarize last medical visit and provide follow-up guidance. Analyze previous visit records.
4. Adherence Prediction: Predict medication adherence based on patterns and provide reminders and motivation
5. Diet Planning: Create personalized diet plans based on conditions (diabetes, hypertension, pregnancy, etc.). Include Indian meal plans.
6. Visit Planning: Create doctor visit schedules for serious conditions or pregnancy care. Provide timeline recommendations.
7. Disease Management: Help manage chronic diseases with lifestyle changes, medication schedules, and monitoring

Always:
- Combine modern medical advice with ancient Indian wisdom (Ayurveda, Yoga, Herbal medicine) when appropriate
- Provide practical, actionable advice suited to Indian context
- Consider cultural context and local practices
- Emphasize preventive care and holistic wellness
- Be empathetic and supportive
- Use simple language that's easy to understand
- Provide specific examples and step-by-step instructions

Strict Scope Limit:
- You are ONLY allowed to answer questions related to:
  1. The Med Mitra Application itself (features, how-to, records, etc.)
  2. Medical Science, Health, and Wellness (symptoms, remedies, treatments, diet, etc.)
- If a user asks a question OUTSIDE these two topics (e.g. sports, politics, entertainment, coding unrelated to health), you must REFUSE.
- Standard Refusal Message: "I am not able to assist with that. I am designed to help only with Health, Medical topics, and the Med Mitra application."

When user asks about their health records or visits, you can reference their medical history.`;
            // Note: User-specific context would be fetched from Firestore by frontend
            // and passed in the messages
        }
        // Merge system prompt and context
        let finalSystemPrompt = systemPrompt;
        if (contextData && Object.keys(contextData).length > 0) {
            finalSystemPrompt += `\n\n--- CURRENT SYSTEM DATA ---\n${JSON.stringify(contextData, null, 2)}\n--- END DATA ---\n\nUse this data to answer user questions accurately.`;
        }
        const enhancedMessages = [...messages];
        if (finalSystemPrompt) {
            enhancedMessages.unshift({
                role: 'system',
                content: finalSystemPrompt
            });
        }
        // Forward to ML Server with enhanced context
        const response = yield axios_1.default.post(`${ML_SERVER_URL}/api/chat`, {
            messages: enhancedMessages,
            max_tokens: max_tokens || 1024,
            temperature: temperature || 0.7,
            role: userRole
        }).catch((error) => {
            // Fallback response if ML server is down
            return {
                data: {
                    response: `I am currently offline (ML Server disconnected). However, based on available data:\n\n${contextData ? JSON.stringify(contextData, null, 2) : 'No context available'}`,
                    role: userRole
                }
            };
        });
        let responseText = response.data.response || response.data.message || 'No response';
        // --- TRANSLATION LAYER ---
        // If user requested a non-English language and response is in English (assumed), translate it.
        // We check if language was passed in body (e.g. 'hi-IN' or 'te-IN')
        const requestedLang = req.body.language;
        if (requestedLang && !requestedLang.startsWith('en')) {
            try {
                const targetLang = requestedLang.split('-')[0]; // 'hi-IN' -> 'hi'
                const transResponse = yield axios_1.default.post(`${ML_SERVER_URL}/api/translate`, {
                    text: responseText,
                    src_lang: 'en',
                    tgt_lang: targetLang
                });
                if (transResponse.data && transResponse.data.translated_text) {
                    responseText = transResponse.data.translated_text;
                }
            }
            catch (transError) {
                console.warn("Auto-translation of bot response failed:", transError);
                // Continue with original text
            }
        }
        // -------------------------
        // Store ML response
        try {
            const userId = ((_d = req.user) === null || _d === void 0 ? void 0 : _d.adminId) || ((_e = req.user) === null || _e === void 0 ? void 0 : _e.doctorId) || ((_f = req.user) === null || _f === void 0 ? void 0 : _f.userId);
            const userType = ((_g = req.user) === null || _g === void 0 ? void 0 : _g.adminId) ? 'ADMIN' : ((_h = req.user) === null || _h === void 0 ? void 0 : _h.doctorId) ? 'DOCTOR' : 'USER';
            yield (0, ml_storage_service_1.storeMLResponse)({
                userId,
                userType,
                role: userRole,
                query: ((_j = messages[messages.length - 1]) === null || _j === void 0 ? void 0 : _j.content) || '',
                response: responseText,
                contextUsed: contextData ? true : false,
                metadata: Object.assign({ endpoint: '/api/bot/chat', temperature: temperature || 0.7, maxTokens: max_tokens || 1024 }, { language: requestedLang || "en" })
            });
        }
        catch (storageError) {
            console.warn('Failed to store ML response:', storageError);
            // Don't fail the request if storage fails
        }
        // Log interaction in audit logs
        try {
            const user = req.user;
            if (user === null || user === void 0 ? void 0 : user.adminId) {
                yield firebase_1.adminDb.collection(firebase_1.COLLECTIONS.AUDIT_LOGS).add({
                    user_id: user.adminId,
                    user_type: 'ADMIN',
                    action: 'AI_CHAT',
                    resource: 'bot',
                    details: { role: userRole, query: (_k = messages[messages.length - 1]) === null || _k === void 0 ? void 0 : _k.content },
                    timestamp: firestore_1.FieldValue.serverTimestamp()
                });
            }
            else if (user === null || user === void 0 ? void 0 : user.doctorId) {
                yield firebase_1.adminDb.collection(firebase_1.COLLECTIONS.AUDIT_LOGS).add({
                    user_id: user.doctorId,
                    user_type: 'DOCTOR',
                    action: 'AI_CHAT',
                    resource: 'bot',
                    details: { role: userRole, query: (_l = messages[messages.length - 1]) === null || _l === void 0 ? void 0 : _l.content },
                    timestamp: firestore_1.FieldValue.serverTimestamp()
                });
            }
        }
        catch (logError) {
            console.error('Failed to log chat interaction:', logError);
        }
        res.json(Object.assign(Object.assign({}, response.data), { response: responseText, role: userRole, contextUsed: contextData ? true : false }));
    }
    catch (error) {
        console.error('Chat Bot Error:', error.message);
        // Fallback if ML server is down
        if (error.code === 'ECONNREFUSED') {
            return res.json({
                response: "I am currently offline (ML Server disconnected). Please try again later.",
                role: req.body.role || 'user'
            });
        }
        res.status(500).json({ error: 'Failed to chat with bot', details: error.message });
    }
});
exports.chatWithBot = chatWithBot;
const translateText = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { text, src_lang, tgt_lang } = req.body;
        const response = yield axios_1.default.post(`${ML_SERVER_URL}/api/translate`, {
            text,
            src_lang: src_lang || 'en',
            tgt_lang: tgt_lang || 'hi'
        });
        res.json(response.data);
    }
    catch (error) {
        console.error('Translation Error:', error.message);
        res.status(500).json({ error: 'Failed to translate', details: error.message });
    }
});
exports.translateText = translateText;
