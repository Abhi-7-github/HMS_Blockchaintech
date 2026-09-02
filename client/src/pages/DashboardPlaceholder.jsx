import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, logout } from "../services/api";

const DashboardPlaceholder = ({ roleTitle }) => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await getCurrentUser();
                setUser(res.user);
            } catch (err) {
                console.error("Failed to fetch profile:", err.message);
                logout();
                navigate("/login", { replace: true });
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, [navigate]);

    const handleLogout = () => {
        logout();
        navigate("/login", { replace: true });
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-healthcare-gradient flex items-center justify-center">
                <div className="flex items-center space-x-3 text-sky-700 font-semibold">
                    <svg className="animate-spin h-6 w-6 text-sky-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Loading portal session...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-healthcare-gradient flex flex-col">
            {/* Top Healthcare Navigation Bar */}
            <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-sky-500 flex items-center justify-center shadow-md">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                            </svg>
                        </div>
                        <div>
                            <span className="text-xl font-extrabold text-slate-900 tracking-tight">AmedicK</span>
                            <span className="ml-2 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 uppercase tracking-wider">
                                {roleTitle || user?.role || "Portal"}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="text-right hidden sm:block">
                            <span className="block text-sm font-bold text-slate-900">{user?.name}</span>
                            <span className="block text-xs text-slate-500">{user?.email}</span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content Dashboard Landing */}
            <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
                <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl border border-slate-100 max-w-3xl mx-auto text-center">
                    <div className="w-20 h-20 rounded-3xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                    </div>

                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
                        Welcome, {user?.name}!
                    </h1>
                    <p className="text-slate-500 text-sm max-w-lg mx-auto mb-8">
                        You have successfully authenticated into the <strong>{roleTitle || user?.role} Dashboard</strong>. Your JWT session is active and secure.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left border-t border-slate-100 pt-8">
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
                            <span className="text-xs text-slate-400 font-semibold uppercase block mb-1">Account Role</span>
                            <span className="text-sm font-bold text-slate-800">{user?.role}</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
                            <span className="text-xs text-slate-400 font-semibold uppercase block mb-1">Phone Number</span>
                            <span className="text-sm font-bold text-slate-800">{user?.phone}</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
                            <span className="text-xs text-slate-400 font-semibold uppercase block mb-1">Status</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                Verified Active
                            </span>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default DashboardPlaceholder;
