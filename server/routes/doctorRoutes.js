const express = require("express");
const router = express.Router();
const { protect, isDoctor } = require("../middleware/authMiddleware");
const {
    createProfile,
    getProfile,
    updateProfile,
    getVerifiedDoctors,
} = require("../controllers/doctorController");

// Doctor profile endpoints (Doctor role required)
router.post("/profile", protect, isDoctor, createProfile);
router.get("/profile", protect, isDoctor, getProfile);
router.put("/profile", protect, isDoctor, updateProfile);

// Public / Authenticated user endpoint to list verified doctors
router.get("/verified", protect, getVerifiedDoctors);

module.exports = router;
