"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const donor_controller_1 = require("../controllers/donor.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticateToken);
// Both admin and doctors can view/search donors
router.get('/', (0, auth_middleware_1.requireAdminOrDoctor)(), donor_controller_1.getAllDonors);
// Only admin can create donors
router.post('/', (0, auth_middleware_1.requireAdmin)(), donor_controller_1.createDonor);
exports.default = router;
