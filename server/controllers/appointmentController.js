const Appointment = require("../models/Appointment");
const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");

/**
 * @desc    Create a new appointment request
 * @route   POST /api/appointments
 * @access  Private (Patient only)
 */
const createAppointment = async (req, res) => {
    try {
        const userId = req.user._id;

        // 1. Fetch patient profile associated with authenticated user (auto-create baseline if missing)
        let patientProfile = await Patient.findOne({ userId });
        if (!patientProfile) {
            patientProfile = await Patient.create({
                userId,
                dateOfBirth: new Date("2000-01-01"),
                gender: "PREFER_NOT_TO_SAY",
                address: "Primary Residence",
                emergencyContact: {
                    name: req.user.name || "Primary Contact",
                    relationship: "Self/Family",
                    phone: req.user.phone || "0000000000",
                },
            });
        }

        const { doctorId, appointmentDate, startTime, endTime, consultationMode, reason } = req.body;

        // 2. Validate required input parameters
        if (!doctorId || !appointmentDate || !startTime || !endTime || !consultationMode || !reason) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required fields: doctorId, appointmentDate, startTime, endTime, consultationMode, reason",
            });
        }

        // 3. Fetch doctor profile
        const doctorProfile = await Doctor.findById(doctorId);
        if (!doctorProfile) {
            return res.status(404).json({
                success: false,
                message: "Doctor not found with the provided ID.",
            });
        }

        // 4. Verify doctor status (Only VERIFIED doctors can receive appointments)
        if (doctorProfile.verificationStatus !== "VERIFIED") {
            return res.status(400).json({
                success: false,
                message: "Appointments can only be booked with VERIFIED doctors.",
            });
        }

        // 5. Create new appointment
        const appointment = new Appointment({
            patientId: patientProfile._id,
            doctorId: doctorProfile._id,
            appointmentDate,
            startTime: startTime.trim(),
            endTime: endTime.trim(),
            consultationMode: consultationMode.toUpperCase().trim(),
            reason: reason.trim(),
            status: "REQUESTED",
        });

        // 6. Save appointment (Triggers Mongoose schema validation & pre-validate hooks for conflicts and date/time checks)
        await appointment.save();

        // 7. Return populated appointment details
        const populatedAppointment = await Appointment.findById(appointment._id)
            .populate({
                path: "patientId",
                populate: { path: "userId", select: "name email phone" },
            })
            .populate({
                path: "doctorId",
                select: "specialization qualification hospital consultationFee consultationMode",
                populate: { path: "userId", select: "name email phone" },
            });

        return res.status(201).json({
            success: true,
            message: "Appointment requested successfully.",
            data: populatedAppointment,
        });
    } catch (error) {
        console.error("Error creating appointment:", error.message);
        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map((err) => err.message);
            const isConflict = messages.some(
                (msg) => msg.toLowerCase().includes("existing appointment") || msg.toLowerCase().includes("time slot")
            );
            return res.status(isConflict ? 409 : 400).json({
                success: false,
                message: messages.join(". "),
                error: error.message,
            });
        }

        return res.status(500).json({
            success: false,
            message: error.message || "Server error while creating appointment",
        });
    }
};

/**
 * @desc    Get appointments for authenticated patient
 * @route   GET /api/appointments/patient
 * @access  Private (Patient only)
 */
const getPatientAppointments = async (req, res) => {
    try {
        const userId = req.user._id;

        const patientProfile = await Patient.findOne({ userId });
        if (!patientProfile) {
            // Return 200 OK with empty list if patient profile is not created yet
            return res.status(200).json({
                success: true,
                count: 0,
                data: [],
            });
        }

        const appointments = await Appointment.find({ patientId: patientProfile._id })
            .populate({
                path: "doctorId",
                select: "specialization qualification hospital consultationFee consultationMode",
                populate: { path: "userId", select: "name email phone" },
            })
            .populate({
                path: "patientId",
                populate: { path: "userId", select: "name email phone" },
            })
            .sort({ appointmentDate: -1, startTime: 1 });

        return res.status(200).json({
            success: true,
            count: appointments.length,
            data: appointments,
        });
    } catch (error) {
        console.error("Error fetching patient appointments:", error.message);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching patient appointments",
            error: error.message,
        });
    }
};

/**
 * @desc    Get appointments for authenticated doctor
 * @route   GET /api/appointments/doctor
 * @access  Private (Doctor only)
 */
