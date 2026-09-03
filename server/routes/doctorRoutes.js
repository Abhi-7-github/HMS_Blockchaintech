const express = require("express");
const router = express.Router();
const { protect, isDoctor } = require("../middleware/authMiddleware");
const uploadCertificateMiddleware = require("../middleware/uploadMiddleware");
const {
    createProfile,
    getProfile,
    updateProfile,
    getVerifiedDoctors,
    getVerificationStatus,
} = require("../controllers/doctorController");
const {
    uploadCertificate,
    getDoctorCertificates,
    getCertificateById,
    deleteCertificateById,
} = require("../controllers/doctorCertificateController");

// Doctor profile endpoints (Doctor role required)
router.post("/profile", protect, isDoctor, createProfile);
router.get("/profile", protect, isDoctor, getProfile);
router.put("/profile", protect, isDoctor, updateProfile);

// Doctor verification status endpoint (Doctor role required)
router.get("/verification-status", protect, isDoctor, getVerificationStatus);

// Doctor certificate management endpoints (Doctor role required)
// Accepts multipart/form-data field 'certificate' (or fallback 'file')
router.post(
    "/certificates",
    protect,
    isDoctor,
    uploadCertificateMiddleware.single("certificate"),
    uploadCertificate
);
router.get("/certificates", protect, isDoctor, getDoctorCertificates);
router.get("/certificates/:id", protect, isDoctor, getCertificateById);
router.delete("/certificates/:id", protect, isDoctor, deleteCertificateById);

// Public / Authenticated user endpoint to list verified doctors
router.get("/verified", protect, getVerifiedDoctors);

module.exports = router;
