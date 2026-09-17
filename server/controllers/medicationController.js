const MedicationAdherence = require("../models/MedicationAdherence");
const Prescription = require("../models/Prescription");
const Patient = require("../models/Patient");
const mongoose = require("mongoose");

/**
 * Utility to parse frequency string and determine daily time slots
 */
const getTimeSlotsForFrequency = (freqString = "") => {
    const lower = freqString.toLowerCase();
    if (lower.includes("3x") || lower.includes("three") || lower.includes("thrice")) {
        return [
            { timeSlot: "Morning", scheduledTime: "08:00 AM" },
            { timeSlot: "Afternoon", scheduledTime: "02:00 PM" },
            { timeSlot: "Night", scheduledTime: "09:00 PM" },
        ];
    }
    if (lower.includes("2x") || lower.includes("two") || lower.includes("twice")) {
        return [
            { timeSlot: "Morning", scheduledTime: "08:00 AM" },
            { timeSlot: "Night", scheduledTime: "09:00 PM" },
        ];
    }
    if (lower.includes("evening") || lower.includes("afternoon")) {
        return [{ timeSlot: "Afternoon", scheduledTime: "02:00 PM" }];
    }
    if (lower.includes("night") || lower.includes("bedtime")) {
        return [{ timeSlot: "Night", scheduledTime: "09:00 PM" }];
    }
    return [{ timeSlot: "Morning", scheduledTime: "08:00 AM" }];
};

/**
 * @desc    Get today's medication schedule generated from active prescriptions
 * @route   GET /api/medications/schedule
 * @access  Private (Patient only)
 */
const getTodaySchedule = async (req, res) => {
    try {
        const userId = req.user._id;
        const patientProfile = await Patient.findOne({ userId });

        if (!patientProfile) {
            return res.status(404).json({
                success: false,
                message: "Patient profile not found.",
            });
        }

        const todayStr = new Date().toISOString().split("T")[0];

        // Fetch active digital prescriptions for patient
        const prescriptions = await Prescription.find({
            patientId: patientProfile._id,
        })
            .populate({
                path: "doctorId",
                select: "specialization qualification hospital",
                populate: { path: "userId", select: "name email" },
            })
            .sort({ createdAt: -1 });

        // Auto-generate today's schedule items if missing
        for (const rx of prescriptions) {
            for (const med of rx.medicines || []) {
                const slots = getTimeSlotsForFrequency(med.frequency);
                for (const slot of slots) {
                    try {
                        await MedicationAdherence.updateOne(
                            {
                                patientId: patientProfile._id,
                                prescriptionId: rx._id,
                                medicineName: med.name,
                                scheduledDate: todayStr,
                                timeSlot: slot.timeSlot,
                            },
                            {
                                $setOnInsert: {
                                    patientId: patientProfile._id,
                                    prescriptionId: rx._id,
                                    medicineName: med.name,
                                    dosage: med.dosage,
                                    frequency: med.frequency,
                                    duration: med.duration,
                                    instructions: med.instructions || rx.instructions || "",
                                    scheduledDate: todayStr,
                                    timeSlot: slot.timeSlot,
                                    scheduledTime: slot.scheduledTime,
                                    status: "PENDING",
                                },
                            },
                            { upsert: true }
                        );
                    } catch (err) {
                        // Ignore duplicate key collision on concurrent requests
                    }
                }
            }
        }

        // Retrieve today's medication schedule
        const todaySchedule = await MedicationAdherence.find({
            patientId: patientProfile._id,
            scheduledDate: todayStr,
        })
            .populate({
                path: "prescriptionId",
                select: "diagnosis doctorId createdAt",
                populate: {
                    path: "doctorId",
                    select: "specialization hospital",
                    populate: { path: "userId", select: "name" },
                },
            })
            .sort({ scheduledTime: 1 });

        return res.status(200).json({
            success: true,
            date: todayStr,
            count: todaySchedule.length,
            data: todaySchedule,
        });
    } catch (error) {
        console.error("Error fetching medication schedule:", error.message);
        return res.status(500).json({
            success: false,
            message: "Server error while generating medication schedule",
        });
    }
};

/**
 * @desc    Mark scheduled medication dose as TAKEN or SKIPPED
 * @route   POST /api/medications/status
 * @access  Private (Patient only)
 */
const updateMedicationStatus = async (req, res) => {
    try {
        const userId = req.user._id;
        const { adherenceId, status, notes } = req.body;

        if (!adherenceId || !["TAKEN", "SKIPPED", "PENDING"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid adherenceId and status ('TAKEN' or 'SKIPPED').",
            });
        }

        const patientProfile = await Patient.findOne({ userId });
        if (!patientProfile) {
            return res.status(403).json({
                success: false,
                message: "Access denied. Patient profile required.",
            });
        }

        const record = await MedicationAdherence.findById(adherenceId);
        if (!record) {
            return res.status(404).json({
                success: false,
                message: "Medication schedule record not found.",
            });
        }

        if (!record.patientId.equals(patientProfile._id)) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: You can only update your own medication log.",
            });
        }

        record.status = status;
        record.loggedAt = status === "PENDING" ? null : new Date();
        if (notes !== undefined) record.notes = notes;

        await record.save();

        return res.status(200).json({
            success: true,
            message: `Medication marked as ${status}.`,
            data: record,
        });
    } catch (error) {
        console.error("Error updating medication status:", error.message);
        return res.status(500).json({
            success: false,
            message: "Server error while logging medication adherence status",
        });
    }
};

/**
 * @desc    Get patient's full medication adherence history and analytics
 * @route   GET /api/medications/adherence
 * @access  Private (Patient, Doctor, Admin)
 */
const getAdherenceHistory = async (req, res) => {
    try {
        let patientId = null;

        if (req.user.role === "PATIENT") {
            const patientProfile = await Patient.findOne({ userId: req.user._id });
            if (patientProfile) patientId = patientProfile._id;
        } else if (req.query.patientId && mongoose.Types.ObjectId.isValid(req.query.patientId)) {
            patientId = req.query.patientId;
        }

        if (!patientId) {
            return res.status(200).json({
                success: true,
                metrics: { totalDoses: 0, taken: 0, skipped: 0, pending: 0, adherenceRate: 100 },
                data: [],
            });
        }

        const history = await MedicationAdherence.find({ patientId })
            .populate({
                path: "prescriptionId",
                select: "diagnosis doctorId",
                populate: {
                    path: "doctorId",
                    select: "specialization",
                    populate: { path: "userId", select: "name" },
                },
            })
            .sort({ scheduledDate: -1, createdAt: -1 });

        const totalDoses = history.length;
        const taken = history.filter((h) => h.status === "TAKEN").length;
        const skipped = history.filter((h) => h.status === "SKIPPED").length;
        const pending = history.filter((h) => h.status === "PENDING").length;

        const evaluatedDoses = taken + skipped;
        const adherenceRate = evaluatedDoses > 0 ? Math.round((taken / evaluatedDoses) * 100) : 100;

        return res.status(200).json({
            success: true,
            metrics: {
                totalDoses,
                taken,
                skipped,
                pending,
                adherenceRate,
            },
            data: history,
        });
    } catch (error) {
        console.error("Error fetching medication adherence history:", error.message);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching adherence history",
        });
    }
};

module.exports = {
    getTodaySchedule,
    updateMedicationStatus,
    getAdherenceHistory,
};