const getDoctorAppointments = async (req, res) => {
    try {
        const userId = req.user._id;

        const doctorProfile = await Doctor.findOne({ userId });
        if (!doctorProfile) {
            // Return 200 OK with empty list if doctor profile is not created yet
            return res.status(200).json({
                success: true,
                count: 0,
                data: [],
            });
        }

        const appointments = await Appointment.find({ doctorId: doctorProfile._id })
            .populate({
                path: "patientId",
                select: "dateOfBirth gender bloodGroup address emergencyContact profilePhoto",
                populate: { path: "userId", select: "name email phone" },
            })
            .populate({
                path: "doctorId",
                select: "specialization qualification hospital consultationFee consultationMode",
                populate: { path: "userId", select: "name email phone" },
            })
            .sort({ appointmentDate: -1, startTime: 1 });

        return res.status(200).json({
            success: true,
            count: appointments.length,
            data: appointments,
        });
    } catch (error) {
        console.error("Error fetching doctor appointments:", error.message);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching doctor appointments",
            error: error.message,
        });
    }
};

/**
 * @desc    Get single appointment details by ID
 * @route   GET /api/appointments/:id
 * @access  Private (Patient, Doctor, Admin)
 */
const getAppointmentById = async (req, res) => {
    try {
        const { id } = req.params;

        const appointment = await Appointment.findById(id)
            .populate({
                path: "patientId",
                select: "dateOfBirth gender bloodGroup address emergencyContact profilePhoto",
                populate: { path: "userId", select: "name email phone role" },
            })
            .populate({
                path: "doctorId",
                select: "specialization qualification registrationNumber experience hospital consultationFee consultationMode verificationStatus",
                populate: { path: "userId", select: "name email phone role" },
            });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: "Appointment not found.",
            });
        }

        // Ownership and Authorization check
        if (req.user.role === "PATIENT") {
            const patientProfile = await Patient.findOne({ userId: req.user._id });
            if (!patientProfile || !appointment.patientId._id.equals(patientProfile._id)) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied. You are not authorized to view this appointment.",
                });
            }
        } else if (req.user.role === "DOCTOR") {
            const doctorProfile = await Doctor.findOne({ userId: req.user._id });
            if (!doctorProfile || !appointment.doctorId._id.equals(doctorProfile._id)) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied. You are not authorized to view this appointment.",
                });
            }
        } else if (req.user.role !== "ADMIN") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Role not authorized to view appointments.",
            });
        }

        return res.status(200).json({
            success: true,
            data: appointment,
        });
    } catch (error) {
        console.error("Error fetching appointment details:", error.message);
        if (error.kind === "ObjectId") {
            return res.status(400).json({
                success: false,
                message: "Invalid appointment ID format.",
            });
        }
        return res.status(500).json({
            success: false,
            message: "Server error while fetching appointment details",
            error: error.message,
        });
    }
};

/**
 * @desc    Confirm an appointment (Doctor only)
 * @route   PATCH /api/appointments/:id/confirm
 * @access  Private (Doctor)
 */
const confirmAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const doctorProfile = await Doctor.findOne({ userId });
        if (!doctorProfile) {
            return res.status(404).json({
                success: false,
                message: "Doctor profile not found.",
            });
        }

        const appointment = await Appointment.findById(id);
        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: "Appointment not found.",
            });
        }

        if (!appointment.doctorId.equals(doctorProfile._id)) {
            return res.status(403).json({
                success: false,
                message: "Access denied. You can only confirm your own appointments.",
            });
        }

        if (appointment.status === "CONFIRMED") {
            return res.status(400).json({
                success: false,
                message: "Appointment is already confirmed.",
            });
        }

        if (["CANCELLED", "REJECTED", "COMPLETED"].includes(appointment.status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot confirm an appointment with status '${appointment.status}'.`,
            });
        }

        appointment.status = "CONFIRMED";
        await appointment.save();

        const updatedAppointment = await Appointment.findById(appointment._id)
            .populate({
                path: "patientId",
                populate: { path: "userId", select: "name email phone" },
            })
            .populate({
                path: "doctorId",
                select: "specialization qualification hospital consultationFee consultationMode",
                populate: { path: "userId", select: "name email phone" },
            });

        return res.status(200).json({
            success: true,
            message: "Appointment confirmed successfully.",
            data: updatedAppointment,
        });
    } catch (error) {
        console.error("Error confirming appointment:", error.message);
        if (error.name === "ValidationError") {
            return res.status(400).json({
                success: false,
                message: Object.values(error.errors).map((e) => e.message).join(". "),
            });
        }
        return res.status(500).json({
            success: false,
            message: error.message || "Server error while confirming appointment",
        });
    }
};

/**
 * @desc    Reject an appointment (Doctor only)
 * @route   PATCH /api/appointments/:id/reject
 * @access  Private (Doctor)
 */
const rejectAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const doctorProfile = await Doctor.findOne({ userId });
        if (!doctorProfile) {
            return res.status(404).json({
                success: false,
                message: "Doctor profile not found.",
            });
        }

        const appointment = await Appointment.findById(id);
        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: "Appointment not found.",
            });
        }

        if (!appointment.doctorId.equals(doctorProfile._id)) {
            return res.status(403).json({
                success: false,
                message: "Access denied. You can only reject your own appointments.",
            });
        }

        if (["CANCELLED", "REJECTED", "COMPLETED"].includes(appointment.status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot reject an appointment with status '${appointment.status}'.`,
            });
        }

        appointment.status = "REJECTED";
        await appointment.save();

        const updatedAppointment = await Appointment.findById(appointment._id)
            .populate({
                path: "patientId",
                populate: { path: "userId", select: "name email phone" },
            })
            .populate({
                path: "doctorId",
                select: "specialization qualification hospital consultationFee consultationMode",
                populate: { path: "userId", select: "name email phone" },
            });

        return res.status(200).json({
            success: true,
            message: "Appointment rejected successfully.",
            data: updatedAppointment,
        });
    } catch (error) {
        console.error("Error rejecting appointment:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Server error while rejecting appointment",
        });
    }
};

