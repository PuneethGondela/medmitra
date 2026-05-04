"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bot_controller_1 = require("../controllers/bot.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Admin-only: System analysis
router.post('/analyze', auth_middleware_1.authenticateToken, (0, auth_middleware_1.requireAdmin)(), bot_controller_1.analyzeSystem);
// Role-based chat - optional auth for context, public access allowed
router.post('/chat', auth_middleware_1.optionalAuth, bot_controller_1.chatWithBot);
// Public/Authenticated: Text-to-speech
router.post('/tts', auth_middleware_1.optionalAuth, bot_controller_1.speakText);
// Public: Translation endpoint
router.post('/translate', auth_middleware_1.optionalAuth, bot_controller_1.translateText); // Make public or optionalAuth so ml-client can use it
exports.default = router;
