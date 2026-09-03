const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "User reference is required"],
            unique: true, // Guarantees 1-to-1 User-to-Doctor profile relationship
        },
        specialization: {
            type: String,
            required: [true, "Specialization is required"],
            trim: true,
        },
        qualification: {
            type: String,
            required: [true, "Qualification is required"],
            trim: true,
        },
        registrationNumber: {
            type: String,
            required: [true, "Medical registration number is required"],
            unique: true, // Guarantees unique medical registration number across all doctors
            trim: true,
        },
        experience: {
            type: Number,
            required: [true, "Years of experience is required"],
            min: [0, "Experience cannot be negative"],
        },
        hospital: {
            type: String,
            required: [true, "Associated hospital/clinic name is required"],
            trim: true,
        },
        consultationFee: {
            type: Number,
            required: [true, "Consultation fee is required"],
            min: [0, "Consultation fee cannot be negative"],
        },
        languages: {
            type: [String],
            default: ["English"],
        },
        consultationMode: {
            type: String,
            uppercase: true,
            enum: {
                values: ["ONLINE", "IN_PERSON", "BOTH"],
                message: "{VALUE} is not a valid consultation mode",
            },
            default: "BOTH",
        },
        verificationStatus: {
            type: String,
            uppercase: true,
            enum: {
                values: ["PENDING", "VERIFIED", "REJECTED"],
                message: "{VALUE} is not a valid verification status",
            },
            default: "PENDING", // Requirement 3: New doctors must start as PENDING
        },
        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        verifiedAt: {
            type: Date,
            default: null,
        },
        rejectionReason: {
            type: String,
            trim: true,
            default: "",
        },
    },
    {
        timestamps: true, // Automatically manages createdAt and updatedAt
    }
);

const Doctor = mongoose.model("Doctor", doctorSchema);

module.exports = Doctor;
