const mongoose = require("mongoose");

const medicationAdherenceSchema = new mongoose.Schema(
    {
        patientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Patient",
            required: [true, "Patient reference is required"],
            index: true,
        },
        prescriptionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Prescription",
            required: [true, "Prescription reference is required"],
            index: true,
        },
        medicineName: {
            type: String,
            required: [true, "Medicine name is required"],
            trim: true,
        },
        dosage: {
            type: String,
            required: [true, "Dosage is required"],
            trim: true,
        },
        frequency: {
            type: String,
            required: [true, "Frequency is required"],
            trim: true,
        },
        duration: {
            type: String,
            trim: true,
            default: "As prescribed",
        },
        instructions: {
            type: String,
            trim: true,
            default: "",
        },
        scheduledDate: {
            type: String, // Format: YYYY-MM-DD
            required: [true, "Scheduled date is required"],
            index: true,
        },
        timeSlot: {
            type: String,
            enum: ["Morning", "Afternoon", "Evening", "Night"],
            default: "Morning",
        },
        scheduledTime: {
            type: String,
            default: "08:00 AM",
        },
        status: {
            type: String,
            enum: ["PENDING", "TAKEN", "SKIPPED"],
            default: "PENDING",
            index: true,
        },
        loggedAt: {
            type: Date,
            default: null,
        },
        notes: {
            type: String,
            trim: true,
            default: "",
        },
        // Extensible architecture for background notification triggers (Push / SMS / Email)
        notificationSent: {
            type: Boolean,
            default: false,
        },
        reminderChannel: {
            type: String,
            enum: ["IN_APP", "SMS", "EMAIL"],
            default: "IN_APP",
        },
    },
    {
        timestamps: true,
    }
);

// Compound index to prevent duplicate scheduled dose logs for same medicine, date, and slot
medicationAdherenceSchema.index(
    { patientId: 1, prescriptionId: 1, medicineName: 1, scheduledDate: 1, timeSlot: 1 },
    { unique: true }
);

const MedicationAdherence = mongoose.model("MedicationAdherence", medicationAdherenceSchema);

module.exports = MedicationAdherence;
