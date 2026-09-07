const Prescription = require("../models/Prescription");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const Appointment = require("../models/Appointment");

/**
 * @desc    Create a new digital prescription for an appointment
 * @route   POST /api/prescriptions
 * @access  Private (Doctor only)
 */
const createPrescription = async (req, res) => {
    try {
        const userId = req.user._id;

        // 1. Fetch Doctor profile
        const doctorProfile = await Doctor.findOne({ userId });
        if (!doctorProfile) {
            return res.status(404).json({
                success: false,
                message: "Doctor profile not found.",
            });
        }

        // 2. Requirement 1: Only VERIFIED doctors can create prescriptions
        if (doctorProfile.verificationStatus !== "VERIFIED") {
            return res.status(400).json({
                success: false,
                message: "Only VERIFIED doctors can create prescriptions.",
            });
        }

        const { appointmentId, diagnosis, medicines, instructions, validUntil } = req.body;

        // 3. Validate input parameters
        if (!appointmentId || !diagnosis || !medicines || !validUntil) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required fields: appointmentId, diagnosis, medicines, validUntil",
            });
        }

        if (!Array.isArray(medicines) || medicines.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Prescription must contain at least one medicine with name, dosage, frequency, and duration.",
            });
        }

        // Validate individual medicine structure
        for (const med of medicines) {
            if (!med.name || !med.dosage || !med.frequency || !med.duration) {
                return res.status(400).json({
                    success: false,
                    message: "Each medicine must include: name, dosage, frequency, and duration.",
                });
            }
        }

        // 4. Requirement 2: Prescription must be associated with an appointment
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: "Associated appointment not found.",
            });
        }

        // Check if doctor owns the appointment
        if (!appointment.doctorId.equals(doctorProfile._id)) {
            return res.status(403).json({
                success: false,
                message: "Access denied. You can only create prescriptions for your own appointments.",
            });
        }

        const patientId = appointment.patientId;

        // 5. Requirement 5: Generate deterministic SHA-256 hash
        const prescriptionHash = Prescription.generatePrescriptionHash({
            patientId,
            doctorId: doctorProfile._id,
            appointmentId: appointment._id,
            diagnosis: diagnosis.trim(),
            medicines,
            instructions: instructions ? instructions.trim() : "",
            validUntil,
        });

        // 6. Create Prescription instance
        const prescription = new Prescription({
            patientId,
            doctorId: doctorProfile._id,
            appointmentId: appointment._id,
            diagnosis: diagnosis.trim(),
            medicines,
            instructions: instructions ? instructions.trim() : "",
            validUntil,
            prescriptionHash,
            blockchainRecordId: "",
            blockchainTransactionHash: "",
        });

        await prescription.save();

        // 7. Populate details for response
        const populatedPrescription = await Prescription.findById(prescription._id)
            .populate({
                path: "patientId",
                populate: { path: "userId", select: "name email phone" },
            })
            .populate({
                path: "doctorId",
                select: "specialization qualification hospital consultationFee",
                populate: { path: "userId", select: "name email phone" },
            })
            .populate("appointmentId", "appointmentDate startTime endTime consultationMode status");

        return res.status(201).json({
            success: true,
            message: "Digital prescription created successfully.",
            data: populatedPrescription,
        });
    } catch (error) {
        console.error("Error creating prescription:", error.message);
        if (error.name === "ValidationError") {
            return res.status(400).json({
                success: false,
                message: Object.values(error.errors).map((e) => e.message).join(". "),
            });
        }
        return res.status(500).json({
            success: false,
            message: error.message || "Server error while creating prescription",
        });
    }
};

/**
 * @desc    Get prescriptions for authenticated patient
 * @route   GET /api/prescriptions/patient
 * @access  Private (Patient only)
 */
