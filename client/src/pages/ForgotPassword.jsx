import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { forgotPassword, resetPassword } from "../services/api";

const ForgotPassword = () => {
    const navigate = useNavigate();

    // Step 1 = Request OTP, Step 2 = Enter OTP and New Password, Step 3 = Success Screen
    const [step, setStep] = useState(1);

    // Form inputs state
    const [selectedRole, setSelectedRole] = useState("PATIENT");
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // UI States
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [statusMessage, setStatusMessage] = useState({ type: "", text: "" });

    // Available roles for password reset
    const roles = [
        { id: "PATIENT", label: "Patient", icon: "👤", desc: "Personal Patient Account" },
        { id: "DOCTOR", label: "Doctor", icon: "🩺", desc: "Attending Clinical Practitioner" },
        { id: "PHARMACY", label: "Pharmacy", icon: "💊", desc: "Licensed Dispensing Pharmacy" },
    ];

    // Handle Step 1: Send OTP
    const handleSendOtp = async (e) => {
        if (e) e.preventDefault();
        setStatusMessage({ type: "", text: "" });

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email.trim()) {
            setStatusMessage({ type: "error", text: "Please enter your registered email address." });
            return;
        }
        if (!emailRegex.test(email.trim())) {
            setStatusMessage({ type: "error", text: "Please enter a valid email format." });
            return;
        }

        setIsLoading(true);
        try {
            const res = await forgotPassword({
                email: email.trim(),
                role: selectedRole,
            });

            setStatusMessage({
                type: "success",
                text: res.message || `A 6-digit OTP has been dispatched to ${email.trim()} for your ${selectedRole} account.`,
            });
            setStep(2);
        } catch (err) {
            setStatusMessage({
                type: "error",
                text: err.message || "Unable to send password reset OTP. Please check your email and selected role.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Handle Resend OTP in Step 2
    const handleResendOtp = async () => {
        setIsResending(true);
        setStatusMessage({ type: "", text: "" });
        try {
            const res = await forgotPassword({
                email: email.trim(),
                role: selectedRole,
            });
            setStatusMessage({
                type: "success",
                text: res.message || "A new 6-digit OTP has been sent to your email.",
            });
        } catch (err) {
            setStatusMessage({
                type: "error",
                text: err.message || "Failed to resend OTP. Please try again.",
            });
        } finally {
            setIsResending(false);
        }
    };

    // Handle Step 2: Verify OTP & Reset Password
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setStatusMessage({ type: "", text: "" });

        if (!otp.trim()) {
            setStatusMessage({ type: "error", text: "Please enter the 6-digit OTP code received in your email." });
            return;
        }

        if (otp.trim().length !== 6) {
            setStatusMessage({ type: "error", text: "OTP code must be exactly 6 digits." });
            return;
        }

        if (!newPassword) {
            setStatusMessage({ type: "error", text: "Please enter a new password." });
            return;
        }

        if (newPassword.length < 6) {
            setStatusMessage({ type: "error", text: "New password must be at least 6 characters long." });
            return;
        }

        if (newPassword !== confirmPassword) {
            setStatusMessage({ type: "error", text: "Passwords do not match. Please verify both fields." });
            return;
        }

        setIsLoading(true);
        try {
            const res = await resetPassword({
                email: email.trim(),
                role: selectedRole,
                otp: otp.trim(),
                newPassword,
            });

            setStatusMessage({
                type: "success",
                text: res.message || "Password updated successfully!",
            });
            setStep(3);

            // Redirect automatically after 2 seconds
            setTimeout(() => {
                navigate("/login", { replace: true });
            }, 2000);
        } catch (err) {
            setStatusMessage({
                type: "error",
                text: err.message || "Failed to reset password. Please verify the OTP code.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F0E7D5] text-[#212842] flex items-center justify-center p-4 md:p-8 font-sans">
            <div className="w-full max-w-4xl bg-[#FAF6EE] rounded-lg shadow-xl overflow-hidden border border-[#212842]/15 grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
                
                {/* Left Side: Healthcare Branding Panel */}
                <div className="lg:col-span-5 bg-[#212842] text-[#F0E7D5] p-8 md:p-10 flex flex-col justify-between relative border-r border-[#F0E7D5]/15">
                    <div>
                        {/* Healthcare Brand Header */}
                        <div className="flex items-center space-x-3 mb-6 pb-6 border-b border-[#F0E7D5]/15">
                            <img
                                src="/logo.jpg"
                                alt="AmedicK Official Logo"
                                className="w-12 h-12 object-cover border border-[#F0E7D5]/40 rounded-sm bg-[#FAF6EE]"
                            />
                            <div>
                                <span className="text-xl font-bold tracking-tight text-[#F0E7D5] block uppercase leading-none">
                                    AmedicK
                                </span>
                                <span className="text-[8px] text-[#F0E7D5]/80 tracking-widest uppercase block mt-1">
                                    CARE ROOTED IN COMPASSION
                                </span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <span className="inline-block px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider bg-[#F0E7D5] text-[#212842] rounded-sm font-bold">
                                Security Portal
                            </span>
                            <h2 className="text-2xl font-serif font-bold text-[#F0E7D5] leading-snug">
                                Secure Password Recovery
                            </h2>
                            <p className="text-xs text-[#F0E7D5]/80 leading-relaxed">
                                Self-service password recovery is available for all registered <strong>Patients</strong>, <strong>Doctors</strong>, and <strong>Pharmacies</strong> via one-time cryptographic email verification.
                            </p>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-[#F0E7D5]/15 space-y-3">
                        <div className="flex items-center space-x-2 text-[11px] text-[#F0E7D5]/70">
                            <span>🛡️</span>
                            <span>Protected by SHA-256 Multi-Factor OTP</span>
                        </div>
                        <div className="flex items-center space-x-2 text-[11px] text-[#F0E7D5]/70">
                            <span>⏱️</span>
                            <span>One-Time Codes Expire in 10 Minutes</span>
                        </div>
                        <Link
                            to="/login"
                            className="inline-block text-xs font-semibold text-[#F0E7D5] hover:text-white underline underline-offset-4 mt-2"
                        >
                            &larr; Return to Sign In
                        </Link>
                    </div>
                </div>

                {/* Right Side: Recovery Form */}
                <div className="lg:col-span-7 p-8 md:p-10 flex flex-col justify-center">
                    
                    {/* Header */}
                    <div className="mb-6">
                        <h3 className="text-2xl font-serif font-bold text-[#212842]">
                            {step === 1 && "Forgot Your Password?"}
                            {step === 2 && "Enter Verification OTP"}
                            {step === 3 && "Password Reset Complete"}
                        </h3>
                        <p className="text-xs text-[#212842]/70 mt-1">
                            {step === 1 && "Select your account role and enter your registered email address to receive a verification OTP."}
                            {step === 2 && `Enter the 6-digit OTP code sent to ${email} for your ${selectedRole} account.`}
                            {step === 3 && "Your password has been successfully reset. Redirecting to login..."}
                        </p>
                    </div>

                    {/* Status Alert Banner */}
                    {statusMessage.text && (
                        <div
                            className={`mb-6 p-3.5 rounded-sm border text-xs leading-relaxed ${
                                statusMessage.type === "error"
                                    ? "bg-red-50 border-red-700 text-red-800"
                                    : "bg-emerald-50 border-emerald-700 text-emerald-800"
                            }`}
                        >
                            <span className="font-bold block mb-0.5">
                                {statusMessage.type === "error" ? "Recovery Notice" : "Verification Sent"}
                            </span>
                            <span>{statusMessage.text}</span>
                        </div>
                    )}

                    {/* STEP 1: SELECT ROLE & EMAIL */}
                    {step === 1 && (
                        <form onSubmit={handleSendOtp} className="space-y-5" noValidate>
                            {/* Role Selection */}
                            <div>
                                <label className="block text-xs font-bold text-[#212842] uppercase tracking-wider mb-2">
                                    Account Role (Select One)
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {roles.map((r) => (
                                        <button
                                            key={r.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedRole(r.id);
                                                setStatusMessage({ type: "", text: "" });
                                            }}
                                            className={`p-3 text-left border rounded-sm transition cursor-pointer flex flex-col justify-between ${
                                                selectedRole === r.id
                                                    ? "bg-[#212842] text-[#F0E7D5] border-[#212842] shadow-sm"
                                                    : "bg-[#F0E7D5]/50 border-[#212842]/20 text-[#212842] hover:bg-[#F0E7D5]"
                                            }`}
                                        >
                                            <div className="text-base">{r.icon}</div>
                                            <div className="font-bold text-xs mt-1">{r.label}</div>
                                            <div className="text-[9px] opacity-75 hidden sm:block mt-0.5">{r.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Registered Email */}
                            <div>
                                <label className="block text-xs font-bold text-[#212842] uppercase tracking-wider mb-2">
                                    Registered Email Address
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        if (statusMessage.text) setStatusMessage({ type: "", text: "" });
                                    }}
                                    placeholder={`Enter your ${selectedRole.toLowerCase()} email`}
                                    className="w-full px-4 py-3 bg-[#F0E7D5] border border-[#212842]/30 rounded-md text-[#212842] text-sm focus:outline-none focus:ring-1 focus:ring-[#212842] focus:border-[#212842] transition"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 px-6 bg-[#212842] hover:bg-[#181E32] text-[#F0E7D5] font-semibold rounded-md shadow-sm transition flex items-center justify-center space-x-2 disabled:opacity-60 cursor-pointer"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-[#F0E7D5] border-t-transparent animate-spin rounded-full"></div>
                                        <span>Dispatching OTP Code...</span>
                                    </>
                                ) : (
                                    <span>Send Verification OTP &rarr;</span>
                                )}
                            </button>
                        </form>
                    )}

                    {/* STEP 2: VERIFY OTP & ENTER NEW PASSWORD */}
                    {step === 2 && (
                        <form onSubmit={handleResetPassword} className="space-y-4" noValidate>
                            {/* Role & Email Summary Badge */}
                            <div className="flex items-center justify-between p-3 bg-[#F0E7D5] border border-[#212842]/20 rounded-sm text-xs">
                                <div>
                                    <span className="font-bold text-[#212842] block">
                                        {selectedRole} Portal &bull; {email}
                                    </span>
                                    <span className="text-[10px] text-[#212842]/70">
                                        Check your inbox or spam folder for the 6-digit code.
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStep(1);
                                        setStatusMessage({ type: "", text: "" });
                                    }}
                                    className="text-[11px] font-bold text-[#212842] underline hover:text-black cursor-pointer"
                                >
                                    Change
                                </button>
                            </div>

                            {/* OTP Code */}
                            <div>
                                <label className="block text-xs font-bold text-[#212842] uppercase tracking-wider mb-1.5">
                                    6-Digit Verification OTP
                                </label>
                                <input
                                    type="text"
                                    maxLength="6"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                                    placeholder="e.g. 542198"
                                    className="w-full px-4 py-2.5 bg-[#F0E7D5] border border-[#212842]/30 rounded-md text-[#212842] text-center font-mono tracking-widest text-lg font-bold focus:outline-none focus:ring-1 focus:ring-[#212842] focus:border-[#212842] transition"
                                    required
                                />
                            </div>

                            {/* New Password */}
                            <div>
                                <label className="block text-xs font-bold text-[#212842] uppercase tracking-wider mb-1.5">
                                    New Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Minimum 6 characters"
                                        className="w-full pl-4 pr-12 py-2.5 bg-[#F0E7D5] border border-[#212842]/30 rounded-md text-[#212842] text-sm focus:outline-none focus:ring-1 focus:ring-[#212842] focus:border-[#212842] transition"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#212842]/60 hover:text-[#212842] text-xs font-semibold uppercase"
                                    >
                                        {showPassword ? "Hide" : "Show"}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm New Password */}
                            <div>
                                <label className="block text-xs font-bold text-[#212842] uppercase tracking-wider mb-1.5">
                                    Confirm New Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Re-type new password"
                                        className="w-full pl-4 pr-12 py-2.5 bg-[#F0E7D5] border border-[#212842]/30 rounded-md text-[#212842] text-sm focus:outline-none focus:ring-1 focus:ring-[#212842] focus:border-[#212842] transition"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#212842]/60 hover:text-[#212842] text-xs font-semibold uppercase"
                                    >
                                        {showConfirmPassword ? "Hide" : "Show"}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 px-6 bg-[#212842] hover:bg-[#181E32] text-[#F0E7D5] font-semibold rounded-md shadow-sm transition flex items-center justify-center space-x-2 disabled:opacity-60 cursor-pointer mt-2"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-[#F0E7D5] border-t-transparent animate-spin rounded-full"></div>
                                        <span>Updating Password...</span>
                                    </>
                                ) : (
                                    <span>Verify OTP & Reset Password</span>
                                )}
                            </button>

                            <div className="text-center pt-2">
                                <button
                                    type="button"
                                    onClick={handleResendOtp}
                                    disabled={isResending}
                                    className="text-xs font-bold text-[#212842] hover:underline cursor-pointer disabled:opacity-50"
                                >
                                    {isResending ? "Resending code..." : "Didn't receive code? Resend OTP"}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* STEP 3: SUCCESS */}
                    {step === 3 && (
                        <div className="text-center py-6 space-y-4">
                            <div className="w-16 h-16 bg-emerald-100 border border-emerald-600 text-emerald-700 rounded-full flex items-center justify-center text-3xl mx-auto shadow-sm">
                                ✓
                            </div>
                            <h4 className="text-xl font-serif font-bold text-[#212842]">
                                Password Successfully Reset!
                            </h4>
                            <p className="text-xs text-[#212842]/80 max-w-sm mx-auto">
                                Your new password has been hashed and updated on the AmedicK system for your <strong>{selectedRole}</strong> account.
                            </p>
                            <div className="pt-4">
                                <Link
                                    to="/login"
                                    className="inline-block py-2.5 px-6 bg-[#212842] text-[#F0E7D5] font-bold text-xs uppercase rounded-sm hover:bg-[#181E32] transition"
                                >
                                    Sign In With New Password
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* Bottom Back to Login Link */}
                    {step !== 3 && (
                        <div className="mt-8 pt-4 border-t border-[#212842]/15 text-center">
                            <p className="text-xs text-[#212842]/70">
                                Remember your password?{" "}
                                <Link to="/login" className="font-bold text-[#212842] underline underline-offset-4">
                                    Sign in here
                                </Link>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
