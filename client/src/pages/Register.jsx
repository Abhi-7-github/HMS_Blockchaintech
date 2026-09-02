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
        <div className="min-h-screen bg-healthcare-gradient flex items-center justify-center p-4 md:p-8">
            <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 grid grid-cols-1 lg:grid-cols-12 min-h-[680px]">
                
                {/* Left Side: Healthcare Branding Panel */}
                <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-teal-950 to-sky-950 text-white p-8 md:p-12 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="absolute -left-16 -top-16 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>

                    <div>
                        {/* Healthcare Logo */}
                        <div className="flex items-center space-x-3 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-sky-400 flex items-center justify-center shadow-lg shadow-teal-500/30">
                                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                                </svg>
                            </div>
                            <div>
                                <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-sky-200 bg-clip-text text-transparent">
                                    AmedicK
                                </span>
                                <span className="block text-xs text-teal-400 font-medium tracking-wide uppercase">
                                    Healthcare System
                                </span>
                            </div>
                        </div>

                        <h1 className="text-3xl font-bold leading-tight mb-4 text-white">
                            {step === 1 ? "Join the Future of Medical Care" : "Email Verification Step"}
                        </h1>
                        <p className="text-slate-300 text-sm leading-relaxed mb-8">
                            {step === 1
                                ? "Create your verified portal account as a Patient or Doctor to manage clinical workflows, appointments, and medical history."
                                : `We've dispatched a security OTP to ${formData.email}. Please verify your identity to activate your account.`}
                        </p>
                    </div>

                    {/* Progress Indicator */}
                    <div className="pt-6 border-t border-slate-800/80">
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                            <span>Registration Progress</span>
                            <span className="font-semibold text-teal-400">Step {step} of 2</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div
                                className="bg-gradient-to-r from-teal-400 to-sky-400 h-full transition-all duration-500"
                                style={{ width: step === 1 ? "50%" : "100%" }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Registration Form */}
                <div className="lg:col-span-7 p-8 md:p-12 flex flex-col justify-center bg-white">
                    <div className="max-w-md w-full mx-auto">
                        <div className="mb-6">
                            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                                {step === 1 ? "Create Your Account" : "Verify Your Email"}
                            </h2>
                            <p className="text-slate-500 text-sm mt-1">
                                {step === 1
                                    ? "Fill in your information to start using AmedicK."
                                    : "Enter the 6-digit OTP code sent to your email address."}
                            </p>
                        </div>

                        {/* Backend Error Alert */}
                        {backendError && (
                            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-start space-x-3 text-rose-700 text-sm animate-fade-in">
                                <svg className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div className="flex-1">
                                    <span className="font-semibold block mb-0.5">Registration Error</span>
                                    <span>{backendError}</span>
                                </div>
                            </div>
                        )}

                        {/* Success Message Alert */}
                        {successMessage && (
                            <div className="mb-6 p-4 rounded-2xl bg-teal-50 border border-teal-200/80 flex items-start space-x-3 text-teal-800 text-sm animate-fade-in">
                                <svg className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                                <div className="flex-1">
                                    <span className="font-semibold block mb-0.5">Success</span>
                                    <span>{successMessage}</span>
                                </div>
                            </div>
                        )}

                        {/* STEP 1: INITIAL REGISTRATION FORM */}
                        {step === 1 && (
                            <form onSubmit={handleRegisterSubmit} className="space-y-4" noValidate>
                                {/* Role Selector Cards (Patient & Doctor ONLY) */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                                        Select Role
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {/* Patient Card */}
                                        <button
                                            type="button"
                                            onClick={() => setFormData((prev) => ({ ...prev, role: "PATIENT" }))}
                                            className={`p-3.5 rounded-2xl border text-left transition-all duration-200 flex items-center space-x-3 cursor-pointer ${
                                                formData.role === "PATIENT"
                                                    ? "border-sky-500 bg-sky-50/60 ring-2 ring-sky-200"
                                                    : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
                                            }`}
                                        >
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                                                formData.role === "PATIENT" ? "bg-sky-600 text-white" : "bg-slate-200 text-slate-600"
                                            }`}>
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <span className="block font-bold text-sm text-slate-900">Patient</span>
                                                <span className="block text-[11px] text-slate-500">Access Records</span>
                                            </div>
                                        </button>

                                        {/* Doctor Card */}
                                        <button
                                            type="button"
                                            onClick={() => setFormData((prev) => ({ ...prev, role: "DOCTOR" }))}
                                            className={`p-3.5 rounded-2xl border text-left transition-all duration-200 flex items-center space-x-3 cursor-pointer ${
                                                formData.role === "DOCTOR"
                                                    ? "border-teal-500 bg-teal-50/60 ring-2 ring-teal-200"
                                                    : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
                                            }`}
                                        >
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                                                formData.role === "DOCTOR" ? "bg-teal-600 text-white" : "bg-slate-200 text-slate-600"
                                            }`}>
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <span className="block font-bold text-sm text-slate-900">Doctor</span>
                                                <span className="block text-[11px] text-slate-500">Clinical Portal</span>
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                {/* Full Name */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="Dr. Sarah Jenkins"
                                        className={`w-full px-4 py-2.5 bg-slate-50 border ${
                                            errors.name ? "border-rose-500 focus:ring-rose-200" : "border-slate-200 focus:border-sky-500 focus:ring-sky-100"
                                        } rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-4 transition duration-200`}
                                    />
                                    {errors.name && <p className="mt-1 text-xs text-rose-500">{errors.name}</p>}
                                </div>

                                {/* Email Address */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="sarah@example.com"
                                        className={`w-full px-4 py-2.5 bg-slate-50 border ${
                                            errors.email ? "border-rose-500 focus:ring-rose-200" : "border-slate-200 focus:border-sky-500 focus:ring-sky-100"
                                        } rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-4 transition duration-200`}
                                    />
                                    {errors.email && <p className="mt-1 text-xs text-rose-500">{errors.email}</p>}
                                </div>

                                {/* Phone Number */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                        Phone Number
                                    </label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        placeholder="+1 555 019 2834"
                                        className={`w-full px-4 py-2.5 bg-slate-50 border ${
                                            errors.phone ? "border-rose-500 focus:ring-rose-200" : "border-slate-200 focus:border-sky-500 focus:ring-sky-100"
                                        } rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-4 transition duration-200`}
                                    />
                                    {errors.phone && <p className="mt-1 text-xs text-rose-500">{errors.phone}</p>}
                                </div>

                                {/* Password */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            placeholder="••••••••"
                                            className={`w-full pl-4 pr-11 py-2.5 bg-slate-50 border ${
                                                errors.password ? "border-rose-500 focus:ring-rose-200" : "border-slate-200 focus:border-sky-500 focus:ring-sky-100"
                                            } rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-4 transition duration-200`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                                        >
                                            {showPassword ? (
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.046 10.046 0 013.682-.763c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m-1.745 1.745A10.004 10.004 0 0112 19c-1.38 0-2.693-.28-3.875-.785m-5.858-5.908a9.97 9.97 0 01-1.563-3.029" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 3l18 18" />
                                                </svg>
                                            ) : (
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                    {errors.password && <p className="mt-1 text-xs text-rose-500">{errors.password}</p>}
                                </div>

                                {/* Submit Register Button */}
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full mt-2 py-3 px-6 bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-700 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg shadow-sky-600/25 hover:shadow-sky-600/35 focus:outline-none focus:ring-4 focus:ring-sky-200 transition duration-200 flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    {isLoading ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span>Sending OTP...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Register & Get OTP</span>
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                            </svg>
                                        </>
                                    )}
                                </button>
                            </form>
                        )}

                        {/* STEP 2: OTP VERIFICATION FORM */}
                        {step === 2 && (
                            <form onSubmit={handleVerifyOtpSubmit} className="space-y-5" noValidate>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
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
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-2xl font-bold tracking-widest text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition duration-200"
                                    />
                                    {errors.otp && <p className="mt-1.5 text-xs text-rose-500">{errors.otp}</p>}
                                </div>

                                {/* Submit OTP Button */}
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-3.5 px-6 bg-gradient-to-r from-teal-600 to-sky-600 hover:from-teal-700 hover:to-sky-700 text-white font-semibold rounded-xl shadow-lg shadow-teal-600/25 focus:outline-none focus:ring-4 focus:ring-teal-200 transition duration-200 flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    {isLoading ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span>Verifying Code...</span>
                                        </>
                                    ) : (
                                        <span>Verify & Complete Registration</span>
                                    )}
                                </button>

                                {/* Resend OTP & Back Action */}
                                <div className="flex items-center justify-between text-xs pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="text-slate-500 hover:text-slate-700 font-medium underline"
                                    >
                                        ← Back to Details
                                    </button>
                                    <button
                                        type="button"
                                        disabled={isResendingOtp}
                                        onClick={handleResendOtp}
                                        className="text-sky-600 hover:text-sky-700 font-semibold underline disabled:opacity-50"
                                    >
                                        {isResendingOtp ? "Sending..." : "Resend OTP Code"}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Footer Login Link */}
                        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
                            <p className="text-sm text-slate-600">
                                Already have an account?{" "}
                                <Link to="/login" className="font-semibold text-sky-600 hover:text-sky-700 underline underline-offset-4">
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
