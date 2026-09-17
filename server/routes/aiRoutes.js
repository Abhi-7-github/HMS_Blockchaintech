const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { getHealthAssistantResponse } = require("../controllers/aiAssistantController");

// @route   POST /api/ai/health-assistant
// @desc    AI Health Assistant for symptom guidance, specialist recommendation, report explanation, & wellness
// @access  Private (Authenticated Users)
router.post("/health-assistant", protect, getHealthAssistantResponse);

module.exports = router;
