import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getCurrentUser, getToken, logout } from "../services/api";

/**
 * Role-Based Access Control (RBAC) Route Guard
 * @param {Array<string>} allowedRoles - Array of roles permitted (e.g. ['PATIENT'], ['DOCTOR'], ['ADMIN'])
 * @param {React.ReactNode} children - Target protected component
 */
const RoleRoute = ({ allowedRoles = [], children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const location = useLocation();

    useEffect(() => {
        let isMounted = true;

        const verifySessionAndRole = async () => {
            const token = getToken();
            if (!token) {
                if (isMounted) setIsLoading(false);
                return;
            }

            try {
                const res = await getCurrentUser();
                if (isMounted) {
                    if (res?.user) {
                        setUser(res.user);
                    } else {
                        logout();
                    }
                }
            } catch (err) {
                console.error("RoleRoute Auth Check Failed:", err.message);
                if (isMounted) logout();
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        verifySessionAndRole();

        return () => {
            isMounted = false;
        };
    }, [location.pathname]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#F0E7D5] flex items-center justify-center text-[#212842]">
                <div className="flex items-center space-x-3 font-semibold text-sm">
                    <div className="w-5 h-5 border-2 border-[#212842] border-t-transparent animate-spin rounded-full"></div>
                    <span>Verifying Security Credentials...</span>
                </div>
            </div>
        );
    }

    // Unauthenticated: Redirect to login
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Role Validation Check
    const userRole = (user.role || "").toUpperCase();
    if (allowedRoles.length > 0) {
        const normalizedAllowed = allowedRoles.map((r) => r.toUpperCase());
        if (!normalizedAllowed.includes(userRole)) {
            // User is authenticated but unauthorized for this specific role route.
            // Redirect to their respective authorized portal without wiping their session.
            let redirectDashboard = "/dashboard";
            switch (userRole) {
                case "PATIENT":
                    redirectDashboard = "/patient/dashboard";
                    break;
                case "DOCTOR":
                    redirectDashboard = "/doctor/dashboard";
                    break;
                case "ADMIN":
                    redirectDashboard = "/admin/dashboard";
                    break;
                case "PHARMACY":
                    redirectDashboard = "/pharmacy/dashboard";
                    break;
                default:
                    redirectDashboard = "/dashboard";
            }
            return <Navigate to={redirectDashboard} replace />;
        }
    }

    return children;
};

export default RoleRoute;
