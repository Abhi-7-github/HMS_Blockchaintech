const mongoose = require("mongoose");

const doctorCertificateSchema = new mongoose.Schema(
    {
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Doctor",
            required: [true, "Doctor reference is required"],
            index: true, // Optimized for querying certificates by doctor
        },
        certificateType: {
            type: String,
            uppercase: true,
            trim: true,
            required: [true, "Certificate type is required"],
            enum: {
                values: ["MEDICAL_REGISTRATION", "DEGREE", "SPECIALIZATION", "IDENTITY", "OTHER"],
                message: "{VALUE} is not a valid certificate type",
            },
        },
        originalFileName: {
            type: String,
            required: [true, "Original file name is required"],
            trim: true,
        },
        cloudinaryPublicId: {
            type: String,
            required: [true, "Cloudinary public ID is required"],
            trim: true,
        },
        secureUrl: {
            type: String,
            required: [true, "Secure URL is required"],
            trim: true,
        },
        resourceType: {
            type: String,
            uppercase: true,
            trim: true,
            default: "RAW",
            enum: {
                values: ["RAW", "IMAGE", "AUTO"],
                message: "{VALUE} is not a valid Cloudinary resource type",
            },
        },
        uploadedAt: {
            type: Date,
            default: Date.now,
        },
        verificationStatus: {
            type: String,
            uppercase: true,
            trim: true,
            default: "PENDING",
            enum: {
                values: ["PENDING", "VERIFIED", "REJECTED"],
                message: "{VALUE} is not a valid verification status",
            },
        },
    },
    {
        timestamps: true, // Automatically manages createdAt and updatedAt
    }
);

// Compound index for efficient lookup of doctor certificates by type and status
doctorCertificateSchema.index({ doctorId: 1, certificateType: 1 });
doctorCertificateSchema.index({ doctorId: 1, verificationStatus: 1 });

const DoctorCertificate = mongoose.model("DoctorCertificate", doctorCertificateSchema);

module.exports = DoctorCertificate;
