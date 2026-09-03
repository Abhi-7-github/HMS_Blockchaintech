const express = require("express");
const router = express.Router();
const { protect, isAdmin } = require("../middleware/authMiddleware");
const {
    getAllDoctors,
    getPendingDoctors,
    getDoctorDetailsById,
    getDoctorCertificateForAdmin,
    approveDoctorProfile,
    rejectDoctorProfile,
    verifyDoctor,
} = require("../controllers/adminDoctorController");

// Protect all admin routes: Require valid JWT token & ADMIN role authorization
router.use(protect, isAdmin);

// Admin doctor verification management endpoints
router.get("/doctors", getAllDoctors);
router.get("/doctors/pending", getPendingDoctors);
router.get("/doctors/:id", getDoctorDetailsById);
router.get("/doctors/:doctorId/certificates/:certificateId", getDoctorCertificateForAdmin);

// Doctor verification action endpoints
router.patch("/doctors/:id/verify", approveDoctorProfile);
router.patch("/doctors/:id/reject", rejectDoctorProfile);
router.put("/doctors/:id/verify", verifyDoctor); // Legacy support

module.exports = router;
