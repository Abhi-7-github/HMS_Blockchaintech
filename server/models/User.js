const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
            match: [
                /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,})+$/,
                "Please provide a valid email address",
            ],
        },
        phone: {
            type: String,
            required: [true, "Phone number is required"],
            trim: true,
        },
        password: {
            type: String,
            required: [true, "Password is required"],
            select: false,
        },
        role: {
            type: String,
            required: [true, "Role is required"],
            enum: {
                values: ["PATIENT", "DOCTOR", "ADMIN", "PHARMACY"],
                message: "{VALUE} is not a valid role",
            },
            uppercase: true,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
