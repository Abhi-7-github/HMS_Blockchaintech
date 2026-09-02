import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import DashboardPlaceholder from "./pages/DashboardPlaceholder";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Default Redirect */}
                <Route path="/" element={<Navigate to="/login" replace />} />

                {/* Auth Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Role-Based Dashboard Routes */}
                <Route path="/patient/dashboard" element={<DashboardPlaceholder roleTitle="Patient" />} />
                <Route path="/doctor/dashboard" element={<DashboardPlaceholder roleTitle="Doctor" />} />
                <Route path="/admin/dashboard" element={<DashboardPlaceholder roleTitle="Admin" />} />
                <Route path="/pharmacy/dashboard" element={<DashboardPlaceholder roleTitle="Pharmacy" />} />
                <Route path="/dashboard" element={<DashboardPlaceholder roleTitle="Healthcare" />} />

                {/* Fallback Route */}
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
