import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    getCurrentUser,
    logout,
    getVerifiedDoctors,
    getPatientPrescriptions,
    getDoctorPrescriptions,
    getMedicalRecords,
} from "../services/api";
import PatientFindDoctors from "../components/PatientFindDoctors";
import PatientAppointments from "../components/PatientAppointments";
import DoctorAppointments from "../components/DoctorAppointments";
import BookAppointmentModal from "../components/BookAppointmentModal";
import AiHealthAssistant from "../components/AiHealthAssistant";
import MedicationReminders from "../components/MedicationReminders";
import EmergencyAssistance from "../components/EmergencyAssistance";
import RuralHealthcare from "../components/RuralHealthcare";
import DoctorCertificateManager from "../components/DoctorCertificateManager";
import LanguageSelector from "../components/LanguageSelector";
import { useLanguage } from "../i18n/i18nContext";

const DashboardPlaceholder = ({ roleTitle, initialTab = "overview" }) => {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Active Navigation Subtab
    const [activeTab, setActiveTab] = useState(initialTab);

    // Interactive Modals
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
    const [verifiedDoctorsList, setVerifiedDoctorsList] = useState([]);
    const [selectedRecord, setSelectedRecord] = useState(null);

    // Form input state for prescriptions
    const [prescriptionForm, setPrescriptionForm] = useState({
        patientName: "",
        medication: "",
        dosage: "",
        notes: "",
    });

    const [prescriptions, setPrescriptions] = useState([]);
    const [medicalRecords, setMedicalRecords] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await getCurrentUser();
                const fetchedUser = res?.user || null;
                setUser(fetchedUser);

                const role = (fetchedUser?.role || roleTitle || "PATIENT").toUpperCase();

                // Fetch role-specific real prescriptions
                try {
                    let rxRes = null;
                    if (role === "PATIENT") {
                        rxRes = await getPatientPrescriptions();
                    } else if (role === "DOCTOR") {
                        rxRes = await getDoctorPrescriptions();
                    }
                    if (rxRes?.success && Array.isArray(rxRes.data) && rxRes.data.length > 0) {
                        const formattedRx = rxRes.data.map((rx) => ({
                            id: rx._id ? `RX-${rx._id.slice(-4).toUpperCase()}` : (rx.id || "RX-LIVE"),
                            patient: rx.patientId?.userId?.name || rx.patient || "Patient",
                            doctor: rx.doctorId?.userId?.name ? `Dr. ${rx.doctorId.userId.name}` : (rx.doctor || "Attending Physician"),
                            medication: rx.medicines && rx.medicines.length > 0 ? rx.medicines.map((m) => m.name).join(", ") : (rx.medication || "Prescribed Medication"),
                            dosage: rx.medicines && rx.medicines.length > 0 ? rx.medicines.map((m) => m.dosage).join(", ") : (rx.dosage || "As directed"),
                            date: rx.createdAt ? new Date(rx.createdAt).toISOString().split("T")[0] : (rx.date || new Date().toISOString().split("T")[0]),
                            status: rx.blockchainTransactionHash ? "BLOCK_VERIFIED" : (rx.status || "ACTIVE"),
                            hash: rx.blockchainTransactionHash || (rx._id ? `0x${rx._id.slice(-8)}...${rx._id.slice(0, 4)}` : null),
                        }));
                        setPrescriptions(formattedRx);

                        const logs = formattedRx
                            .filter((rx) => rx.hash)
                            .map((rx) => ({
                                hash: rx.hash,
                                action: "Prescription Signed & Verified",
                                user: rx.doctor,
                                timestamp: rx.date,
                            }));
                        setAuditLogs(logs);
                    } else {
                        setPrescriptions([]);
                        setAuditLogs([]);
                    }
                } catch (rxErr) {
                    console.warn("Prescriptions fetch notice:", rxErr.message);
                    setPrescriptions([]);
                    setAuditLogs([]);
                }

                // Fetch role-specific medical records
                try {
                    const recRes = await getMedicalRecords();
                    if (recRes?.success && Array.isArray(recRes.data) && recRes.data.length > 0) {
                        const formattedRecs = recRes.data.map((rec) => ({
                            id: rec._id ? `REC-${rec._id.slice(-4).toUpperCase()}` : (rec.id || "REC-LIVE"),
                            patient: rec.patientId?.userId?.name || rec.patient || "Patient",
                            type: rec.recordType || rec.title || "Clinical Record",
                            date: rec.createdAt ? new Date(rec.createdAt).toISOString().split("T")[0] : (rec.date || "Recent"),
                            doctor: rec.uploadedBy?.name ? `Dr. ${rec.uploadedBy.name}` : "Attending Clinician",
                            summary: rec.description || rec.title || "Diagnostic summary on record.",
                        }));
                        setMedicalRecords(formattedRecs);
                    } else {
                        setMedicalRecords([]);
                    }
                } catch (recErr) {
                    console.warn("Medical records fetch notice:", recErr.message);
                    setMedicalRecords([]);
                }
            } catch (err) {
                console.error("Failed to fetch profile:", err.message);
                logout();
                navigate("/login", { replace: true });
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, [navigate, roleTitle]);

    const handleLogout = () => {
        logout();
        navigate("/login", { replace: true });
    };

    const handleOpenBookingModal = async () => {
        try {
            const res = await getVerifiedDoctors();
            if (res.success) {
                setVerifiedDoctorsList(res.data || []);
            }
        } catch (err) {
            console.error("Error fetching verified doctors:", err);
        }
        setIsBookingModalOpen(true);
    };

    const handleCreatePrescription = (e) => {
        e.preventDefault();
        const newRx = {
            id: `RX-${Math.floor(1000 + Math.random() * 9000)}`,
            patient: prescriptionForm.patientName,
            doctor: user?.name || "Dr. Attending",
            medication: prescriptionForm.medication,
            dosage: prescriptionForm.dosage,
            date: new Date().toISOString().split("T")[0],
            status: "VERIFIED_ACTIVE",
        };
        setPrescriptions([newRx, ...prescriptions]);
        setIsPrescriptionModalOpen(false);
    };

    const currentRole = (user?.role || roleTitle || "PATIENT").toUpperCase();

    // Restrict activeTab strictly to tabs permitted for the authenticated role
    useEffect(() => {
        const allowedTabs = {
            PATIENT: ["overview", "find-doctor", "my-appointments", "prescriptions", "records", "medications", "emergency", "ai-assistant", "rural", "audit"],
            DOCTOR: ["overview", "doctor-appointments", "prescriptions", "records", "emergency", "verification", "audit"],
            ADMIN: ["overview", "prescriptions", "records", "emergency", "audit"],
            PHARMACY: ["overview", "prescriptions", "audit"],
        };
        const roleAllowed = allowedTabs[currentRole] || allowedTabs.PATIENT;
        if (!roleAllowed.includes(activeTab)) {
            setActiveTab("overview");
        }
    }, [currentRole, activeTab]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#F0E7D5] flex items-center justify-center text-[#212842]">
                <div className="flex items-center space-x-3 font-semibold text-sm">
                    <div className="w-5 h-5 border-2 border-[#212842] border-t-transparent animate-spin rounded-full"></div>
                    <span>Initializing AmedicK Portal...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F0E7D5] text-[#212842] flex flex-col font-sans">
            {/* Top Navigation Bar */}
            <header className="bg-[#212842] text-[#F0E7D5] border-b border-[#F0E7D5]/15 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    {/* Brand Header */}
                    <div className="flex items-center space-x-3">
                        <img
                            src="/logo.jpg"
                            alt="AmedicK Official Logo"
                            className="w-10 h-10 object-cover border border-[#F0E7D5]/40 rounded-sm bg-[#FAF6EE]"
                        />
                        <div>
                            <span className="text-lg font-bold tracking-tight text-[#F0E7D5] block uppercase leading-none">
                                AmedicK
                            </span>
                            <span className="text-[8px] text-[#F0E7D5]/80 tracking-wider uppercase block mt-0.5">
                                CARE ROOTED IN COMPASSION
                            </span>
                        </div>

                        {/* Role Indicator Tag */}
                        <div className="hidden md:flex items-center ml-6 pl-6 border-l border-[#F0E7D5]/20">
                            <span className="text-xs uppercase font-mono px-2.5 py-1 border border-[#F0E7D5]/30 text-[#F0E7D5] rounded-sm">
                                {currentRole} PORTAL
                            </span>
                        </div>
                    </div>

                    {/* Right User Actions */}
                    <div className="flex items-center space-x-6">
                        <LanguageSelector className="text-[#F0E7D5]" />

                        <div className="text-right hidden sm:block">
                            <span className="block text-xs font-bold text-[#F0E7D5] uppercase tracking-wider">
                                {user?.name}
                            </span>
                            <span className="block text-[11px] text-[#F0E7D5]/70">{user?.email}</span>
                        </div>

                        <button
                            onClick={handleLogout}
                            className="py-1.5 px-3.5 bg-[#F0E7D5] hover:bg-[#E2D7C2] text-[#212842] text-xs font-bold rounded-sm border border-[#212842] transition cursor-pointer"
                        >
                            {t("app.signOut")}
                        </button>
                    </div>
                </div>
            </header>

            {/* Sub-Header Navigation Bar - Strictly Role-Specific */}
            <div className="bg-[#FAF6EE] border-b border-[#212842]/15 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto flex items-center space-x-1 overflow-x-auto py-2">
                    {/* Common to all roles: Overview */}
                    <button
                        onClick={() => setActiveTab("overview")}
                        className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition rounded-sm cursor-pointer ${
                            activeTab === "overview"
                                ? "bg-[#212842] text-[#F0E7D5]"
                                : "text-[#212842]/70 hover:bg-[#F0E7D5] hover:text-[#212842]"
                        }`}
                    >
                        {t("nav.overview")}
                    </button>

                    {/* PATIENT ROLE NAVIGATION */}
                    {currentRole === "PATIENT" && (
                        <>
                            <button
                                onClick={() => setActiveTab("find-doctor")}
                                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition rounded-sm cursor-pointer ${
                                    activeTab === "find-doctor"
                                        ? "bg-[#212842] text-[#F0E7D5]"
                                        : "text-[#212842]/70 hover:bg-[#F0E7D5] hover:text-[#212842]"
                                }`}
                            >
                                {t("nav.findDoctor")}
                            </button>

                            <button
                                onClick={() => setActiveTab("my-appointments")}
                                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition rounded-sm cursor-pointer ${
                                    activeTab === "my-appointments"
                                        ? "bg-[#212842] text-[#F0E7D5]"
                                        : "text-[#212842]/70 hover:bg-[#F0E7D5] hover:text-[#212842]"
                                }`}
                            >
                                {t("nav.myAppointments")}
                            </button>

                            <button
                                onClick={() => setActiveTab("prescriptions")}
                                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition rounded-sm cursor-pointer ${
                                    activeTab === "prescriptions"
                                        ? "bg-[#212842] text-[#F0E7D5]"
                                        : "text-[#212842]/70 hover:bg-[#F0E7D5] hover:text-[#212842]"
                                }`}
                            >
                                {t("nav.prescriptions")} ({prescriptions.length})
                            </button>

                            <button
                                onClick={() => setActiveTab("records")}
                                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition rounded-sm cursor-pointer ${
                                    activeTab === "records"
                                        ? "bg-[#212842] text-[#F0E7D5]"
                                        : "text-[#212842]/70 hover:bg-[#F0E7D5] hover:text-[#212842]"
                                }`}
                            >
                                {t("nav.medicalRecords")} ({medicalRecords.length})
                            </button>

                            <button
                                onClick={() => setActiveTab("medications")}
                                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition rounded-sm cursor-pointer flex items-center space-x-1.5 ${
                                    activeTab === "medications"
                                        ? "bg-[#212842] text-[#F0E7D5]"
                                        : "text-[#212842]/70 hover:bg-[#F0E7D5] hover:text-[#212842]"
                                }`}
                            >
                                <span>💊</span>
                                <span>{t("nav.medReminders")}</span>
                            </button>

                            <button
                                onClick={() => setActiveTab("emergency")}
                                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition rounded-sm cursor-pointer flex items-center space-x-1.5 ${
                                    activeTab === "emergency"
                                        ? "bg-red-700 text-white"
                                        : "text-red-700 hover:bg-red-100/80"
                                }`}
                            >
                                <span>🚨</span>
                                <span>{t("nav.emergencyAssistance", "Emergency Assistance")}</span>
                            </button>

                            <button
                                onClick={() => setActiveTab("ai-assistant")}
                                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition rounded-sm cursor-pointer flex items-center space-x-1.5 ${
                                    activeTab === "ai-assistant"
                                        ? "bg-[#212842] text-[#F0E7D5]"
                                        : "text-[#212842]/70 hover:bg-[#F0E7D5] hover:text-[#212842]"
                                }`}
                            >
                                <span>🤖</span>
                                <span>{t("nav.aiHealthAssistant")}</span>
                            </button>

                            <button
                                onClick={() => setActiveTab("rural")}
                                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition rounded-sm cursor-pointer flex items-center space-x-1.5 ${
                                    activeTab === "rural"
                                        ? "bg-[#212842] text-[#F0E7D5]"
                                        : "text-[#212842]/70 hover:bg-[#F0E7D5] hover:text-[#212842]"
                                }`}
                            >
                                <span>🌾</span>
                                <span>{t("nav.ruralHealthcare", "Rural Healthcare")}</span>
                            </button>
                        </>
                    )}

                    {/* DOCTOR ROLE NAVIGATION */}
                    {currentRole === "DOCTOR" && (
                        <>
                            <button
                                onClick={() => setActiveTab("doctor-appointments")}
                                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition rounded-sm cursor-pointer ${
                                    activeTab === "doctor-appointments"
                                        ? "bg-[#212842] text-[#F0E7D5]"
                                        : "text-[#212842]/70 hover:bg-[#F0E7D5] hover:text-[#212842]"
                                }`}
                            >
                                {t("nav.clinicalAppointments")}
                            </button>

                            <button
                                onClick={() => setActiveTab("prescriptions")}
                                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition rounded-sm cursor-pointer ${
                                    activeTab === "prescriptions"
                                        ? "bg-[#212842] text-[#F0E7D5]"
                                        : "text-[#212842]/70 hover:bg-[#F0E7D5] hover:text-[#212842]"
                                }`}
                            >
                                Digital Prescriptions ({prescriptions.length})
                            </button>

                            <button
                                onClick={() => setActiveTab("records")}
                                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition rounded-sm cursor-pointer ${
                                    activeTab === "records"
                                        ? "bg-[#212842] text-[#F0E7D5]"
                                        : "text-[#212842]/70 hover:bg-[#F0E7D5] hover:text-[#212842]"
                                }`}
                            >
                                Patient Records ({medicalRecords.length})
                            </button>

                            <button
                                onClick={() => setActiveTab("emergency")}
                                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition rounded-sm cursor-pointer flex items-center space-x-1.5 ${
                                    activeTab === "emergency"
                                        ? "bg-red-700 text-white"
                                        : "text-red-700 hover:bg-red-100/80"
                                }`}
                            >
                                <span>🚨</span>
                                <span>Emergency Triage</span>
                            </button>

                            <button
                                onClick={() => setActiveTab("verification")}
                                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition rounded-sm cursor-pointer flex items-center space-x-1.5 ${
                                    activeTab === "verification"
                                        ? "bg-[#212842] text-[#F0E7D5]"
                                        : "text-[#212842]/70 hover:bg-[#F0E7D5] hover:text-[#212842]"
                                }`}
                            >
                                <span>📜</span>
                                <span>Certificate Verification</span>
                            </button>
                        </>
                    )}

                    {/* ADMIN ROLE NAVIGATION */}
                    {currentRole === "ADMIN" && (
                        <>
                            <button
                                onClick={() => navigate("/admin/doctors")}
                                className="px-4 py-2 text-xs font-bold uppercase tracking-wider transition rounded-sm cursor-pointer flex items-center space-x-1.5 bg-amber-800 text-white hover:bg-amber-900"
                            >
                                <span>🛡️</span>
                                <span>Doctor Approvals</span>
                            </button>

                            <button
                                onClick={() => setActiveTab("prescriptions")}
                                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition rounded-sm cursor-pointer ${
                                    activeTab === "prescriptions"
                                        ? "bg-[#212842] text-[#F0E7D5]"
                                        : "text-[#212842]/70 hover:bg-[#F0E7D5] hover:text-[#212842]"
                                }`}
                            >
                                Prescriptions Registry ({prescriptions.length})
                            </button>

                            <button
                                onClick={() => setActiveTab("records")}
                                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition rounded-sm cursor-pointer ${
                                    activeTab === "records"
                                        ? "bg-[#212842] text-[#F0E7D5]"
                                        : "text-[#212842]/70 hover:bg-[#F0E7D5] hover:text-[#212842]"
                                }`}
                            >
                                Records Registry ({medicalRecords.length})
                            </button>

                            <button
                                onClick={() => setActiveTab("emergency")}
                                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition rounded-sm cursor-pointer flex items-center space-x-1.5 ${
                                    activeTab === "emergency"
                                        ? "bg-red-700 text-white"
                                        : "text-red-700 hover:bg-red-100/80"
                                }`}
                            >
                                <span>🚨</span>
                                <span>Emergency Audit</span>
                            </button>
                        </>
                    )}

                    {/* PHARMACY ROLE NAVIGATION */}
                    {currentRole === "PHARMACY" && (
                        <button
                            onClick={() => setActiveTab("prescriptions")}
                            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition rounded-sm cursor-pointer ${
                                activeTab === "prescriptions"
                                    ? "bg-[#212842] text-[#F0E7D5]"
                                    : "text-[#212842]/70 hover:bg-[#F0E7D5] hover:text-[#212842]"
                            }`}
                        >
                            Prescriptions & Dispensing ({prescriptions.length})
                        </button>
                    )}

                    {/* Common to all roles: Blockchain Audit */}
                    <button
                        onClick={() => setActiveTab("audit")}
                        className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition rounded-sm cursor-pointer ${
                            activeTab === "audit"
                                ? "bg-[#212842] text-[#F0E7D5]"
                                : "text-[#212842]/70 hover:bg-[#F0E7D5] hover:text-[#212842]"
                        }`}
                    >
                        {t("nav.blockchainAudit")}
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
                {/* OVERVIEW TAB */}
                {activeTab === "overview" && (
                    <div className="space-y-6">
                        {/* Welcome Banner */}
                        <div className="bg-[#FAF6EE] border border-[#212842]/15 p-6 md:p-8 rounded-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl md:text-3xl font-serif font-bold text-[#212842] tracking-tight">
                                    {t("dashboard.welcome")}, {user?.name || "Healthcare User"}
                                </h1>
                                <p className="text-[#212842]/70 text-sm mt-1 max-w-2xl">
                                    {t("dashboard.subtitle")} <strong>{currentRole}</strong>. {t("dashboard.subtitleDesc")}
                                </p>
                            </div>

                            <div className="flex items-center space-x-3">
                                {currentRole === "DOCTOR" ? (
                                    <button
                                        onClick={() => setActiveTab("doctor-appointments")}
                                        className="py-2.5 px-4 bg-[#212842] hover:bg-[#181E32] text-[#F0E7D5] text-xs font-bold rounded-sm border border-[#212842] transition cursor-pointer"
                                    >
                                        {t("dashboard.manageAppointments")}
                                    </button>
                                ) : currentRole === "ADMIN" ? (
                                    <button
                                        onClick={() => navigate("/admin/doctors")}
                                        className="py-2.5 px-4 bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold rounded-sm border border-amber-900 transition cursor-pointer"
                                    >
                                        🛡️ Review Doctor Approvals
                                    </button>
                                ) : currentRole === "PHARMACY" ? (
                                    <button
                                        onClick={() => setActiveTab("prescriptions")}
                                        className="py-2.5 px-4 bg-[#212842] hover:bg-[#181E32] text-[#F0E7D5] text-xs font-bold rounded-sm border border-[#212842] transition cursor-pointer"
                                    >
                                        View Prescriptions
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleOpenBookingModal}
                                        className="py-2.5 px-4 bg-[#212842] hover:bg-[#181E32] text-[#F0E7D5] text-xs font-bold rounded-sm border border-[#212842] transition cursor-pointer"
                                    >
                                        {t("dashboard.scheduleConsultation")}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Metric Cards Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {currentRole === "PATIENT" ? (
                                <>
                                    <div
                                        onClick={() => setActiveTab("my-appointments")}
                                        className="bg-[#FAF6EE] border border-[#212842]/15 p-5 rounded-md hover:border-[#212842] transition cursor-pointer"
                                    >
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#212842]/70 block mb-1">
                                            {t("dashboard.metrics.appointmentSystem")}
                                        </span>
                                        <span className="text-xl font-serif font-bold text-[#212842] block">
                                            {t("dashboard.metrics.patientBookings")}
                                        </span>
                                        <span className="text-xs block text-[#212842]/60 mt-1 underline">
                                            {t("dashboard.metrics.clickLiveAppointments")}
                                        </span>
                                    </div>

                                    <div
                                        onClick={() => setActiveTab("find-doctor")}
                                        className="bg-[#FAF6EE] border border-[#212842]/15 p-5 rounded-md hover:border-[#212842] transition cursor-pointer"
                                    >
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#212842]/70 block mb-1">
                                            {t("dashboard.metrics.verifiedClinicians")}
                                        </span>
                                        <span className="text-xl font-serif font-bold text-[#212842] block">
                                            {t("dashboard.metrics.findDoctor")}
                                        </span>
                                        <span className="text-xs block text-[#212842]/60 mt-1 underline">
                                            {t("dashboard.metrics.browseProfiles")}
                                        </span>
                                    </div>
                                </>
                            ) : currentRole === "DOCTOR" ? (
                                <>
                                    <div
                                        onClick={() => setActiveTab("doctor-appointments")}
                                        className="bg-[#FAF6EE] border border-[#212842]/15 p-5 rounded-md hover:border-[#212842] transition cursor-pointer"
                                    >
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#212842]/70 block mb-1">
                                            Clinical Schedule
                                        </span>
                                        <span className="text-xl font-serif font-bold text-[#212842] block">
                                            Patient Appointments
                                        </span>
                                        <span className="text-xs block text-[#212842]/60 mt-1 underline">
                                            Manage Consultations →
                                        </span>
                                    </div>

                                    <div
                                        onClick={() => setActiveTab("verification")}
                                        className="bg-[#FAF6EE] border border-[#212842]/15 p-5 rounded-md hover:border-[#212842] transition cursor-pointer"
                                    >
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#212842]/70 block mb-1">
                                            Medical Credentials
                                        </span>
                                        <span className="text-xl font-serif font-bold text-[#212842] block">
                                            Certificate Status
                                        </span>
                                        <span className="text-xs block text-[#212842]/60 mt-1 underline">
                                            Verification Records →
                                        </span>
                                    </div>
                                </>
                            ) : currentRole === "ADMIN" ? (
                                <>
                                    <div
                                        onClick={() => navigate("/admin/doctors")}
                                        className="bg-[#FAF6EE] border border-[#212842]/15 p-5 rounded-md hover:border-[#212842] transition cursor-pointer"
                                    >
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#212842]/70 block mb-1">
                                            Practitioner Review
                                        </span>
                                        <span className="text-xl font-serif font-bold text-[#212842] block">
                                            Doctor Approvals
                                        </span>
                                        <span className="text-xs block text-[#212842]/60 mt-1 underline">
                                            Review Applications →
                                        </span>
                                    </div>

                                    <div
                                        onClick={() => setActiveTab("audit")}
                                        className="bg-[#FAF6EE] border border-[#212842]/15 p-5 rounded-md hover:border-[#212842] transition cursor-pointer"
                                    >
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#212842]/70 block mb-1">
                                            Blockchain Ledger
                                        </span>
                                        <span className="text-xl font-serif font-bold text-[#212842] block">
                                            System Integrity
                                        </span>
                                        <span className="text-xs block text-[#212842]/60 mt-1 underline">
                                            Inspect Audit Trail →
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div
                                        onClick={() => setActiveTab("prescriptions")}
                                        className="bg-[#FAF6EE] border border-[#212842]/15 p-5 rounded-md hover:border-[#212842] transition cursor-pointer"
                                    >
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#212842]/70 block mb-1">
                                            Dispensary Queue
                                        </span>
                                        <span className="text-xl font-serif font-bold text-[#212842] block">
                                            Digital Prescriptions
                                        </span>
                                        <span className="text-xs block text-[#212842]/60 mt-1 underline">
                                            View Active Orders →
                                        </span>
                                    </div>

                                    <div
                                        onClick={() => setActiveTab("audit")}
                                        className="bg-[#FAF6EE] border border-[#212842]/15 p-5 rounded-md hover:border-[#212842] transition cursor-pointer"
                                    >
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#212842]/70 block mb-1">
                                            Prescription Hash
                                        </span>
                                        <span className="text-xl font-serif font-bold text-[#212842] block">
                                            Verify Integrity
                                        </span>
                                        <span className="text-xs block text-[#212842]/60 mt-1 underline">
                                            Check Blockchain →
                                        </span>
                                    </div>
                                </>
                            )}

                            <div className="bg-[#FAF6EE] border border-[#212842]/15 p-5 rounded-md">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#212842]/70 block mb-1">
                                    {t("dashboard.metrics.digitalPrescriptions")}
                                </span>
                                <span className="text-2xl font-serif font-bold text-[#212842]">
                                    {prescriptions.length}
                                </span>
                                <span className="text-xs block text-[#212842]/60 mt-1">
                                    {t("dashboard.metrics.activeRecords")}
                                </span>
                            </div>

                            <div className="bg-[#FAF6EE] border border-[#212842]/15 p-5 rounded-md">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#212842]/70 block mb-1">
                                    {t("dashboard.metrics.accountSecurity")}
                                </span>
                                <span className="text-sm font-mono font-bold text-[#212842] uppercase block mt-1">
                                    {t("dashboard.metrics.verifiedActive")}
                                </span>
                                <span className="text-xs block text-[#212842]/60 mt-1">
                                    {t("dashboard.metrics.mfaProtected")}
                                </span>
                            </div>
                        </div>

                        {/* Direct Role Section */}
                        {currentRole === "PATIENT" ? (
                            <PatientAppointments onOpenBookModal={handleOpenBookingModal} />
                        ) : currentRole === "DOCTOR" ? (
                            <DoctorAppointments />
                        ) : currentRole === "ADMIN" ? (
                            <div className="bg-[#FAF6EE] border border-[#212842]/15 p-6 rounded-md space-y-4">
                                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-[#212842]/15 pb-4">
                                    <div>
                                        <h3 className="text-xl font-serif font-bold text-[#212842]">
                                            Administrator Control & Verification Desk
                                        </h3>
                                        <p className="text-xs text-[#212842]/70 mt-1">
                                            Manage clinical licenses, monitor immutable blockchain audit trails, and oversee emergency triage records.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => navigate("/admin/doctors")}
                                        className="py-2 px-4 bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold rounded-sm border border-amber-900 transition cursor-pointer"
                                    >
                                        🛡️ Doctor Verification Approvals
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                                    <div
                                        onClick={() => navigate("/admin/doctors")}
                                        className="p-4 bg-[#F0E7D5]/60 border border-[#212842]/20 rounded-sm cursor-pointer hover:bg-[#F0E7D5] transition"
                                    >
                                        <div className="text-xs font-bold uppercase tracking-wider text-[#212842]/70">Doctor Verifications</div>
                                        <div className="text-sm font-semibold text-[#212842] mt-1">Review License Applications →</div>
                                    </div>
                                    <div
                                        onClick={() => setActiveTab("audit")}
                                        className="p-4 bg-[#F0E7D5]/60 border border-[#212842]/20 rounded-sm cursor-pointer hover:bg-[#F0E7D5] transition"
                                    >
                                        <div className="text-xs font-bold uppercase tracking-wider text-[#212842]/70">Blockchain Integrity</div>
                                        <div className="text-sm font-semibold text-[#212842] mt-1">Audit Ledger Trails →</div>
                                    </div>
                                    <div
                                        onClick={() => setActiveTab("emergency")}
                                        className="p-4 bg-[#F0E7D5]/60 border border-[#212842]/20 rounded-sm cursor-pointer hover:bg-[#F0E7D5] transition"
                                    >
                                        <div className="text-xs font-bold uppercase tracking-wider text-[#212842]/70">Emergency Triage</div>
                                        <div className="text-sm font-semibold text-[#212842] mt-1">Inspect Emergency Access Logs →</div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-[#FAF6EE] border border-[#212842]/15 p-6 rounded-md space-y-4">
                                <h3 className="text-xl font-serif font-bold text-[#212842]">
                                    Pharmacy Dispensation Portal
                                </h3>
                                <p className="text-xs text-[#212842]/70">
                                    Inspect and dispense blockchain-verified patient prescriptions.
                                </p>
                                <button
                                    onClick={() => setActiveTab("prescriptions")}
                                    className="py-2 px-4 bg-[#212842] text-[#F0E7D5] text-xs font-bold rounded-sm cursor-pointer"
                                >
                                    View Digital Prescriptions ({prescriptions.length})
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* FIND DOCTOR TAB */}
                {activeTab === "find-doctor" && <PatientFindDoctors />}

                {/* MY APPOINTMENTS TAB (PATIENT) */}
                {activeTab === "my-appointments" && (
                    <PatientAppointments onOpenBookModal={handleOpenBookingModal} />
                )}

                {/* CLINICAL APPOINTMENTS TAB (DOCTOR) */}
                {activeTab === "doctor-appointments" && <DoctorAppointments />}

                {/* DOCTOR CERTIFICATE VERIFICATION TAB */}
                {activeTab === "verification" && <DoctorCertificateManager />}

                {/* PRESCRIPTIONS TAB */}
                {activeTab === "prescriptions" && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-serif font-bold text-[#212842]">
                                    Digital Medical Prescriptions
                                </h2>
                                <p className="text-xs text-[#212842]/70 mt-1">
                                    Verified electronic prescriptions issued by attending doctors.
                                </p>
                            </div>
                            {currentRole === "DOCTOR" && (
                                <button
                                    onClick={() => setIsPrescriptionModalOpen(true)}
                                    className="py-2 px-4 bg-[#212842] hover:bg-[#181E32] text-[#F0E7D5] text-xs font-bold rounded-sm border border-[#212842] transition cursor-pointer"
                                >
                                    + Issue Digital Prescription
                                </button>
                            )}
                        </div>

                        <div className="bg-[#FAF6EE] border border-[#212842]/15 rounded-md p-6">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs text-[#212842]">
                                    <thead>
                                        <tr className="border-b border-[#212842]/20 font-bold uppercase text-[10px] tracking-wider text-[#212842]/70">
                                            <th className="py-3 px-3">Prescription ID</th>
                                            <th className="py-3 px-3">Patient Name</th>
                                            <th className="py-3 px-3">Medication & Strength</th>
                                            <th className="py-3 px-3">Dosage Instructions</th>
                                            <th className="py-3 px-3">Prescribing Physician</th>
                                            <th className="py-3 px-3">Issue Date</th>
                                            <th className="py-3 px-3">Verification</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#212842]/10">
                                        {prescriptions.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="py-8 text-center text-xs text-[#212842]/60 font-sans italic">
                                                    No digital prescriptions on record.
                                                </td>
                                            </tr>
                                        ) : (
                                            prescriptions.map((rx) => (
                                                <tr key={rx.id} className="hover:bg-[#F0E7D5]/60">
                                                    <td className="py-3.5 px-3 font-mono font-bold">{rx.id}</td>
                                                    <td className="py-3.5 px-3 font-bold">{rx.patient}</td>
                                                    <td className="py-3.5 px-3 font-semibold">{rx.medication}</td>
                                                    <td className="py-3.5 px-3">{rx.dosage}</td>
                                                    <td className="py-3.5 px-3">{rx.doctor}</td>
                                                    <td className="py-3.5 px-3 font-mono">{rx.date}</td>
                                                    <td className="py-3.5 px-3">
                                                        <span className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase border border-[#212842] bg-[#F0E7D5] rounded-sm">
                                                            {rx.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* MEDICAL RECORDS TAB */}
                {activeTab === "records" && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-serif font-bold text-[#212842]">
                                Encrypted Patient Medical Records
                            </h2>
                            <p className="text-xs text-[#212842]/70 mt-1">
                                Diagnostic reports, assessments, and clinical observations.
                            </p>
                        </div>

                        {medicalRecords.length === 0 ? (
                            <div className="bg-[#FAF6EE] border border-[#212842]/15 rounded-md p-8 text-center">
                                <p className="text-sm font-serif font-bold text-[#212842]">No Encrypted Medical Records Found</p>
                                <p className="text-xs text-[#212842]/60 mt-1 max-w-md mx-auto">
                                    Diagnostic reports, MRI/CT scans, and clinical assessments will appear here once securely uploaded by your healthcare provider.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {medicalRecords.map((rec) => (
                                    <div
                                        key={rec.id}
                                        className="bg-[#FAF6EE] border border-[#212842]/15 p-5 rounded-md flex flex-col justify-between space-y-4"
                                    >
                                        <div>
                                            <div className="flex items-center justify-between border-b border-[#212842]/15 pb-2 mb-3">
                                                <span className="font-mono text-xs font-bold text-[#212842]">
                                                    {rec.id}
                                                </span>
                                                <span className="text-[10px] font-mono text-[#212842]/60">
                                                    {rec.date}
                                                </span>
                                            </div>
                                            <h4 className="font-bold text-sm text-[#212842] mb-1">{rec.type}</h4>
                                            <p className="text-xs text-[#212842]/70 mb-2">
                                                Patient: <strong>{rec.patient}</strong>
                                            </p>
                                            <p className="text-xs text-[#212842]/80 leading-relaxed border-t border-[#212842]/10 pt-2">
                                                {rec.summary}
                                            </p>
                                        </div>

                                        <div className="pt-2 border-t border-[#212842]/15 flex items-center justify-between text-xs">
                                            <span className="text-[11px] text-[#212842]/70">{rec.doctor}</span>
                                            <button
                                                onClick={() => setSelectedRecord(rec)}
                                                className="px-3 py-1 bg-[#212842] text-[#F0E7D5] font-bold text-[10px] uppercase rounded-sm cursor-pointer"
                                            >
                                                View Report
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* AUDIT LOGS TAB */}
                {activeTab === "audit" && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-serif font-bold text-[#212842]">
                                Blockchain Integrity Audit Trail
                            </h2>
                            <p className="text-xs text-[#212842]/70 mt-1">
                                Immutable ledger verification of all medical records and user authentications.
                            </p>
                        </div>

                        <div className="bg-[#FAF6EE] border border-[#212842]/15 rounded-md p-6">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs text-[#212842]">
                                    <thead>
                                        <tr className="border-b border-[#212842]/20 font-bold uppercase text-[10px] tracking-wider text-[#212842]/70">
                                            <th className="py-3 px-3">Transaction Hash</th>
                                            <th className="py-3 px-3">System Action</th>
                                            <th className="py-3 px-3">Authenticated User</th>
                                            <th className="py-3 px-3">Timestamp</th>
                                            <th className="py-3 px-3">Integrity Verification</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#212842]/10 font-mono">
                                        {auditLogs.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="py-8 text-center text-xs text-[#212842]/60 font-sans italic">
                                                    No blockchain audit trail transactions recorded yet.
                                                </td>
                                            </tr>
                                        ) : (
                                            auditLogs.map((log, idx) => (
                                                <tr key={idx} className="hover:bg-[#F0E7D5]/60">
                                                    <td className="py-3.5 px-3 font-bold">{log.hash}</td>
                                                    <td className="py-3.5 px-3 font-sans font-semibold">
                                                        {log.action}
                                                    </td>
                                                    <td className="py-3.5 px-3 font-sans">{log.user}</td>
                                                    <td className="py-3.5 px-3 text-[11px]">{log.timestamp}</td>
                                                    <td className="py-3.5 px-3">
                                                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase border border-[#212842] bg-[#212842] text-[#F0E7D5] rounded-sm">
                                                            BLOCK_VERIFIED
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* MEDICATION REMINDERS TAB */}
                {activeTab === "medications" && <MedicationReminders />}

                {/* EMERGENCY ASSISTANCE TAB */}
                {activeTab === "emergency" && <EmergencyAssistance />}

                {/* AI HEALTH ASSISTANT TAB */}
                {activeTab === "ai-assistant" && (
                    <AiHealthAssistant
                        onFindSpecialist={(specialty) => {
                            setActiveTab("find-doctor");
                        }}
                    />
                )}

                {/* RURAL HEALTHCARE TAB */}
                {activeTab === "rural" && (
                    <RuralHealthcare
                        onFindSpecialist={(specialty) => {
                            setActiveTab("find-doctor");
                        }}
                    />
                )}
            </main>

            {/* Global Book Appointment Modal */}
            {isBookingModalOpen && (
                <BookAppointmentModal
                    verifiedDoctors={verifiedDoctorsList}
                    onClose={() => setIsBookingModalOpen(false)}
                    onSuccess={() => {
                        setActiveTab(currentRole === "PATIENT" ? "my-appointments" : "doctor-appointments");
                    }}
                />
            )}

            {/* Issue Digital Prescription Modal */}
            {isPrescriptionModalOpen && (
                <div className="fixed inset-0 bg-[#212842]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-[#FAF6EE] border border-[#212842] rounded-md max-w-md w-full p-6 space-y-4 text-[#212842]">
                        <div className="flex items-center justify-between border-b border-[#212842]/15 pb-3">
                            <h3 className="text-lg font-bold font-serif">Issue Digital Prescription</h3>
                            <button
                                onClick={() => setIsPrescriptionModalOpen(false)}
                                className="text-xs font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreatePrescription} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-bold uppercase tracking-wider mb-1">
                                    Patient Name
                                </label>
                                <input
                                    type="text"
                                    value={prescriptionForm.patientName}
                                    onChange={(e) =>
                                        setPrescriptionForm({
                                            ...prescriptionForm,
                                            patientName: e.target.value,
                                        })
                                    }
                                    className="w-full p-2.5 bg-[#F0E7D5] border border-[#212842]/30 rounded-sm text-[#212842]"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-bold uppercase tracking-wider mb-1">
                                    Medication Name & Strength
                                </label>
                                <input
                                    type="text"
                                    value={prescriptionForm.medication}
                                    onChange={(e) =>
                                        setPrescriptionForm({
                                            ...prescriptionForm,
                                            medication: e.target.value,
                                        })
                                    }
                                    className="w-full p-2.5 bg-[#F0E7D5] border border-[#212842]/30 rounded-sm text-[#212842]"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-bold uppercase tracking-wider mb-1">
                                    Dosage Instructions
                                </label>
                                <input
                                    type="text"
                                    value={prescriptionForm.dosage}
                                    onChange={(e) =>
                                        setPrescriptionForm({
                                            ...prescriptionForm,
                                            dosage: e.target.value,
                                        })
                                    }
                                    className="w-full p-2.5 bg-[#F0E7D5] border border-[#212842]/30 rounded-sm text-[#212842]"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-bold uppercase tracking-wider mb-1">
                                    Clinical Notes & Duration
                                </label>
                                <textarea
                                    rows="2"
                                    value={prescriptionForm.notes}
                                    onChange={(e) =>
                                        setPrescriptionForm({
                                            ...prescriptionForm,
                                            notes: e.target.value,
                                        })
                                    }
                                    className="w-full p-2.5 bg-[#F0E7D5] border border-[#212842]/30 rounded-sm text-[#212842]"
                                ></textarea>
                            </div>

                            <div className="pt-3 border-t border-[#212842]/15 flex items-center justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setIsPrescriptionModalOpen(false)}
                                    className="py-2 px-4 bg-[#F0E7D5] border border-[#212842] text-[#212842] font-bold rounded-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="py-2 px-4 bg-[#212842] text-[#F0E7D5] font-bold rounded-sm"
                                >
                                    Issue & Sign Prescription
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardPlaceholder;
