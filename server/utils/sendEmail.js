const nodemailer = require("nodemailer");

/**
 * Creates Nodemailer Transporter dynamically from process.env.
 */
const createTransporter = () => {
    const port = parseInt(process.env.EMAIL_PORT, 10);
    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port,
        secure: port === 465,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
};

/**
 * Sends OTP Email to user using process.env configuration.
 * @param {string} to - Recipient email address
 * @param {string} otp - OTP code
 */
const sendOTP = async (to, otp) => {
    const appName = process.env.APP_NAME;
    const otpExpireMinutes = process.env.OTP_EXPIRE_MINUTES;
    const emailSubject = `${appName} - Email Verification OTP`;
    const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; borderRadius: 8px;">
            <h2 style="color: #2c3e50; text-align: center;">${appName}</h2>
            <p style="text-align: center; color: #7f8c8d; margin-top: -10px; font-size: 14px;">Hospital Management System</p>
            <hr style="border: 0; border-top: 1px solid #eeeeee;" />
            <p>Hello,</p>
            <p>Thank you for registering with <strong>${appName}</strong>. Please use the following One-Time Password (OTP) to complete your verification:</p>
            <div style="text-align: center; margin: 30px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #3498db; background-color: #f8f9fa; padding: 10px 25px; border-radius: 6px; border: 1px dashed #3498db; display: inline-block;">${otp}</span>
            </div>
            <p>This OTP is valid for <strong>${otpExpireMinutes} minutes</strong>. Do not share this code with anyone for security reasons.</p>
            <p>If you did not request this verification, please ignore this email.</p>
            <br/>
            <p style="font-size: 12px; color: #7f8c8d; text-align: center;">${appName} Team &copy; ${new Date().getFullYear()}</p>
        </div>
    `;

    // Check if email credentials are configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log("\n========================================================");
        console.log(`[DEVELOPMENT / TEST MODE] SMTP Credentials not set in .env`);
        console.log(`[OTP EMULATOR] OTP for ${to}: ${otp}`);
        console.log("========================================================\n");
        return { success: true, simulated: true };
    }

    try {
        const transporter = createTransporter();
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to,
            subject: emailSubject,
            html: emailHtml,
        });

        console.log(`OTP Email sent to ${to}: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`Failed to send OTP email to ${to}:`, error.message);
        throw error;
    }
};

module.exports = {
    sendOTP,
};
