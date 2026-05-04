"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const stats_controller_1 = require("../controllers/stats.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Admin dashboard stats (full system view)
router.get('/', auth_middleware_1.authenticateToken, (0, auth_middleware_1.requireAdmin)(), stats_controller_1.getDashboardStats);
// Doctor-specific stats (their own data)
router.get('/doctor', auth_middleware_1.authenticateToken, (0, auth_middleware_1.requireDoctor)(), stats_controller_1.getDoctorStats);
exports.default = router;
