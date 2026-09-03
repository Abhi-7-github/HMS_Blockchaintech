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
    const appName = process.env.APP_NAME || "AmedicK";
    const otpExpireMinutes = process.env.OTP_EXPIRE_MINUTES || 10;
    const emailSubject = `${appName} - Email Verification OTP`;
    const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #212842; text-align: center;">${appName}</h2>
            <p style="text-align: center; color: #7f8c8d; margin-top: -10px; font-size: 14px;">Hospital Management System</p>
            <hr style="border: 0; border-top: 1px solid #eeeeee;" />
            <p>Hello,</p>
            <p>Thank you for registering with <strong>${appName}</strong>. Please use the following One-Time Password (OTP) to complete your verification:</p>
            <div style="text-align: center; margin: 30px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #212842; background-color: #F0E7D5; padding: 10px 25px; border-radius: 6px; border: 1px dashed #212842; display: inline-block;">${otp}</span>
            </div>
            <p>This OTP is valid for <strong>${otpExpireMinutes} minutes</strong>. Do not share this code with anyone for security reasons.</p>
            <p>If you did not request this verification, please ignore this email.</p>
            <br/>
            <p style="font-size: 12px; color: #7f8c8d; text-align: center;">${appName} Team &copy; ${new Date().getFullYear()}</p>
        </div>
    `;

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log("\n========================================================");
        console.log(`[TEST MODE] SMTP Credentials not set in .env`);
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

/**
 * Sends notification email to doctor when profile & certificates are submitted (Status: PENDING)
 */
const sendDoctorPendingEmail = async (to, doctorName) => {
    const appName = process.env.APP_NAME || "AmedicK";
    const emailSubject = `${appName} - Doctor Profile Verification Pending`;
    const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #FAF6EE; color: #212842;">
            <h2 style="color: #212842; text-align: center; margin-bottom: 4px;">${appName}</h2>
            <p style="text-align: center; color: #7f8c8d; margin-top: 0; font-size: 13px; font-weight: bold; text-transform: uppercase;">CARE ROOTED IN COMPASSION</p>
            <hr style="border: 0; border-top: 1px solid #212842; opacity: 0.2;" />
            <p>Dear Dr. <strong>${doctorName}</strong>,</p>
            <p>Thank you for submitting your practitioner registration and verification documents with <strong>${appName} Hospital Management System</strong>.</p>
            <div style="background-color: #F0E7D5; padding: 15px; border-left: 4px solid #212842; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; font-weight: bold;">Status: VERIFICATION PENDING</p>
                <p style="margin: 5px 0 0 0; font-size: 13px;">Your clinical registration details and uploaded certificates are currently under review by our Grandmaster Administration desk.</p>
            </div>
            <p>You will receive an email notification once your profile verification status has been reviewed and accepted by administration.</p>
            <p>If you have any questions, please contact our support team.</p>
            <br/>
            <p style="font-size: 12px; color: #7f8c8d; text-align: center;">${appName} Medical Board &copy; ${new Date().getFullYear()}</p>
        </div>
    `;

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log(`[EMAIL EMULATOR] Doctor Verification Pending email sent to ${to}`);
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
        console.log(`Doctor Pending email sent to ${to}: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`Failed to send Doctor Pending email to ${to}:`, error.message);
    }
};

/**
 * Sends notification email to doctor when profile is APPROVED by admin
 */
const sendDoctorApprovedEmail = async (to, doctorName) => {
    const appName = process.env.APP_NAME || "AmedicK";
    const emailSubject = `${appName} - Doctor Profile Verification APPROVED`;
    const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #FAF6EE; color: #212842;">
            <h2 style="color: #212842; text-align: center; margin-bottom: 4px;">${appName}</h2>
            <p style="text-align: center; color: #7f8c8d; margin-top: 0; font-size: 13px; font-weight: bold; text-transform: uppercase;">CARE ROOTED IN COMPASSION</p>
            <hr style="border: 0; border-top: 1px solid #212842; opacity: 0.2;" />
            <p>Dear Dr. <strong>${doctorName}</strong>,</p>
            <p>Congratulations! We are pleased to inform you that your clinical profile and verification certificates have been <strong>APPROVED</strong> by the ${appName} Administration team.</p>
            <div style="background-color: #212842; color: #F0E7D5; padding: 15px; border-radius: 4px; margin: 20px 0; text-align: center;">
                <p style="margin: 0; font-weight: bold; font-size: 16px;">✓ VERIFICATION APPROVED</p>
                <p style="margin: 5px 0 0 0; font-size: 13px;">Full practitioner portal and clinical appointment features are now active on your account.</p>
            </div>
            <p>You can now sign in to your Doctor Portal to manage appointments, issue prescriptions, and access medical records.</p>
            <br/>
            <p style="font-size: 12px; color: #7f8c8d; text-align: center;">${appName} Medical Board &copy; ${new Date().getFullYear()}</p>
        </div>
    `;

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log(`[EMAIL EMULATOR] Doctor Approved email sent to ${to}`);
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
        console.log(`Doctor Approved email sent to ${to}: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`Failed to send Doctor Approved email to ${to}:`, error.message);
    }
};

/**
 * Sends notification email to doctor when profile is REJECTED by admin
 */
const sendDoctorRejectedEmail = async (to, doctorName, rejectionReason) => {
    const appName = process.env.APP_NAME || "AmedicK";
    const emailSubject = `${appName} - Doctor Verification Status Update`;
    const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #FAF6EE; color: #212842;">
            <h2 style="color: #212842; text-align: center; margin-bottom: 4px;">${appName}</h2>
            <p style="text-align: center; color: #7f8c8d; margin-top: 0; font-size: 13px; font-weight: bold; text-transform: uppercase;">CARE ROOTED IN COMPASSION</p>
            <hr style="border: 0; border-top: 1px solid #212842; opacity: 0.2;" />
            <p>Dear Dr. <strong>${doctorName}</strong>,</p>
            <p>Your doctor verification profile status has been reviewed by the ${appName} Administration team.</p>
            <div style="background-color: #F0E7D5; border-left: 4px solid #212842; padding: 15px; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 0; font-weight: bold; color: #212842;">Status: REJECTED</p>
                <p style="margin: 8px 0 0 0; font-size: 13px; color: #212842;"><strong>Reason provided by Administration:</strong></p>
                <p style="margin: 4px 0 0 0; font-size: 13px; font-style: italic; color: #212842;">"${rejectionReason}"</p>
            </div>
            <p>Please log in to your account to update your profile credentials or resubmit clear verification certificates for administrative re-evaluation.</p>
            <br/>
            <p style="font-size: 12px; color: #7f8c8d; text-align: center;">${appName} Medical Board &copy; ${new Date().getFullYear()}</p>
        </div>
    `;

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log(`[EMAIL EMULATOR] Doctor Rejected email sent to ${to}`);
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
        console.log(`Doctor Rejected email sent to ${to}: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`Failed to send Doctor Rejected email to ${to}:`, error.message);
    }
};

module.exports = {
    sendOTP,
    sendDoctorPendingEmail,
    sendDoctorApprovedEmail,
    sendDoctorRejectedEmail,
};
