import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    register,
    verifyOtp,
    resendOtp,
    login,
    createDoctorProfile,
    uploadDoctorCertificate,
} from "../services/api";

const Register = () => {
    const navigate = useNavigate();

    // Registration Step: 1 = Details Input, 2 = OTP Verification, 3 = Doctor Verification Pending Screen
    const [step, setStep] = useState(1);

    // Form data state
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        password: "",
        role: "PATIENT", // Default role
    });

    // Doctor Essentials Fields (Required if role === "DOCTOR")
    const [doctorFields, setDoctorFields] = useState({
        specialization: "Cardiology",
        qualification: "MBBS, MD",
        registrationNumber: "",
        experience: "5",
        hospital: "Central General Hospital",
        consultationFee: "100",
        consultationMode: "BOTH",
        languages: "English",
        certificateType: "MEDICAL_REGISTRATION",
    });

    // Certificate File state
    const [certificateFile, setCertificateFile] = useState(null);

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
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
        if (backendError) setBackendError("");
    };

    const handleDoctorFieldChange = (e) => {
        const { name, value } = e.target;
        setDoctorFields((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
        if (backendError) setBackendError("");
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file size & extension
            const allowedExts = ["pdf", "jpg", "jpeg", "png"];
            const ext = file.name.split(".").pop().toLowerCase();
            if (!allowedExts.includes(ext)) {
                setErrors((prev) => ({ ...prev, certificateFile: "Only PDF, JPG, JPEG, or PNG files are allowed." }));
                setCertificateFile(null);
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                setErrors((prev) => ({ ...prev, certificateFile: "File size exceeds 5MB limit." }));
                setCertificateFile(null);
                return;
            }
            setErrors((prev) => ({ ...prev, certificateFile: "" }));
            setCertificateFile(file);
        }
    };

    const validateForm = () => {
        const newErrors = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^[0-9+()\s-]{7,15}$/;

        if (!formData.name.trim()) newErrors.name = "Full name is required";

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

        // Additional Doctor Validation
        if (formData.role === "DOCTOR") {
            if (!doctorFields.specialization.trim()) newErrors.specialization = "Specialization is required";
            if (!doctorFields.qualification.trim()) newErrors.qualification = "Qualification is required";
            if (!doctorFields.registrationNumber.trim()) newErrors.registrationNumber = "Medical Registration Number is required";
            if (!doctorFields.hospital.trim()) newErrors.hospital = "Hospital name is required";
            if (!certificateFile) newErrors.certificateFile = "ID / Medical Registration certificate file is required";
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

            setSuccessMessage(response.message || "Registration initiated! Please check your email for the 6-digit OTP code.");
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
            // 1. Verify OTP code
            await verifyOtp({
                email: formData.email.trim(),
                otp: otpCode.trim(),
            });

            // 2. If PATIENT, redirect directly to login
            if (formData.role !== "DOCTOR") {
                setSuccessMessage("Account verified successfully! Redirecting to login...");
                setTimeout(() => {
                    navigate("/login", { replace: true });
                }, 1200);
                return;
            }

            // 3. If DOCTOR, authenticate JWT & submit Doctor profile + certificate file
            setSuccessMessage("Account OTP verified! Submitting doctor clinical profile & certificate...");
            
            const loginRes = await login({
                email: formData.email.trim(),
                password: formData.password,
            });

            if (loginRes.token) {
                // Create Doctor profile
                const langs = doctorFields.languages.split(",").map((l) => l.trim()).filter(Boolean);
                await createDoctorProfile({
                    specialization: doctorFields.specialization.trim(),
                    qualification: doctorFields.qualification.trim(),
                    registrationNumber: doctorFields.registrationNumber.trim(),
                    experience: Number(doctorFields.experience || 5),
                    hospital: doctorFields.hospital.trim(),
                    consultationFee: Number(doctorFields.consultationFee || 100),
                    consultationMode: doctorFields.consultationMode,
                    languages: langs.length > 0 ? langs : ["English"],
                });

                // Upload Certificate file
                if (certificateFile) {
                    const certFormData = new FormData();
                    certFormData.append("certificateType", doctorFields.certificateType);
                    certFormData.append("certificate", certificateFile);
                    await uploadDoctorCertificate(certFormData);
                }

                // Advance to Step 3: Pending Verification Notice
                setStep(3);
            }
        } catch (err) {
            console.error("Doctor Signup Completion Error:", err.message);
            setBackendError(err.message || "Failed to complete doctor setup. Please try again.");
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
                
                {/* Left Panel: Healthcare Branding */}
                <div className="lg:col-span-5 bg-[#212842] text-[#F0E7D5] p-8 md:p-12 flex flex-col justify-between relative">
                    <div>
                        <div className="flex items-center space-x-4 mb-8 pb-6 border-b border-[#F0E7D5]/15">
                            <img
                                src="/logo.jpg"
                                alt="AmedicK Official Logo"
                                className="w-14 h-14 object-cover border border-[#F0E7D5]/40 rounded-sm bg-[#FAF6EE]"
                            />
                            <div>
                                <span className="text-xl font-bold tracking-tight text-[#F0E7D5] block uppercase leading-none">
                                    AmedicK
                                </span>
                                <span className="text-[9px] text-[#F0E7D5]/80 tracking-wider uppercase block mt-1">
                                    CARE ROOTED IN COMPASSION
                                </span>
                                <span className="text-[10px] text-[#F0E7D5]/60 font-serif tracking-wide block mt-0.5">
                                    || सर्वे सन्तु निरामया: ||
                                </span>
                            </div>
                        </div>

                        <h1 className="text-2xl md:text-3xl font-serif font-bold leading-snug mb-4 text-[#F0E7D5]">
                            {step === 1
                                ? "Practitioner Registration"
                                : step === 2
                                ? "Email OTP Verification"
                                : "Verification Pending"}
                        </h1>
                        <p className="text-[#F0E7D5]/80 text-sm leading-relaxed mb-8">
                            {step === 1
                                ? "Register your practitioner or patient account. Doctors are required to upload an ID or medical registration certificate for administrative verification."
                                : step === 2
                                ? `Enter the 6-digit OTP code sent to ${formData.email} to verify your account.`
                                : "Your doctor registration and credentials have been submitted for administrative verification."}
                        </p>
                    </div>

                    {/* Progress Step Indicator */}
                    <div className="pt-6 border-t border-[#F0E7D5]/15">
                        <div className="flex items-center justify-between text-xs text-[#F0E7D5]/70 mb-2 font-mono uppercase">
                            <span>Registration Progress</span>
                            <span className="font-bold text-[#F0E7D5]">Step {step} / {formData.role === "DOCTOR" ? "3" : "2"}</span>
                        </div>
                        <div className="w-full bg-[#181E32] h-1.5 rounded-none overflow-hidden">
                            <div
                                className="bg-[#F0E7D5] h-full transition-all duration-300"
                                style={{ width: step === 1 ? "33%" : step === 2 ? "66%" : "100%" }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Form Container */}
                <div className="lg:col-span-7 p-6 md:p-10 flex flex-col justify-center bg-[#FAF6EE] overflow-y-auto max-h-[85vh]">
                    <div className="max-w-lg w-full mx-auto">
                        
                        {/* Title Header */}
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-[#212842] tracking-tight">
                                {step === 1
                                    ? "Create Account"
                                    : step === 2
                                    ? "Verify OTP Code"
                                    : "Verification Status"}
                            </h2>
                            <p className="text-[#212842]/70 text-sm mt-1">
                                {step === 1
                                    ? "Provide your identity details and practitioner credentials."
                                    : step === 2
                                    ? "Enter the 6-digit OTP verification code."
                                    : "Thank you for registering with AmedicK."}
                            </p>
                        </div>

                        {/* Error Alert */}
                        {backendError && (
                            <div className="mb-6 p-4 rounded-md bg-[#F0E7D5] border border-[#212842] text-[#212842] text-xs">
                                <span className="font-bold block mb-0.5">Registration Error</span>
                                <span>{backendError}</span>
                            </div>
                        )}

                        {/* Success Alert */}
                        {successMessage && (
                            <div className="mb-6 p-4 rounded-md bg-[#212842] text-[#F0E7D5] text-xs">
                                <span className="font-bold block mb-0.5">Status Update</span>
                                <span>{successMessage}</span>
                            </div>
                        )}

                        {/* STEP 1: ACCOUNT REGISTRATION & DOCTOR ESSENTIALS */}
                        {step === 1 && (
                            <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs" noValidate>
                                {/* Role Selection */}
                                <div>
                                    <label className="block text-xs font-bold text-[#212842] uppercase tracking-wider mb-2">
                                        Select Portal Role
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setFormData((prev) => ({ ...prev, role: "PATIENT" }))}
                                            className={`p-3 rounded-md border text-left transition-all cursor-pointer ${
                                                formData.role === "PATIENT"
                                                    ? "border-[#212842] border-2 bg-[#F0E7D5] text-[#212842]"
                                                    : "border-[#212842]/20 bg-[#FAF6EE] text-[#212842]/70 hover:border-[#212842]/40"
                                            }`}
                                        >
                                            <span className="block font-bold text-sm text-[#212842]">Patient</span>
                                            <span className="block text-[10px] text-[#212842]/70">Personal Medical Portal</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setFormData((prev) => ({ ...prev, role: "DOCTOR" }))}
                                            className={`p-3 rounded-md border text-left transition-all cursor-pointer ${
                                                formData.role === "DOCTOR"
                                                    ? "border-[#212842] border-2 bg-[#F0E7D5] text-[#212842]"
                                                    : "border-[#212842]/20 bg-[#FAF6EE] text-[#212842]/70 hover:border-[#212842]/40"
                                            }`}
                                        >
                                            <span className="block font-bold text-sm text-[#212842]">Doctor</span>
                                            <span className="block text-[10px] text-[#212842]/70">Clinical Care Portal</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Identity Inputs */}
                                <div>
                                    <label className="block font-bold text-[#212842] uppercase tracking-wider mb-1">
                                        Full Name *
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="Dr. Sarah Jenkins"
                                        className="w-full px-3 py-2 bg-[#F0E7D5] border border-[#212842]/30 rounded-sm text-[#212842] focus:outline-none focus:border-[#212842]"
                                    />
                                    {errors.name && <p className="text-[11px] text-[#212842] font-semibold mt-0.5">{errors.name}</p>}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block font-bold text-[#212842] uppercase tracking-wider mb-1">
                                            Email Address *
                                        </label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            placeholder="sarah@example.com"
                                            className="w-full px-3 py-2 bg-[#F0E7D5] border border-[#212842]/30 rounded-sm text-[#212842] focus:outline-none focus:border-[#212842]"
                                        />
                                        {errors.email && <p className="text-[11px] text-[#212842] font-semibold mt-0.5">{errors.email}</p>}
                                    </div>

                                    <div>
                                        <label className="block font-bold text-[#212842] uppercase tracking-wider mb-1">
                                            Phone Number *
                                        </label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            placeholder="+1 555 019 2834"
                                            className="w-full px-3 py-2 bg-[#F0E7D5] border border-[#212842]/30 rounded-sm text-[#212842] focus:outline-none focus:border-[#212842]"
                                        />
                                        {errors.phone && <p className="text-[11px] text-[#212842] font-semibold mt-0.5">{errors.phone}</p>}
                                    </div>
                                </div>

                                <div>
                                    <label className="block font-bold text-[#212842] uppercase tracking-wider mb-1">
                                        Security Password *
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            placeholder="••••••••"
                                            className="w-full pl-3 pr-10 py-2 bg-[#F0E7D5] border border-[#212842]/30 rounded-sm text-[#212842] focus:outline-none focus:border-[#212842]"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#212842]/60 hover:text-[#212842] text-[10px] font-bold uppercase"
                                        >
                                            {showPassword ? "Hide" : "Show"}
                                        </button>
                                    </div>
                                    {errors.password && <p className="text-[11px] text-[#212842] font-semibold mt-0.5">{errors.password}</p>}
                                </div>

                                {/* ADDITIONAL DOCTOR ESSENTIALS & CERTIFICATE FILE UPLOAD */}
                                {formData.role === "DOCTOR" && (
                                    <div className="p-4 border-2 border-[#212842] bg-[#F0E7D5]/60 rounded-md space-y-3 mt-4">
                                        <div className="border-b border-[#212842]/20 pb-2">
                                            <span className="font-bold uppercase tracking-wider block text-xs text-[#212842]">
                                                Doctor Clinical Credentials & Certificate Upload
                                            </span>
                                            <span className="text-[10px] text-[#212842]/70">
                                                Please provide your registration details and attach your medical ID/registration certificate file.
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block font-bold text-[#212842] uppercase tracking-wider mb-0.5">
                                                    Specialization *
                                                </label>
                                                <input
                                                    type="text"
                                                    name="specialization"
                                                    value={doctorFields.specialization}
                                                    onChange={handleDoctorFieldChange}
                                                    placeholder="Cardiology"
                                                    className="w-full px-3 py-1.5 bg-[#FAF6EE] border border-[#212842]/30 rounded-sm text-[#212842]"
                                                />
                                                {errors.specialization && <p className="text-[10px] text-[#212842] font-semibold">{errors.specialization}</p>}
                                            </div>

                                            <div>
                                                <label className="block font-bold text-[#212842] uppercase tracking-wider mb-0.5">
                                                    Qualifications *
                                                </label>
                                                <input
                                                    type="text"
                                                    name="qualification"
                                                    value={doctorFields.qualification}
                                                    onChange={handleDoctorFieldChange}
                                                    placeholder="MBBS, MD"
                                                    className="w-full px-3 py-1.5 bg-[#FAF6EE] border border-[#212842]/30 rounded-sm text-[#212842]"
                                                />
                                                {errors.qualification && <p className="text-[10px] text-[#212842] font-semibold">{errors.qualification}</p>}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block font-bold text-[#212842] uppercase tracking-wider mb-0.5">
                                                    Registration Number *
                                                </label>
                                                <input
                                                    type="text"
                                                    name="registrationNumber"
                                                    value={doctorFields.registrationNumber}
                                                    onChange={handleDoctorFieldChange}
                                                    placeholder="MED-REG-98124"
                                                    className="w-full px-3 py-1.5 bg-[#FAF6EE] border border-[#212842]/30 rounded-sm text-[#212842] font-mono font-bold"
                                                />
                                                {errors.registrationNumber && <p className="text-[10px] text-[#212842] font-semibold">{errors.registrationNumber}</p>}
                                            </div>

                                            <div>
                                                <label className="block font-bold text-[#212842] uppercase tracking-wider mb-0.5">
                                                    Experience (Years) *
                                                </label>
                                                <input
                                                    type="number"
                                                    name="experience"
                                                    value={doctorFields.experience}
                                                    onChange={handleDoctorFieldChange}
                                                    placeholder="5"
                                                    className="w-full px-3 py-1.5 bg-[#FAF6EE] border border-[#212842]/30 rounded-sm text-[#212842]"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block font-bold text-[#212842] uppercase tracking-wider mb-0.5">
                                                    Hospital Name *
                                                </label>
                                                <input
                                                    type="text"
                                                    name="hospital"
                                                    value={doctorFields.hospital}
                                                    onChange={handleDoctorFieldChange}
                                                    placeholder="Central General Hospital"
                                                    className="w-full px-3 py-1.5 bg-[#FAF6EE] border border-[#212842]/30 rounded-sm text-[#212842]"
                                                />
                                                {errors.hospital && <p className="text-[10px] text-[#212842] font-semibold">{errors.hospital}</p>}
                                            </div>

                                            <div>
                                                <label className="block font-bold text-[#212842] uppercase tracking-wider mb-0.5">
                                                    Consultation Fee ($)
                                                </label>
                                                <input
                                                    type="number"
                                                    name="consultationFee"
                                                    value={doctorFields.consultationFee}
                                                    onChange={handleDoctorFieldChange}
                                                    placeholder="100"
                                                    className="w-full px-3 py-1.5 bg-[#FAF6EE] border border-[#212842]/30 rounded-sm text-[#212842]"
                                                />
                                            </div>
                                        </div>

                                        {/* Certificate File Attachment Input */}
                                        <div className="pt-2 border-t border-[#212842]/20">
                                            <label className="block font-bold text-[#212842] uppercase tracking-wider mb-1">
                                                Attach ID / Registration Certificate File * (PDF, JPG, PNG - Max 5MB)
                                            </label>
                                            <input
                                                type="file"
                                                accept=".pdf,.jpg,.jpeg,.png"
                                                onChange={handleFileChange}
                                                className="w-full p-2 bg-[#FAF6EE] border border-[#212842]/30 rounded-sm text-[#212842] cursor-pointer"
                                            />
                                            {certificateFile && (
                                                <span className="text-[11px] font-mono font-bold text-[#212842] block mt-1">
                                                    Selected: {certificateFile.name} ({(certificateFile.size / 1024 / 1024).toFixed(2)} MB)
                                                </span>
                                            )}
                                            {errors.certificateFile && (
                                                <p className="text-[11px] text-[#212842] font-bold mt-0.5">{errors.certificateFile}</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full mt-3 py-3 px-6 bg-[#212842] hover:bg-[#181E32] text-[#F0E7D5] font-bold text-xs uppercase tracking-wider rounded-sm shadow-sm transition duration-150 flex items-center justify-center space-x-2 disabled:opacity-60 cursor-pointer border border-[#212842]"
                                >
                                    {isLoading ? (
                                        <span>Processing Registration...</span>
                                    ) : (
                                        <span>Register Account & Request OTP →</span>
                                    )}
                                </button>
                            </form>
                        )}

                        {/* STEP 2: OTP VERIFICATION FORM */}
                        {step === 2 && (
                            <form onSubmit={handleVerifyOtpSubmit} className="space-y-4" noValidate>
                                <div className="p-3.5 bg-[#F0E7D5] border border-[#212842]/30 rounded-sm text-center">
                                    <span className="block text-[10px] font-bold uppercase tracking-widest text-[#212842]/70 mb-0.5">
                                        Verification Email Sent To
                                    </span>
                                    <span className="block text-xs font-mono font-bold text-[#212842]">{formData.email}</span>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-[#212842] uppercase tracking-wider mb-2 text-center">
                                        Enter 6-Digit OTP Code
                                    </label>
                                    <input
                                        type="text"
                                        maxLength="6"
                                        value={otpCode}
                                        onChange={(e) => {
                                            setOtpCode(e.target.value.replace(/\D/g, ""));
                                            if (errors.otp) setErrors({});
                                        }}
                                        placeholder="123456"
                                        className="w-full px-4 py-3 bg-[#F0E7D5] border-2 border-[#212842] rounded-md text-center text-2xl font-bold tracking-widest text-[#212842] focus:outline-none"
                                    />
                                    {errors.otp && <p className="mt-1 text-xs text-[#212842] font-semibold text-center">{errors.otp}</p>}
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-3 px-6 bg-[#212842] hover:bg-[#181E32] text-[#F0E7D5] font-bold text-xs uppercase tracking-wider rounded-sm shadow-sm transition duration-150 flex items-center justify-center space-x-2 disabled:opacity-60 cursor-pointer border border-[#212842]"
                                >
                                    {isLoading ? (
                                        <span>Submitting Credentials...</span>
                                    ) : (
                                        <span>Verify OTP & Submit Registration →</span>
                                    )}
                                </button>

                                <div className="flex items-center justify-between text-xs pt-2 border-t border-[#212842]/15">
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="text-[#212842] hover:underline font-bold"
                                    >
                                        ← Edit Details
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

                        {/* STEP 3: DOCTOR VERIFICATION PENDING NOTICE */}
                        {step === 3 && (
                            <div className="p-6 bg-[#F0E7D5] border-2 border-[#212842] rounded-md text-center space-y-4 text-[#212842]">
                                <div className="w-12 h-12 bg-[#212842] text-[#F0E7D5] rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                                    ⏳
                                </div>

                                <h3 className="text-xl font-serif font-bold">
                                    Doctor Verification Pending
                                </h3>

                                <div className="space-y-2 text-xs leading-relaxed max-w-md mx-auto">
                                    <p className="font-bold">
                                        Your registration details and ID certificate file have been successfully submitted to AmedicK.
                                    </p>
                                    <p className="p-3 bg-[#FAF6EE] border border-[#212842]/30 rounded-sm font-semibold">
                                        "Your verification is pending. You will receive an email notification once your profile has been reviewed and accepted by administration."
                                    </p>
                                </div>

                                <div className="pt-4 border-t border-[#212842]/20 flex items-center justify-center space-x-4 text-xs">
                                    <button
                                        onClick={() => navigate("/login")}
                                        className="py-2.5 px-6 bg-[#212842] text-[#F0E7D5] font-bold uppercase tracking-wider rounded-sm hover:bg-[#181E32] cursor-pointer"
                                    >
                                        Go to Login Screen →
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Footer Link */}
                        <div className="mt-6 pt-4 border-t border-[#212842]/15 text-center">
                            <p className="text-xs text-[#212842]/70">
                                Already registered?{" "}
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
