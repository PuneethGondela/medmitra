"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.post('/login', auth_controller_1.loginAdmin);
router.post('/setup-admin', auth_controller_1.createInitialAdmin);
// 2FA Routes (Protected)
router.post('/2fa/generate', auth_middleware_1.authenticateToken, auth_controller_1.generate2FA);
router.post('/2fa/verify', auth_middleware_1.authenticateToken, auth_controller_1.verify2FA);
exports.default = router;
