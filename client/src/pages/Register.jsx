import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register, verifyOtp, resendOtp } from "../services/api";

const Register = () => {
    const navigate = useNavigate();

    // Registration Step: 1 = Initial Details, 2 = OTP Verification
    const [step, setStep] = useState(1);

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        password: "",
        role: "PATIENT", // Default role
    });

    const [otpCode, setOtpCode] = useState("");
    const [errors, setErrors] = useState({});
    const [backendError, setBackendError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isResendingOtp, setIsResendingOtp] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: "" }));
        }
        if (backendError) setBackendError("");
    };

    const validateForm = () => {
        const newErrors = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^[0-9+()\s-]{7,15}$/;

        if (!formData.name.trim()) {
            newErrors.name = "Full name is required";
        }

        if (!formData.email.trim()) {
            newErrors.email = "Email address is required";
        } else if (!emailRegex.test(formData.email.trim())) {
            newErrors.email = "Please enter a valid email address";
        }

        if (!formData.phone.trim()) {
            newErrors.phone = "Phone number is required";
        } else if (!phoneRegex.test(formData.phone.trim())) {
            newErrors.phone = "Please enter a valid phone number";
        }

        if (!formData.password) {
            newErrors.password = "Password is required";
        } else if (formData.password.length < 6) {
            newErrors.password = "Password must be at least 6 characters";
        }

        if (!["PATIENT", "DOCTOR"].includes(formData.role)) {
            newErrors.role = "Please select a valid role (Patient or Doctor)";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsLoading(true);
        setBackendError("");
        setSuccessMessage("");

        try {
            const response = await register({
                name: formData.name.trim(),
                email: formData.email.trim(),
                phone: formData.phone.trim(),
                password: formData.password,
                role: formData.role,
            });

            setSuccessMessage(response.message || "Registration initiated! Please check your email for the OTP.");
            setStep(2); // Move to OTP verification step
        } catch (err) {
            setBackendError(err.message || "Registration failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtpSubmit = async (e) => {
        e.preventDefault();
        if (!otpCode.trim() || otpCode.trim().length !== 6) {
            setErrors({ otp: "Please enter the 6-digit OTP code sent to your email" });
            return;
        }

        setIsLoading(true);
        setBackendError("");
        setSuccessMessage("");

        try {
            const response = await verifyOtp({
                email: formData.email.trim(),
                otp: otpCode.trim(),
            });

            setSuccessMessage(response.message || "Account verified successfully!");

            // Redirect to login after 1.5 seconds
            setTimeout(() => {
                navigate("/login", { replace: true });
            }, 1500);
        } catch (err) {
            setBackendError(err.message || "OTP verification failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendOtp = async () => {
        setIsResendingOtp(true);
        setBackendError("");
        setSuccessMessage("");

        try {
            const response = await resendOtp({ email: formData.email.trim() });
            setSuccessMessage(response.message || "A new OTP code has been sent to your email.");
        } catch (err) {
            setBackendError(err.message || "Failed to resend OTP.");
        } finally {
            setIsResendingOtp(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F0E7D5] text-[#212842] flex items-center justify-center p-4 md:p-8">
            <div className="w-full max-w-5xl bg-[#FAF6EE] rounded-lg shadow-xl overflow-hidden border border-[#212842]/15 grid grid-cols-1 lg:grid-cols-12 min-h-[660px]">
                
                {/* Left Side: Healthcare Branding Panel (Midnight Indigo) */}
                <div className="lg:col-span-5 bg-[#212842] text-[#F0E7D5] p-8 md:p-12 flex flex-col justify-between relative">
                    <div>
                        {/* Healthcare Logo */}
                        <div className="flex items-center space-x-4 mb-8 pb-6 border-b border-[#F0E7D5]/15">
                            <img
                                src="/logo.jpg"
                                alt="AmedicK Official Logo"
                                className="w-14 h-14 object-cover border border-[#F0E7D5]/40 rounded-sm bg-[#FAF6EE]"
                            />
                            <div>
                                <span className="text-xl font-bold tracking-tight text-[#F0E7D5] block uppercase">
                                    AmedicK
                                </span>
                                <span className="text-[9px] text-[#F0E7D5]/80 tracking-wider uppercase block">
                                    CARE ROOTED IN COMPASSION
                                </span>
                                <span className="text-[10px] text-[#F0E7D5]/60 font-serif tracking-wide block mt-0.5">
                                    || सर्वे सन्तु निरामया: ||
                                </span>
                            </div>
                        </div>

                        <h1 className="text-2xl md:text-3xl font-serif font-bold leading-snug mb-4 text-[#F0E7D5]">
                            {step === 1 ? "Account Registration" : "Email Verification"}
                        </h1>
                        <p className="text-[#F0E7D5]/80 text-sm leading-relaxed mb-8">
                            {step === 1
                                ? "Register your authenticated portal account as a Patient or Doctor to access clinical workflows, appointments, and medical history."
                                : `A security OTP code was sent to ${formData.email}. Please enter it below to complete verification.`}
                        </p>
                    </div>

                    {/* Progress Step Indicator */}
                    <div className="pt-6 border-t border-[#F0E7D5]/15">
                        <div className="flex items-center justify-between text-xs text-[#F0E7D5]/70 mb-2 font-mono uppercase">
                            <span>Verification Progress</span>
                            <span className="font-bold text-[#F0E7D5]">Step {step} / 2</span>
                        </div>
                        <div className="w-full bg-[#181E32] h-1.5 rounded-none overflow-hidden">
                            <div
                                className="bg-[#F0E7D5] h-full transition-all duration-300"
                                style={{ width: step === 1 ? "50%" : "100%" }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Registration Form (Vanilla Cream) */}
                <div className="lg:col-span-7 p-8 md:p-12 flex flex-col justify-center bg-[#FAF6EE]">
                    <div className="max-w-md w-full mx-auto">
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-[#212842] tracking-tight">
                                {step === 1 ? "Create Account" : "Verify OTP Code"}
                            </h2>
                            <p className="text-[#212842]/70 text-sm mt-1">
                                {step === 1
                                    ? "Provide your details to register with AmedicK."
                                    : "Enter the 6-digit OTP verification code."}
                            </p>
                        </div>

                        {/* Error Alert */}
                        {backendError && (
                            <div className="mb-6 p-4 rounded-md bg-[#F0E7D5] border border-[#212842] text-[#212842] text-sm">
                                <span className="font-bold block mb-0.5">Registration Error</span>
                                <span>{backendError}</span>
                            </div>
                        )}

                        {/* Success Message Alert */}
                        {successMessage && (
                            <div className="mb-6 p-4 rounded-md bg-[#212842] text-[#F0E7D5] text-sm">
                                <span className="font-bold block mb-0.5">Status Update</span>
                                <span>{successMessage}</span>
                            </div>
                        )}

                        {/* STEP 1: REGISTRATION FORM */}
                        {step === 1 && (
                            <form onSubmit={handleRegisterSubmit} className="space-y-4" noValidate>
                                {/* Role Selection */}
                                <div>
                                    <label className="block text-xs font-bold text-[#212842] uppercase tracking-wider mb-2">
                                        Select Portal Role
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {/* Patient Card */}
                                        <button
                                            type="button"
                                            onClick={() => setFormData((prev) => ({ ...prev, role: "PATIENT" }))}
                                            className={`p-3.5 rounded-md border text-left transition-all cursor-pointer ${
                                                formData.role === "PATIENT"
                                                    ? "border-[#212842] border-2 bg-[#F0E7D5] text-[#212842]"
                                                    : "border-[#212842]/20 bg-[#FAF6EE] text-[#212842]/70 hover:border-[#212842]/40"
                                            }`}
                                        >
                                            <span className="block font-bold text-sm text-[#212842]">Patient</span>
                                            <span className="block text-[11px] text-[#212842]/70 mt-0.5">Personal Medical Portal</span>
                                        </button>

                                        {/* Doctor Card */}
                                        <button
                                            type="button"
                                            onClick={() => setFormData((prev) => ({ ...prev, role: "DOCTOR" }))}
                                            className={`p-3.5 rounded-md border text-left transition-all cursor-pointer ${
                                                formData.role === "DOCTOR"
                                                    ? "border-[#212842] border-2 bg-[#F0E7D5] text-[#212842]"
                                                    : "border-[#212842]/20 bg-[#FAF6EE] text-[#212842]/70 hover:border-[#212842]/40"
                                            }`}
                                        >
                                            <span className="block font-bold text-sm text-[#212842]">Doctor</span>
                                            <span className="block text-[11px] text-[#212842]/70 mt-0.5">Clinical Care Portal</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Full Name */}
                                <div>
                                    <label className="block text-xs font-bold text-[#212842] uppercase tracking-wider mb-1">
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="Dr. Sarah Jenkins"
                                        className={`w-full px-4 py-2.5 bg-[#F0E7D5] border ${
                                            errors.name ? "border-[#212842] font-semibold" : "border-[#212842]/30 focus:border-[#212842]"
                                        } rounded-md text-[#212842] text-sm focus:outline-none focus:ring-1 focus:ring-[#212842] transition`}
                                    />
                                    {errors.name && <p className="mt-1 text-xs text-[#212842] font-medium">{errors.name}</p>}
                                </div>

                                {/* Email Address */}
                                <div>
                                    <label className="block text-xs font-bold text-[#212842] uppercase tracking-wider mb-1">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="sarah@example.com"
                                        className={`w-full px-4 py-2.5 bg-[#F0E7D5] border ${
                                            errors.email ? "border-[#212842] font-semibold" : "border-[#212842]/30 focus:border-[#212842]"
                                        } rounded-md text-[#212842] text-sm focus:outline-none focus:ring-1 focus:ring-[#212842] transition`}
                                    />
                                    {errors.email && <p className="mt-1 text-xs text-[#212842] font-medium">{errors.email}</p>}
                                </div>

                                {/* Phone Number */}
                                <div>
                                    <label className="block text-xs font-bold text-[#212842] uppercase tracking-wider mb-1">
                                        Phone Number
                                    </label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        placeholder="+1 555 019 2834"
                                        className={`w-full px-4 py-2.5 bg-[#F0E7D5] border ${
                                            errors.phone ? "border-[#212842] font-semibold" : "border-[#212842]/30 focus:border-[#212842]"
                                        } rounded-md text-[#212842] text-sm focus:outline-none focus:ring-1 focus:ring-[#212842] transition`}
                                    />
                                    {errors.phone && <p className="mt-1 text-xs text-[#212842] font-medium">{errors.phone}</p>}
                                </div>

                                {/* Password */}
                                <div>
                                    <label className="block text-xs font-bold text-[#212842] uppercase tracking-wider mb-1">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            placeholder="••••••••"
                                            className={`w-full pl-4 pr-10 py-2.5 bg-[#F0E7D5] border ${
                                                errors.password ? "border-[#212842] font-semibold" : "border-[#212842]/30 focus:border-[#212842]"
                                            } rounded-md text-[#212842] text-sm focus:outline-none focus:ring-1 focus:ring-[#212842] transition`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#212842]/60 hover:text-[#212842] text-xs font-medium uppercase"
                                        >
                                            {showPassword ? "Hide" : "Show"}
                                        </button>
                                    </div>
                                    {errors.password && <p className="mt-1 text-xs text-[#212842] font-medium">{errors.password}</p>}
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full mt-2 py-3 px-6 bg-[#212842] hover:bg-[#181E32] text-[#F0E7D5] font-semibold rounded-md shadow-sm focus:outline-none transition duration-150 flex items-center justify-center space-x-2 disabled:opacity-60 cursor-pointer"
                                >
                                    {isLoading ? (
                                        <span>Dispatching OTP...</span>
                                    ) : (
                                        <span>Register & Request OTP</span>
                                    )}
                                </button>
                            </form>
                        )}

                        {/* STEP 2: OTP VERIFICATION FORM */}
                        {step === 2 && (
                            <form onSubmit={handleVerifyOtpSubmit} className="space-y-5" noValidate>
                                <div>
                                    <label className="block text-xs font-bold text-[#212842] uppercase tracking-wider mb-2">
                                        Enter 6-Digit OTP Code
                                    </label>
                                    <input
                                        type="text"
                                        maxLength="6"
                                        value={otpCode}
                                        onChange={(e) => {
                                            setOtpCode(e.target.value);
                                            if (errors.otp) setErrors({});
                                        }}
                                        placeholder="123456"
                                        className="w-full px-4 py-3 bg-[#F0E7D5] border border-[#212842] rounded-md text-center text-2xl font-bold tracking-widest text-[#212842] focus:outline-none focus:ring-1 focus:ring-[#212842] transition"
                                    />
                                    {errors.otp && <p className="mt-1 text-xs text-[#212842] font-medium">{errors.otp}</p>}
                                </div>

                                {/* Submit OTP Button */}
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-3 px-6 bg-[#212842] hover:bg-[#181E32] text-[#F0E7D5] font-semibold rounded-md shadow-sm focus:outline-none transition duration-150 flex items-center justify-center space-x-2 disabled:opacity-60 cursor-pointer"
                                >
                                    {isLoading ? (
                                        <span>Verifying Code...</span>
                                    ) : (
                                        <span>Verify & Complete Registration</span>
                                    )}
                                </button>

                                {/* Resend OTP & Back Link */}
                                <div className="flex items-center justify-between text-xs pt-2 border-t border-[#212842]/15">
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="text-[#212842] hover:underline font-medium"
                                    >
                                        ← Back to Registration Details
                                    </button>
                                    <button
                                        type="button"
                                        disabled={isResendingOtp}
                                        onClick={handleResendOtp}
                                        className="text-[#212842] font-bold underline disabled:opacity-50"
                                    >
                                        {isResendingOtp ? "Sending..." : "Resend OTP Code"}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Footer Login Link */}
                        <div className="mt-6 pt-5 border-t border-[#212842]/15 text-center">
                            <p className="text-xs text-[#212842]/70">
                                Already have an account?{" "}
                                <Link to="/login" className="font-bold text-[#212842] underline underline-offset-4">
                                    Sign In here
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Register;
