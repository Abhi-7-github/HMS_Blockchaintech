const express = require("express");
const router = express.Router();
const { protect, isAdmin } = require("../middleware/authMiddleware");
const {
    getAllDoctors,
    verifyDoctor,
} = require("../controllers/adminDoctorController");

// Protect all admin routes: Require valid JWT token & ADMIN role authorization
router.use(protect, isAdmin);

// Admin doctor verification management endpoints
router.get("/doctors", getAllDoctors);
router.put("/doctors/:id/verify", verifyDoctor);

module.exports = router;
