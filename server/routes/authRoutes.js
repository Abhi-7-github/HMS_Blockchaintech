const express = require("express");
const router = express.Router();
const { register, verifyOtp, resendOtp } = require("../controllers/authController");

// POST /api/auth/register
router.post("/register", register);

// POST /api/auth/verify-otp
router.post("/verify-otp", verifyOtp);

// POST /api/auth/resend-otp
router.post("/resend-otp", resendOtp);

module.exports = router;
