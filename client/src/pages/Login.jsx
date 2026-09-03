import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../services/api";

const Login = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });

    const [errors, setErrors] = useState({});
    const [backendError, setBackendError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

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

        if (!formData.email.trim()) {
            newErrors.email = "Email address is required";
        } else if (!emailRegex.test(formData.email.trim())) {
            newErrors.email = "Please enter a valid email address";
        }

        if (!formData.password) {
            newErrors.password = "Password is required";
        } else if (formData.password.length < 6) {
            newErrors.password = "Password must be at least 6 characters";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsLoading(true);
        setBackendError("");

        try {
            const response = await login({
                email: formData.email.trim(),
                password: formData.password,
            });

            const role = response.user?.role?.toUpperCase();
            let targetPath = "/dashboard";

            switch (role) {
                case "PATIENT":
                    targetPath = "/patient/dashboard";
                    break;
                case "DOCTOR":
                    targetPath = "/doctor/dashboard";
                    break;
                case "ADMIN":
                    targetPath = "/admin/dashboard";
                    break;
                case "PHARMACY":
                    targetPath = "/pharmacy/dashboard";
                    break;
                default:
                    targetPath = "/dashboard";
            }

            navigate(targetPath, { replace: true });
        } catch (err) {
            setBackendError(err.message || "Login failed. Please check your credentials.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F0E7D5] text-[#212842] flex items-center justify-center p-4 md:p-8">
            <div className="w-full max-w-5xl bg-[#FAF6EE] rounded-lg shadow-xl overflow-hidden border border-[#212842]/15 grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
                
                {/* Left Side: Healthcare Branding Panel (Midnight Indigo) */}
                <div className="lg:col-span-5 bg-[#212842] text-[#F0E7D5] p-8 md:p-12 flex flex-col justify-between relative">
                    <div>
                        {/* Healthcare Brand Header */}
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

                        <h1 className="text-2xl md:text-3xl font-serif font-bold leading-snug mb-3 text-[#F0E7D5]">
                            Care Management System
                        </h1>
                        <p className="text-[#F0E7D5]/80 text-sm leading-relaxed mb-6">
                            A minimal, secure platform for patient records, clinical workflows, prescription management, and hospital operations.
                        </p>
                    </div>

                    {/* Healthcare Trust Directives */}
                    <div className="space-y-3 pt-6 border-t border-[#F0E7D5]/15 text-xs text-[#F0E7D5]/80">
                        <div className="flex items-center space-x-2">
                            <span className="font-semibold text-[#F0E7D5]">—</span>
                            <span>End-to-End Encrypted Health Records</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className="font-semibold text-[#F0E7D5]">—</span>
                            <span>Role-Based Authenticated Access</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className="font-semibold text-[#F0E7D5]">—</span>
                            <span>Blockchain-Backed Audit Verification</span>
                        </div>
                    </div>
                </div>

                {/* Right Side: Login Form (Vanilla Cream) */}
                <div className="lg:col-span-7 p-8 md:p-12 flex flex-col justify-center bg-[#FAF6EE]">
                    <div className="max-w-md w-full mx-auto">
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-[#212842] tracking-tight">
                                Account Sign In
                            </h2>
                            <p className="text-[#212842]/70 text-sm mt-1">
                                Enter your credentials to access the portal.
                            </p>
                        </div>

                        {/* Backend Error Alert */}
                        {backendError && (
                            <div className="mb-6 p-4 rounded-md bg-[#F0E7D5] border border-[#212842] text-[#212842] text-sm">
                                <span className="font-bold block mb-0.5">Authentication Error</span>
                                <span>{backendError}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                            {/* Email Input */}
                            <div>
                                <label className="block text-xs font-bold text-[#212842] uppercase tracking-wider mb-2">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="user@amedick.com"
                                    className={`w-full px-4 py-3 bg-[#F0E7D5] border ${
                                        errors.email ? "border-[#212842] font-semibold" : "border-[#212842]/30 focus:border-[#212842]"
                                    } rounded-md text-[#212842] text-sm focus:outline-none focus:ring-1 focus:ring-[#212842] transition`}
                                />
                                {errors.email && (
                                    <p className="mt-1 text-xs text-[#212842] font-medium">
                                        {errors.email}
                                    </p>
                                )}
                            </div>

                            {/* Password Input */}
                            <div>
                                <label className="block text-xs font-bold text-[#212842] uppercase tracking-wider mb-2">
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="••••••••"
                                        className={`w-full pl-4 pr-10 py-3 bg-[#F0E7D5] border ${
                                            errors.password ? "border-[#212842] font-semibold" : "border-[#212842]/30 focus:border-[#212842]"
                                        } rounded-md text-[#212842] text-sm focus:outline-none focus:ring-1 focus:ring-[#212842] transition`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#212842]/60 hover:text-[#212842] focus:outline-none text-xs font-medium uppercase"
                                    >
                                        {showPassword ? "Hide" : "Show"}
                                    </button>
                                </div>
                                {errors.password && (
                                    <p className="mt-1 text-xs text-[#212842] font-medium">
                                        {errors.password}
                                    </p>
                                )}
                            </div>

                            {/* Primary Button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 px-6 bg-[#212842] hover:bg-[#181E32] text-[#F0E7D5] font-semibold rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#212842] transition duration-150 flex items-center justify-center space-x-2 disabled:opacity-60 cursor-pointer"
                            >
                                {isLoading ? (
                                    <span>Authenticating...</span>
                                ) : (
                                    <span>Sign In to Account</span>
                                )}
                            </button>
                        </form>

                        {/* Footer Register Link */}
                        <div className="mt-8 pt-6 border-t border-[#212842]/15 text-center">
                            <p className="text-xs text-[#212842]/70">
                                Need an account?{" "}
                                <Link to="/register" className="font-bold text-[#212842] underline underline-offset-4">
                                    Register as Patient or Doctor
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Login;
