import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import GrandmasterAuth from "./pages/GrandmasterAuth";
import DashboardPlaceholder from "./pages/DashboardPlaceholder";
import AdminDoctorsList from "./pages/AdminDoctorsList";
import AdminDoctorVerification from "./pages/AdminDoctorVerification";
import AdminRoute from "./components/AdminRoute";
import RoleRoute from "./components/RoleRoute";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Default Redirect */}
                <Route path="/" element={<Navigate to="/login" replace />} />

                {/* Auth Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />

                {/* Grandmaster Admin Authentication (Login & Signup) */}
                <Route path="/grandmaster" element={<GrandmasterAuth />} />

                {/* Role-Based Dashboard Routes Protected by RBAC */}
                <Route
                    path="/patient/dashboard"
                    element={
                        <RoleRoute allowedRoles={["PATIENT"]}>
                            <DashboardPlaceholder roleTitle="Patient" />
                        </RoleRoute>
                    }
                />
                <Route
                    path="/doctor/dashboard"
                    element={
                        <RoleRoute allowedRoles={["DOCTOR"]}>
                            <DashboardPlaceholder roleTitle="Doctor" />
                        </RoleRoute>
                    }
                />
                <Route
                    path="/admin/dashboard"
                    element={
                        <RoleRoute allowedRoles={["ADMIN"]}>
                            <DashboardPlaceholder roleTitle="Admin" />
                        </RoleRoute>
                    }
                />
                <Route
                    path="/pharmacy/dashboard"
                    element={
                        <RoleRoute allowedRoles={["PHARMACY"]}>
                            <DashboardPlaceholder roleTitle="Pharmacy" />
                        </RoleRoute>
                    }
                />
                <Route
                    path="/dashboard"
                    element={
                        <RoleRoute>
                            <DashboardPlaceholder roleTitle="Healthcare" />
                        </RoleRoute>
                    }
                />
                <Route
                    path="/ai-assistant"
                    element={
                        <RoleRoute>
                            <DashboardPlaceholder roleTitle="Healthcare" initialTab="ai-assistant" />
                        </RoleRoute>
                    }
                />
                <Route
                    path="/medications"
                    element={
                        <RoleRoute allowedRoles={["PATIENT"]}>
                            <DashboardPlaceholder roleTitle="Patient" initialTab="medications" />
                        </RoleRoute>
                    }
                />
                <Route
                    path="/emergency"
                    element={
                        <RoleRoute allowedRoles={["PATIENT", "DOCTOR", "ADMIN"]}>
                            <DashboardPlaceholder initialTab="emergency" />
                        </RoleRoute>
                    }
                />
                <Route
                    path="/rural-healthcare"
                    element={
                        <RoleRoute>
                            <DashboardPlaceholder roleTitle="Healthcare" initialTab="rural" />
                        </RoleRoute>
                    }
                />

                {/* Protected Admin Doctor Verification Dashboard Routes */}
                <Route
                    path="/admin/doctors"
                    element={
                        <AdminRoute>
                            <AdminDoctorsList />
                        </AdminRoute>
                    }
                />
                <Route
                    path="/admin/doctors/:id"
                    element={
                        <AdminRoute>
                            <AdminDoctorVerification />
                        </AdminRoute>
                    }
                />

                {/* Fallback Route */}
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
