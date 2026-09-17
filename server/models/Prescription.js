const mongoose = require("mongoose");
const crypto = require("crypto");

/**
 * Sub-schema for medicines included in a digital prescription
 */
const medicineSchema = new mongoose.Schema(
    {
        name: {
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
            required: [true, "Duration is required"],
            trim: true,
        },
        instructions: {
            type: String,
            trim: true,
            default: "",
        },
    },
    { _id: false }
);

const prescriptionSchema = new mongoose.Schema(
    {
        patientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Patient",
            required: [true, "Patient reference is required"],
            index: true,
        },
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Doctor",
            required: [true, "Doctor reference is required"],
            index: true,
        },
        appointmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Appointment",
            required: [true, "Appointment reference is required"],
            index: true,
        },
        diagnosis: {
            type: String,
            required: [true, "Diagnosis is required"],
            trim: true,
        },
        medicines: {
            type: [medicineSchema],
            validate: {
                validator: function (v) {
                    return Array.isArray(v) && v.length > 0;
                },
                message: "Prescription must contain at least one medicine",
            },
        },
        instructions: {
            type: String,
            trim: true,
            default: "",
        },
        validUntil: {
            type: Date,
            required: [true, "Validity expiration date (validUntil) is required"],
        },
        prescriptionHash: {
            type: String,
            required: [true, "Prescription SHA-256 hash is required"],
            trim: true,
            lowercase: true,
        },
        blockchainRecordId: {
            type: String,
            trim: true,
            default: "",
        },
        blockchainTransactionHash: {
            type: String,
            trim: true,
            default: "",
        },
    },
    {
        timestamps: true, // Automatically manages createdAt and updatedAt
    }
);

// Compound indexes for optimal lookup performance
prescriptionSchema.index({ patientId: 1, createdAt: -1 });
prescriptionSchema.index({ doctorId: 1, createdAt: -1 });
prescriptionSchema.index({ prescriptionHash: 1 });

/**
 * Deterministically generates SHA-256 hash for prescription's canonical content
 */
const generatePrescriptionHash = (data) => {
    const canonicalMedicines = (data.medicines || []).map((m) => ({
        name: (m.name || "").trim(),
        dosage: (m.dosage || "").trim(),
        frequency: (m.frequency || "").trim(),
        duration: (m.duration || "").trim(),
        instructions: (m.instructions || "").trim(),
    }));

    const payload = JSON.stringify({
        patientId: data.patientId ? data.patientId.toString() : "",
        doctorId: data.doctorId ? data.doctorId.toString() : "",
        appointmentId: data.appointmentId ? data.appointmentId.toString() : "",
        diagnosis: (data.diagnosis || "").trim(),
        medicines: canonicalMedicines,
        instructions: (data.instructions || "").trim(),
        validUntil: data.validUntil ? new Date(data.validUntil).toISOString() : "",
    });

    return crypto.createHash("sha256").update(payload).digest("hex");
};

// Pre-validate hook to automatically generate deterministic prescriptionHash
prescriptionSchema.pre("validate", function () {
    if (this.patientId && this.doctorId && this.appointmentId && this.diagnosis && this.medicines && this.validUntil) {
        if (!this.prescriptionHash || this.isModified("diagnosis") || this.isModified("medicines") || this.isModified("validUntil")) {
            this.prescriptionHash = generatePrescriptionHash(this);
        }
    }
});

const Prescription = mongoose.model("Prescription", prescriptionSchema);
Prescription.generatePrescriptionHash = generatePrescriptionHash;

module.exports = Prescription;
