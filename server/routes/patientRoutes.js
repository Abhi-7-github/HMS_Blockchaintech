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

module.exports = router;
