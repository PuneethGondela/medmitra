"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const doctor_controller_1 = require("../controllers/doctor.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Public Routes
router.post('/login', doctor_controller_1.loginDoctor);
// Admin-only: Doctor management
router.post('/', auth_middleware_1.authenticateToken, (0, auth_middleware_1.requireAdmin)(), doctor_controller_1.createDoctor);
router.get('/', auth_middleware_1.authenticateToken, (0, auth_middleware_1.requireAdmin)(), doctor_controller_1.getAllDoctors);
router.get('/all', auth_middleware_1.authenticateToken, (0, auth_middleware_1.requireAdmin)(), doctor_controller_1.getAllDoctors);
router.get('/admin/:id', auth_middleware_1.authenticateToken, (0, auth_middleware_1.requireAdmin)(), doctor_controller_1.getDoctorById);
router.put('/admin/:id', auth_middleware_1.authenticateToken, (0, auth_middleware_1.requireAdmin)(), doctor_controller_1.updateDoctor);
router.delete('/admin/:id', auth_middleware_1.authenticateToken, (0, auth_middleware_1.requireAdmin)(), doctor_controller_1.deleteDoctor);
// Doctor self-access routes
router.get('/me', auth_middleware_1.authenticateToken, (0, auth_middleware_1.requireDoctor)(), doctor_controller_1.getCurrentDoctor);
router.put('/me', auth_middleware_1.authenticateToken, (0, auth_middleware_1.requireDoctor)(), doctor_controller_1.updateCurrentDoctor);
// Shared: Get doctor by ID (admin or doctor themselves)
router.get('/:id', auth_middleware_1.authenticateToken, (0, auth_middleware_1.requireAdminOrDoctor)(), doctor_controller_1.getDoctorById);
exports.default = router;
