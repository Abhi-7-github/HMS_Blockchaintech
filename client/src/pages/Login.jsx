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
        // Clear field error on typing
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

            // Redirect based on user role
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
        <div className="min-h-screen bg-healthcare-gradient flex items-center justify-center p-4 md:p-8">
            <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 grid grid-cols-1 lg:grid-cols-12 min-h-[620px]">
                
                {/* Left Side: Healthcare Branding Panel */}
                <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-teal-950 to-sky-950 text-white p-8 md:p-12 flex flex-col justify-between relative overflow-hidden">
                    {/* Background Medical Decorative Accent */}
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
                            Welcome Back to Next-Gen Care Management
                        </h1>
                        <p className="text-slate-300 text-sm leading-relaxed mb-8">
                            Log in securely to access health records, verify digital prescriptions, manage appointments, and connect with verified medical providers.
                        </p>
                    </div>

                    {/* Healthcare Trust Metrics / Features */}
                    <div className="space-y-3 pt-6 border-t border-slate-800/80">
                        <div className="flex items-center space-x-3 text-xs text-slate-300">
                            <div className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold">✓</div>
                            <span>End-to-End Encrypted Health Data</span>
                        </div>
                        <div className="flex items-center space-x-3 text-xs text-slate-300">
                            <div className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold">✓</div>
                            <span>Role-Based Secure Portal Access</span>
                        </div>
                        <div className="flex items-center space-x-3 text-xs text-slate-300">
                            <div className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold">✓</div>
                            <span>Blockchain-Backed Records Integrity</span>
                        </div>
                    </div>
                </div>

                {/* Right Side: Login Form */}
                <div className="lg:col-span-7 p-8 md:p-12 flex flex-col justify-center bg-white">
                    <div className="max-w-md w-full mx-auto">
                        <div className="mb-8">
                            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                                Account Sign In
                            </h2>
                            <p className="text-slate-500 text-sm mt-1">
                                Enter your credentials to access your healthcare portal.
                            </p>
                        </div>

                        {/* Backend Error Alert */}
                        {backendError && (
                            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-start space-x-3 text-rose-700 text-sm animate-fade-in">
                                <svg className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div className="flex-1">
                                    <span className="font-semibold block mb-0.5">Authentication Error</span>
                                    <span>{backendError}</span>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                            {/* Email Input */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="doctor@amedick.com"
                                        className={`w-full pl-11 pr-4 py-3 bg-slate-50 border ${
                                            errors.email ? "border-rose-500 focus:ring-rose-200" : "border-slate-200 focus:border-sky-500 focus:ring-sky-100"
                                        } rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-4 transition duration-200`}
                                    />
                                </div>
                                {errors.email && (
                                    <p className="mt-1.5 text-xs text-rose-500 font-medium flex items-center space-x-1">
                                        <span>•</span> <span>{errors.email}</span>
                                    </p>
                                )}
                            </div>

                            {/* Password Input */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                                    Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="••••••••"
                                        className={`w-full pl-11 pr-11 py-3 bg-slate-50 border ${
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
                                {errors.password && (
                                    <p className="mt-1.5 text-xs text-rose-500 font-medium flex items-center space-x-1">
                                        <span>•</span> <span>{errors.password}</span>
                                    </p>
                                )}
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3.5 px-6 bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-700 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg shadow-sky-600/25 hover:shadow-sky-600/35 focus:outline-none focus:ring-4 focus:ring-sky-200 transition duration-200 flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Authenticating...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Sign In to Account</span>
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                        </svg>
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Footer Register Link */}
                        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                            <p className="text-sm text-slate-600">
                                Don't have an account yet?{" "}
                                <Link to="/register" className="font-semibold text-sky-600 hover:text-sky-700 underline underline-offset-4">
                                    Register as Patient / Doctor
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
