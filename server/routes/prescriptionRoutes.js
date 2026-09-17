const express = require("express");
const router = express.Router();
const {
    createPrescription,
    getPatientPrescriptions,
    getDoctorPrescriptions,
    getPrescriptionById,
    verifyPrescriptionIntegrity,
} = require("../controllers/prescriptionController");

const { protect, authorize, isPatient, isDoctor } = require("../middleware/authMiddleware");

// Require JWT authentication for all prescription endpoints
router.use(protect);

// @route   POST /api/prescriptions
// @desc    Create a new digital prescription (Doctor only)
// @access  Private (Doctor)
router.post("/", isDoctor, createPrescription);

// @route   GET /api/prescriptions/patient
// @desc    Get all prescriptions for the authenticated patient
// @access  Private (Patient)
router.get("/patient", isPatient, getPatientPrescriptions);

// @route   GET /api/prescriptions/doctor
// @desc    Get all prescriptions created by the authenticated doctor
// @access  Private (Doctor)
router.get("/doctor", isDoctor, getDoctorPrescriptions);

// @route   GET /api/prescriptions/:id/verify
// @desc    Verify prescription integrity against blockchain
// @access  Private (Patient, Doctor, Admin)
router.get("/:id/verify", authorize("PATIENT", "DOCTOR", "ADMIN"), verifyPrescriptionIntegrity);

// @route   GET /api/prescriptions/:id
// @desc    Get single prescription by ID
// @access  Private (Patient, Doctor, Admin)
router.get("/:id", authorize("PATIENT", "DOCTOR", "ADMIN"), getPrescriptionById);


module.exports = router;
