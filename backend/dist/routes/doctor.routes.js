"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const doctor_controller_1 = require("../controllers/doctor.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_middleware_1.authenticateToken);
// Create Doctor (Super Admin only for now, or Hospital Admin later)
router.post('/', (0, auth_middleware_1.requireRole)('SUPER_ADMIN'), doctor_controller_1.createDoctor);
// Get all doctors (with filters)
router.get('/', (0, auth_middleware_1.requireRole)('SUPER_ADMIN'), doctor_controller_1.getAllDoctors);
// Get single doctor
router.get('/:id', (0, auth_middleware_1.requireRole)('SUPER_ADMIN'), doctor_controller_1.getDoctorById);
// Update doctor
router.put('/:id', (0, auth_middleware_1.requireRole)('SUPER_ADMIN'), doctor_controller_1.updateDoctor);
// Delete doctor (Soft delete)
router.delete('/:id', (0, auth_middleware_1.requireRole)('SUPER_ADMIN'), doctor_controller_1.deleteDoctor);
exports.default = router;