/**
 * @desc    Cancel an appointment (Patient for own appointment, Doctor for own appointment)
 * @route   PATCH /api/appointments/:id/cancel
 * @access  Private (Patient, Doctor)
 */
const cancelAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const appointment = await Appointment.findById(id);
        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: "Appointment not found.",
            });
        }

        let isAuthorized = false;

        if (req.user.role === "PATIENT") {
            const patientProfile = await Patient.findOne({ userId });
            if (patientProfile && appointment.patientId.equals(patientProfile._id)) {
                isAuthorized = true;
            }
        } else if (req.user.role === "DOCTOR") {
            const doctorProfile = await Doctor.findOne({ userId });
            if (doctorProfile && appointment.doctorId.equals(doctorProfile._id)) {
                isAuthorized = true;
            }
        } else if (req.user.role === "ADMIN") {
            isAuthorized = true;
        }

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: "Access denied. You can only cancel your own appointments.",
            });
        }

        if (["CANCELLED", "REJECTED", "COMPLETED"].includes(appointment.status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot cancel an appointment with status '${appointment.status}'.`,
            });
        }

        appointment.status = "CANCELLED";
        await appointment.save();

        const updatedAppointment = await Appointment.findById(appointment._id)
            .populate({
                path: "patientId",
                populate: { path: "userId", select: "name email phone" },
            })
            .populate({
                path: "doctorId",
                select: "specialization qualification hospital consultationFee consultationMode",
                populate: { path: "userId", select: "name email phone" },
            });

        return res.status(200).json({
            success: true,
            message: "Appointment cancelled successfully.",
            data: updatedAppointment,
        });
    } catch (error) {
        console.error("Error cancelling appointment:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Server error while cancelling appointment",
        });
    }
};

/**
 * @desc    Mark appointment as completed (Doctor only)
 * @route   PATCH /api/appointments/:id/complete
 * @access  Private (Doctor)
 */
const completeAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const doctorProfile = await Doctor.findOne({ userId });
        if (!doctorProfile) {
            return res.status(404).json({
                success: false,
                message: "Doctor profile not found.",
            });
        }

        const appointment = await Appointment.findById(id);
        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: "Appointment not found.",
            });
        }

        if (!appointment.doctorId.equals(doctorProfile._id)) {
            return res.status(403).json({
                success: false,
                message: "Access denied. You can only complete your own appointments.",
            });
        }

        if (appointment.status !== "CONFIRMED") {
            return res.status(400).json({
                success: false,
                message: `Only CONFIRMED appointments can be marked as COMPLETED. Current status: '${appointment.status}'.`,
            });
        }

        appointment.status = "COMPLETED";
        await appointment.save();

        const updatedAppointment = await Appointment.findById(appointment._id)
            .populate({
                path: "patientId",
                populate: { path: "userId", select: "name email phone" },
            })
            .populate({
                path: "doctorId",
                select: "specialization qualification hospital consultationFee consultationMode",
                populate: { path: "userId", select: "name email phone" },
            });

        return res.status(200).json({
            success: true,
            message: "Appointment completed successfully.",
            data: updatedAppointment,
        });
    } catch (error) {
        console.error("Error completing appointment:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Server error while completing appointment",
        });
    }
};

module.exports = {
    createAppointment,
    getPatientAppointments,
    getDoctorAppointments,
    getAppointmentById,
    confirmAppointment,
    rejectAppointment,
    cancelAppointment,
    completeAppointment,
};
