const express = require("express");
const router = express.Router();
const { getRuralWellnessData } = require("../controllers/ruralHealthController");

// @route   GET /api/rural/wellness
// @desc    Get Rural Healthcare Knowledge Base & ASHA Worker Directory
// @access  Public
router.get("/wellness", getRuralWellnessData);

module.exports = router;
