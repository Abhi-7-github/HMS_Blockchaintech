const mongoose = require("mongoose");

const emergencyContactSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Emergency contact name is required"],
            trim: true,
        },
        relationship: {
            type: String,
            required: [true, "Emergency contact relationship is required"],
            trim: true,
        },
        phone: {
            type: String,
            required: [true, "Emergency contact phone is required"],
            trim: true,
        },
    },
    { _id: false }
);

const patientSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "User reference is required"],
            unique: true, // Guarantees 1-to-1 User-to-Patient profile relationship
        },
        dateOfBirth: {
            type: Date,
            required: [true, "Date of birth is required"],
            validate: {
                validator: function (value) {
                    return value && new Date(value) < new Date();
                },
                message: "Date of birth must be a date in the past",
            },
        },
        gender: {
            type: String,
            required: [true, "Gender is required"],
            uppercase: true,
            enum: {
                values: ["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"],
                message: "{VALUE} is not a valid gender option",
            },
            trim: true,
        },
        bloodGroup: {
            type: String,
            uppercase: true,
            enum: {
                values: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
                message: "{VALUE} is not a valid blood group",
            },
            trim: true,
            default: null,
        },
        address: {
            type: String,
            required: [true, "Address is required"],
            trim: true,
        },
        emergencyContact: {
            type: emergencyContactSchema,
            required: [true, "Emergency contact details are required"],
        },
        profilePhoto: {
            type: String,
            trim: true,
            default: "",
        },
    },
    {
        timestamps: true, // Automatically manages createdAt and updatedAt
    }
);

const Patient = mongoose.model("Patient", patientSchema);

module.exports = Patient;
