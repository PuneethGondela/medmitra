"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bot_controller_1 = require("../controllers/bot.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.post('/analyze', auth_middleware_1.authenticateToken, (0, auth_middleware_1.requireRole)('SUPER_ADMIN'), bot_controller_1.analyzeSystem);
router.post('/chat', bot_controller_1.chatWithBot); // Public or semi-protected for now
router.post('/tts', auth_middleware_1.authenticateToken, (0, auth_middleware_1.requireRole)('SUPER_ADMIN'), bot_controller_1.speakText);
exports.default = router;
