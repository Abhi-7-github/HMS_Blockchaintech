const express = require("express");
const router = express.Router();
const { protect, isPatient } = require("../middleware/authMiddleware");
const {
    getPatientEmergencyProfile,
    updateEmergencyProfile,
    accessEmergencyInfo,
    getEmergencyAccessLogs,
} = require("../controllers/emergencyController");

// Protect all emergency endpoints
router.use(protect);

// @route   GET /api/emergency/profile
// @desc    Get patient emergency profile settings
router.get("/profile", isPatient, getPatientEmergencyProfile);

// @route   PUT /api/emergency/profile
// @desc    Update emergency contact, blood group, allergies, & preferences
router.put("/profile", isPatient, updateEmergencyProfile);

// @route   POST /api/emergency/access/:patientId
// @desc    Explicit emergency access triage request (Logs audit event + returns profile card ONLY)
router.post("/access/:patientId", accessEmergencyInfo);

// @route   GET /api/emergency/logs
// @desc    Get emergency access audit logs for patient / admin
router.get("/logs", getEmergencyAccessLogs);

module.exports = router;
