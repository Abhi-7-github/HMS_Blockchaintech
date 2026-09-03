import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import GrandmasterAuth from "./pages/GrandmasterAuth";
import DashboardPlaceholder from "./pages/DashboardPlaceholder";
import AdminDoctorsList from "./pages/AdminDoctorsList";
import AdminDoctorVerification from "./pages/AdminDoctorVerification";
import AdminRoute from "./components/AdminRoute";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Default Redirect */}
                <Route path="/" element={<Navigate to="/login" replace />} />

                {/* Auth Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Grandmaster Admin Authentication (Login & Signup) */}
                <Route path="/grandmaster" element={<GrandmasterAuth />} />

                {/* Role-Based Dashboard Routes */}
                <Route path="/patient/dashboard" element={<DashboardPlaceholder roleTitle="Patient" />} />
                <Route path="/doctor/dashboard" element={<DashboardPlaceholder roleTitle="Doctor" />} />
                <Route path="/admin/dashboard" element={<DashboardPlaceholder roleTitle="Admin" />} />
                <Route path="/pharmacy/dashboard" element={<DashboardPlaceholder roleTitle="Pharmacy" />} />
                <Route path="/dashboard" element={<DashboardPlaceholder roleTitle="Healthcare" />} />

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
