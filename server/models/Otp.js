const mongoose = require("mongoose");

const otpExpireSeconds = parseInt(process.env.OTP_EXPIRE_SECONDS, 10);

const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
    },
    otp: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: otpExpireSeconds,
    },
});

const Otp = mongoose.model("Otp", otpSchema);

module.exports = Otp;