const getPatientPrescriptions = async (req, res) => {
    try {
        const userId = req.user._id;

        const patientProfile = await Patient.findOne({ userId });
        if (!patientProfile) {
            return res.status(200).json({
                success: true,
                count: 0,
                data: [],
            });
        }

        const prescriptions = await Prescription.find({ patientId: patientProfile._id })
            .populate({
                path: "doctorId",
                select: "specialization qualification hospital consultationFee",
                populate: { path: "userId", select: "name email phone" },
            })
            .populate({
                path: "patientId",
                populate: { path: "userId", select: "name email phone" },
            })
            .populate("appointmentId", "appointmentDate startTime endTime consultationMode status")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: prescriptions.length,
            data: prescriptions,
        });
    } catch (error) {
        console.error("Error fetching patient prescriptions:", error.message);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching patient prescriptions",
            error: error.message,
        });
    }
};

/**
 * @desc    Get prescriptions created by authenticated doctor
 * @route   GET /api/prescriptions/doctor
 * @access  Private (Doctor only)
 */
const getDoctorPrescriptions = async (req, res) => {
    try {
        const userId = req.user._id;

        const doctorProfile = await Doctor.findOne({ userId });
        if (!doctorProfile) {
            return res.status(200).json({
                success: true,
                count: 0,
                data: [],
            });
        }

        const prescriptions = await Prescription.find({ doctorId: doctorProfile._id })
            .populate({
                path: "patientId",
                select: "dateOfBirth gender bloodGroup address emergencyContact",
                populate: { path: "userId", select: "name email phone" },
            })
            .populate({
                path: "doctorId",
                select: "specialization qualification hospital",
                populate: { path: "userId", select: "name email phone" },
            })
            .populate("appointmentId", "appointmentDate startTime endTime consultationMode status")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: prescriptions.length,
            data: prescriptions,
        });
    } catch (error) {
        console.error("Error fetching doctor prescriptions:", error.message);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching doctor prescriptions",
            error: error.message,
        });
    }
};

/**
 * @desc    Get single prescription details by ID
 * @route   GET /api/prescriptions/:id
 * @access  Private (Patient, Doctor, Admin)
 */
const getPrescriptionById = async (req, res) => {
    try {
        const { id } = req.params;

        const prescription = await Prescription.findById(id)
            .populate({
                path: "patientId",
                select: "dateOfBirth gender bloodGroup address emergencyContact",
                populate: { path: "userId", select: "name email phone role" },
            })
            .populate({
                path: "doctorId",
                select: "specialization qualification registrationNumber hospital consultationFee",
                populate: { path: "userId", select: "name email phone role" },
            })
            .populate("appointmentId", "appointmentDate startTime endTime consultationMode status");

        if (!prescription) {
            return res.status(404).json({
                success: false,
                message: "Prescription not found.",
            });
        }

        // Ownership and Authorization Check
        if (req.user.role === "PATIENT") {
            const patientProfile = await Patient.findOne({ userId: req.user._id });
            if (!patientProfile || !prescription.patientId._id.equals(patientProfile._id)) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied. You are not authorized to view this prescription.",
                });
            }
        } else if (req.user.role === "DOCTOR") {
            const doctorProfile = await Doctor.findOne({ userId: req.user._id });
            if (!doctorProfile || !prescription.doctorId._id.equals(doctorProfile._id)) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied. You are not authorized to view this prescription.",
                });
            }
        } else if (req.user.role !== "ADMIN") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Role not authorized to view prescriptions.",
            });
        }

        return res.status(200).json({
            success: true,
            data: prescription,
        });
    } catch (error) {
        console.error("Error fetching prescription details:", error.message);
        if (error.kind === "ObjectId") {
            return res.status(400).json({
                success: false,
                message: "Invalid prescription ID format.",
            });
        }
        return res.status(500).json({
            success: false,
            message: "Server error while fetching prescription details",
            error: error.message,
        });
    }
};

module.exports = {
    createPrescription,
    getPatientPrescriptions,
    getDoctorPrescriptions,
    getPrescriptionById,
};
