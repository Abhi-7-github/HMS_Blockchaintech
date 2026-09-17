

const express = require("express");
const router = express.Router();
const { protect, isPatient } = require("../middleware/authMiddleware");
const {
    uploadMedicalRecord,
    verifyMedicalRecordIntegrity,
    getMedicalRecords,
    getMedicalRecordById,
    grantRecordAccess,
    revokeRecordAccess,
    getMyAccessPermissions,
    grantAccessByRecordId,
    revokeAccessByRecordId,
    getRecordAccessList,
    getPatientRecordAccess,
} = require("../controllers/medicalRecordController");

// Protect all medical record endpoints (Require valid JWT authentication)
router.use(protect);

// Access control management endpoints (Patient controlled)
router.post("/access/grant", isPatient, grantRecordAccess);
router.post("/access/revoke", isPatient, revokeRecordAccess);
router.get("/access/my-permissions", isPatient, getMyAccessPermissions);

// Record-specific access management endpoints
// @route   POST /api/records/:recordId/access
// @desc    Grant doctor access to a medical record
router.post("/:recordId/access", isPatient, grantAccessByRecordId);

// @route   DELETE /api/records/:recordId/access/:doctorId
// @desc    Revoke doctor access to a medical record
router.delete("/:recordId/access/:doctorId", isPatient, revokeAccessByRecordId);

// @route   GET /api/records/:recordId/access
// @desc    Get access permissions list for a medical record
router.get("/:recordId/access", getRecordAccessList);

// @route   POST /api/records
// @desc    Upload / create medical record & log SHA-256 hash on-chain
router.post("/", uploadMedicalRecord);

// @route   GET /api/records
// @desc    Get all medical records for authenticated patient/doctor
router.get("/", getMedicalRecords);

// @route   GET /api/records/:id/verify
// @desc    Verify medical record integrity hash against blockchain
router.get("/:id/verify", verifyMedicalRecordIntegrity);

// @route   GET /api/records/:id
// @desc    Get single medical record details by ID
router.get("/:id", getMedicalRecordById);


module.exports = router;

