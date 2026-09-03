import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getCurrentUser, getToken, logout } from "../services/api";

const AdminRoute = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const location = useLocation();

    useEffect(() => {
        const checkAdminAuth = async () => {
            const token = getToken();
            if (!token) {
                setIsLoading(false);
                return;
            }

            try {
                const res = await getCurrentUser();
                if (res?.user) {
                    setUser(res.user);
                } else {
                    logout();
                }
            } catch (err) {
                console.error("AdminRoute Auth Check Failed:", err.message);
                logout();
            } finally {
                setIsLoading(false);
            }
        };

        checkAdminAuth();
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#F0E7D5] flex items-center justify-center text-[#212842]">
                <div className="flex items-center space-x-3 font-semibold text-sm">
                    <div className="w-5 h-5 border-2 border-[#212842] border-t-transparent animate-spin rounded-full"></div>
                    <span>Verifying Admin Permissions...</span>
                </div>
            </div>
        );
    }

    if (!user || user.role !== "ADMIN") {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
};

export default AdminRoute;
