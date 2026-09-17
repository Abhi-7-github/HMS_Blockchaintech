const express = require("express");
const router = express.Router();
const { protect, isPatient } = require("../middleware/authMiddleware");
const {
    createProfile,
    getProfile,
    updateProfile,
} = require("../controllers/patientController");

// Protect all routes: Require valid JWT token & PATIENT role authorization
router.use(protect, isPatient);

// Patient profile endpoints
router.post("/profile", createProfile);
router.get("/profile", getProfile);
router.put("/profile", updateProfile);

// Patient medical record access management endpoint
// @route   GET /api/patients/record-access or GET /api/patient/record-access
// @desc    Get all medical record access permissions managed by authenticated patient
router.get("/record-access", require("../controllers/medicalRecordController").getPatientRecordAccess);

module.exports = router;

