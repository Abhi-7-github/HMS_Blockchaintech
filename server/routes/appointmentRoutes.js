const express = require("express");
const router = express.Router();
const {
    createAppointment,
    getPatientAppointments,
    getDoctorAppointments,
    getAppointmentById,
    confirmAppointment,
    rejectAppointment,
    cancelAppointment,
    completeAppointment,
    getConsultationRoomAccess,
    handleConsultationSignaling,
} = require("../controllers/appointmentController");

const { protect, authorize, isPatient, isDoctor } = require("../middleware/authMiddleware");

// Require JWT authentication for all appointment endpoints
router.use(protect);

// @route   GET /api/appointments/:id/consultation
// @desc    Enter telemedicine consultation room (Patient & Assigned Doctor only)
// @access  Private (Patient, Doctor, Admin)
router.get("/:id/consultation", authorize("PATIENT", "DOCTOR", "ADMIN"), getConsultationRoomAccess);

// @route   POST /api/appointments/:id/consultation/signal
// @desc    WebRTC & Chat Signaling exchange
// @access  Private (Patient, Doctor, Admin)
router.post("/:id/consultation/signal", authorize("PATIENT", "DOCTOR", "ADMIN"), handleConsultationSignaling);

// @route   POST /api/appointments
// @desc    Book a new appointment (Patient only)
// @desc    Book a new appointment (Patient only)
// @access  Private (Patient)
router.post("/", isPatient, createAppointment);

// @route   GET /api/appointments/patient
// @desc    Get appointments for the authenticated patient
// @access  Private (Patient)
router.get("/patient", isPatient, getPatientAppointments);

// @route   GET /api/appointments/doctor
// @desc    Get appointments for the authenticated doctor
// @access  Private (Doctor)
router.get("/doctor", isDoctor, getDoctorAppointments);

// @route   GET /api/appointments/:id
// @desc    Get single appointment by ID
// @access  Private (Patient, Doctor, Admin)
router.get("/:id", authorize("PATIENT", "DOCTOR", "ADMIN"), getAppointmentById);

// @route   PATCH /api/appointments/:id/confirm
// @desc    Confirm an appointment (Doctor only)
// @access  Private (Doctor)
router.patch("/:id/confirm", isDoctor, confirmAppointment);

// @route   PATCH /api/appointments/:id/reject
// @desc    Reject an appointment (Doctor only)
// @access  Private (Doctor)
router.patch("/:id/reject", isDoctor, rejectAppointment);

// @route   PATCH /api/appointments/:id/cancel
// @desc    Cancel an appointment (Patient or Doctor)
// @access  Private (Patient, Doctor, Admin)
router.patch("/:id/cancel", authorize("PATIENT", "DOCTOR", "ADMIN"), cancelAppointment);

// @route   PATCH /api/appointments/:id/complete
// @desc    Mark appointment as completed (Doctor only)
// @access  Private (Doctor)
router.patch("/:id/complete", isDoctor, completeAppointment);

module.exports = router;
