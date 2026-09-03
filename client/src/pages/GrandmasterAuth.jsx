import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/api";

const GrandmasterAuth = () => {
    const navigate = useNavigate();

    // Form inputs state
    const [loginForm, setLoginForm] = useState({ email: "", password: "" });

    // UI state
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    // --- LOGIN HANDLER ---
    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage("");
        setSuccessMessage("");
        setIsLoading(true);

        try {
            const res = await login(loginForm);
            if (res.user?.role !== "ADMIN") {
                setErrorMessage("Access Denied: This portal is strictly reserved for Grandmaster System Administrators.");
                setIsLoading(false);
                return;
            }

            setSuccessMessage("Grandmaster authentication successful. Redirecting...");
            setTimeout(() => {
                navigate("/admin/doctors", { replace: true });
            }, 600);
        } catch (err) {
            console.error("Admin Login Error:", err.message);
            setErrorMessage(err.message || "Invalid Admin email or password.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#212842] text-[#F0E7D5] flex items-center justify-center p-4 font-sans selection:bg-[#F0E7D5] selection:text-[#212842]">
            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 bg-[#FAF6EE] text-[#212842] rounded-md overflow-hidden shadow-2xl border border-[#F0E7D5]/20">
                {/* Left Panel: Midnight Indigo Branding */}
                <div className="md:col-span-5 bg-[#212842] p-8 flex flex-col justify-between text-[#F0E7D5] border-r border-[#F0E7D5]/15">
                    <div>
                        <div className="flex items-center space-x-3 mb-6">
                            <img
                                src="/logo.jpg"
                                alt="AmedicK Official Logo"
                                className="w-12 h-12 object-cover border border-[#F0E7D5]/40 rounded-sm bg-[#FAF6EE]"
                            />
                            <div>
                                <span className="text-xl font-bold tracking-tight uppercase block leading-none text-[#F0E7D5]">
                                    AmedicK
                                </span>
                                <span className="text-[9px] text-[#F0E7D5]/80 tracking-widest uppercase block mt-1">
                                    CARE ROOTED IN COMPASSION
                                </span>
                            </div>
                        </div>

                        <div className="space-y-4 my-6">
                            <span className="text-xs font-mono font-bold uppercase tracking-widest px-2.5 py-1 border border-[#F0E7D5]/30 text-[#F0E7D5] rounded-sm inline-block">
                                GRANDMASTER DESK
                            </span>

                            <h2 className="text-2xl font-serif font-bold text-[#F0E7D5] tracking-tight leading-tight">
                                System Administration & Credential Control
                            </h2>

                            <p className="text-xs text-[#F0E7D5]/80 leading-relaxed">
                                Restricted portal for AmedicK Grandmaster administrators to verify clinical registrations, manage medical credentials, and oversee healthcare system integrity.
                            </p>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-[#F0E7D5]/15">
                        <p className="text-[11px] font-serif text-[#F0E7D5]/70 italic tracking-wide">
                            "|| सर्वे सन्तु निरामया: ||"
                        </p>
                        <p className="text-[9px] font-mono text-[#F0E7D5]/50 mt-1 uppercase">
                            May all beings be free from illness
                        </p>
                    </div>
                </div>

                {/* Right Panel: Admin Sign In Container */}
                <div className="md:col-span-7 p-6 sm:p-10 flex flex-col justify-center space-y-6">
                    {/* Header Controls */}
                    <div className="flex items-center justify-between border-b border-[#212842]/15 pb-4">
                        <div>
                            <h3 className="text-xl font-serif font-bold text-[#212842]">
                                Grandmaster Sign In
                            </h3>
                            <p className="text-xs text-[#212842]/70 mt-0.5">
                                Authenticate with your Grandmaster System Administrator credentials.
                            </p>
                        </div>
                    </div>

                    {/* ALERT NOTIFICATIONS */}
                    {errorMessage && (
                        <div className="p-3.5 bg-[#FAF6EE] border border-[#212842] rounded-sm text-xs text-[#212842] flex items-start space-x-2">
                            <span className="font-bold uppercase tracking-wider text-[11px]">⚠️ Error:</span>
                            <span className="flex-1">{errorMessage}</span>
                        </div>
                    )}

                    {successMessage && (
                        <div className="p-3.5 bg-[#FAF6EE] border-2 border-[#212842] rounded-sm text-xs font-bold text-[#212842] flex items-start space-x-2">
                            <span className="text-[11px]">✓</span>
                            <span className="flex-1">{successMessage}</span>
                        </div>
                    )}

                    {/* ADMIN LOGIN FORM */}
                    <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
                        <div>
                            <label className="block font-bold uppercase tracking-wider text-[#212842]/80 mb-1">
                                Admin Email Address
                            </label>
                            <input
                                type="email"
                                required
                                placeholder="admin@gmail.com"
                                value={loginForm.email}
                                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                                className="w-full p-3 bg-[#F0E7D5] border border-[#212842]/30 rounded-sm text-[#212842] placeholder-[#212842]/50 focus:outline-none focus:border-[#212842]"
                            />
                        </div>

                        <div>
                            <label className="block font-bold uppercase tracking-wider text-[#212842]/80 mb-1">
                                Password
                            </label>
                            <input
                                type="password"
                                required
                                placeholder="••••••••"
                                value={loginForm.password}
                                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                                className="w-full p-3 bg-[#F0E7D5] border border-[#212842]/30 rounded-sm text-[#212842] placeholder-[#212842]/50 focus:outline-none focus:border-[#212842]"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 bg-[#212842] hover:bg-[#181E32] text-[#F0E7D5] font-bold text-xs uppercase tracking-wider rounded-sm transition cursor-pointer border border-[#212842] disabled:opacity-50"
                        >
                            {isLoading ? "Authenticating..." : "Sign In as Grandmaster →"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default GrandmasterAuth;
