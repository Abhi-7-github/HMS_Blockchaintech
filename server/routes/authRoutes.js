const express = require("express");
const router = express.Router();
const {
    register,
    verifyOtp,
    resendOtp,
    login,
    getMe,
    forgotPassword,
    resetPassword,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

// POST /api/auth/register
router.post("/register", register);

// POST /api/auth/verify-otp
router.post("/verify-otp", verifyOtp);

// POST /api/auth/resend-otp
router.post("/resend-otp", resendOtp);

// POST /api/auth/login
router.post("/login", login);

// POST /api/auth/forgot-password (for PATIENT, DOCTOR, PHARMACY)
router.post("/forgot-password", forgotPassword);

// POST /api/auth/reset-password
router.post("/reset-password", resetPassword);

// GET /api/auth/me
router.get("/me", protect, getMe);

module.exports = router;
