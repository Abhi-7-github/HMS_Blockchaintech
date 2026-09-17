const { SECURITY_DEFAULTS, DEFAULT_ALLOWED_REGISTER_ROLES } = require("./constants");

/**
 * Centralized Environment & Config Manager
 */
const envConfig = Object.freeze({
    PORT: parseInt(process.env.PORT || String(SECURITY_DEFAULTS.PORT), 10),
    MONGODB_URI: process.env.MONGODB_URI || "",
    APP_NAME: process.env.APP_NAME || "AmedicK",

    // Email Config
    EMAIL_HOST: process.env.EMAIL_HOST || "smtp.gmail.com",
    EMAIL_PORT: parseInt(process.env.EMAIL_PORT || "587", 10),
    EMAIL_USER: process.env.EMAIL_USER || "",
    EMAIL_PASS: process.env.EMAIL_PASS || "",
    EMAIL_FROM: process.env.EMAIL_FROM || "",

    // Security & Validation
    BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS || String(SECURITY_DEFAULTS.BCRYPT_SALT_ROUNDS), 10),
    PASSWORD_MIN_LENGTH: parseInt(process.env.PASSWORD_MIN_LENGTH || String(SECURITY_DEFAULTS.PASSWORD_MIN_LENGTH), 10),
    OTP_EXPIRE_MINUTES: parseInt(process.env.OTP_EXPIRE_MINUTES || String(SECURITY_DEFAULTS.OTP_EXPIRE_MINUTES), 10),
    OTP_EXPIRE_SECONDS: parseInt(process.env.OTP_EXPIRE_SECONDS || String(SECURITY_DEFAULTS.OTP_EXPIRE_SECONDS), 10),
    ALLOWED_SELF_REGISTER_ROLES: process.env.ALLOWED_SELF_REGISTER_ROLES
        ? process.env.ALLOWED_SELF_REGISTER_ROLES.split(",").map((r) => r.trim().toUpperCase())
        : DEFAULT_ALLOWED_REGISTER_ROLES,

    // JWT Config
    JWT_SECRET: process.env.JWT_SECRET || "",
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || SECURITY_DEFAULTS.JWT_EXPIRES_IN,

    // Cloudinary Config (Never expose CLOUDINARY_API_SECRET to client/React)
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || "",
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || "",
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || "",
    CLOUDINARY_FOLDER: process.env.CLOUDINARY_FOLDER || "amedick/doctor-certificates",
    MAX_CERTIFICATE_FILE_SIZE_BYTES: parseInt(
        process.env.MAX_CERTIFICATE_FILE_SIZE_BYTES || "5242880", // Default 5 MB
        10
    ),

    // Blockchain Configuration (Backend-Only - Never expose BLOCKCHAIN_PRIVATE_KEY to client)
    BLOCKCHAIN_RPC_URL: process.env.BLOCKCHAIN_RPC_URL || "http://127.0.0.1:8545",
    BLOCKCHAIN_PRIVATE_KEY: process.env.BLOCKCHAIN_PRIVATE_KEY || "",
    HEALTHBRIDGE_CONTRACT_ADDRESS: process.env.HEALTHBRIDGE_CONTRACT_ADDRESS || "",

    // AI Health Assistant Config (Server-Side Only - Never expose to client/React)
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || process.env.AI_API_KEY || "",
});


module.exports = envConfig;
