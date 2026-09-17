const express = require("express");
const router = express.Router();
const { protect, isPatient } = require("../middleware/authMiddleware");
const {
    getTodaySchedule,
    updateMedicationStatus,
    getAdherenceHistory,
} = require("../controllers/medicationController");

// Protect all medication schedule & adherence routes
router.use(protect);

// @route   GET /api/medications/schedule
// @desc    Get today's medication schedule generated from active prescriptions
router.get("/schedule", isPatient, getTodaySchedule);

// @route   POST /api/medications/status
// @desc    Mark scheduled dose as TAKEN or SKIPPED
router.post("/status", isPatient, updateMedicationStatus);

// @route   GET /api/medications/adherence
// @desc    Get patient medication adherence metrics & historical log
router.get("/adherence", getAdherenceHistory);

module.exports = router;
