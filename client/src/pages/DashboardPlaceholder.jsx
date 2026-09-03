import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, logout, getVerifiedDoctors } from "../services/api";
import PatientFindDoctors from "../components/PatientFindDoctors";
import PatientAppointments from "../components/PatientAppointments";
import DoctorAppointments from "../components/DoctorAppointments";
import BookAppointmentModal from "../components/BookAppointmentModal";

const DashboardPlaceholder = ({ roleTitle }) => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Active Navigation Subtab
    const [activeTab, setActiveTab] = useState("overview");

    // Interactive Modals
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
    const [verifiedDoctorsList, setVerifiedDoctorsList] = useState([]);
    const [selectedRecord, setSelectedRecord] = useState(null);

    // Form input state for prescriptions
    const [prescriptionForm, setPrescriptionForm] = useState({
        patientName: "Arthur Pendelton",
        medication: "Amoxicillin 500mg",
        dosage: "1 tablet 3x daily",
        notes: "Take after food for 7 days",
    });

    const [prescriptions, setPrescriptions] = useState([
        { id: "RX-4091", patient: "Arthur Pendelton", doctor: "Dr. Sarah Jenkins", medication: "Lisinopril 10mg", dosage: "Once daily in morning", date: "2026-09-01", status: "VERIFIED_ACTIVE" },
        { id: "RX-4092", patient: "Eleanor Vance", doctor: "Dr. Marcus Thorne", medication: "Metformin 500mg", dosage: "Twice daily with meals", date: "2026-08-28", status: "VERIFIED_ACTIVE" },
        { id: "RX-4093", patient: "Clara Oswald", doctor: "Dr. Elena Rostova", medication: "Ibuprofen 400mg", dosage: "As needed for pain max 3x daily", date: "2026-08-25", status: "DISPENSED" },
    ]);

    const [medicalRecords] = useState([
        { id: "REC-1029", patient: "Arthur Pendelton", type: "Cardiovascular Screening", date: "2026-08-30", doctor: "Dr. Sarah Jenkins", summary: "Normal sinus rhythm. Blood pressure 120/80 mmHg." },
        { id: "REC-1030", patient: "Eleanor Vance", type: "MRI Brain Scan", date: "2026-08-22", doctor: "Dr. Marcus Thorne", summary: "No structural abnormalities observed. Follow-up recommended in 6 months." },
        { id: "REC-1031", patient: "Julian Hayes", type: "Orthopedic Assessment", date: "2026-08-15", doctor: "Dr. Elena Rostova", summary: "Left knee ligament strain. Conservative physical therapy advised." },
    ]);

    const [auditLogs] = useState([
        { hash: "0x8f2a...99b1", action: "Prescription Signed", user: "Dr. Sarah Jenkins", timestamp: "2026-09-03 08:45:12" },
        { hash: "0x3c1d...44a7", action: "Patient Record Verified", user: "Admin Audit Node", timestamp: "2026-09-03 08:12:04" },
        { hash: "0x7e8b...12c9", action: "OTP Multi-Factor Session Auth", user: "Arthur Pendelton", timestamp: "2026-09-03 07:55:30" },
    ]);

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
                            Sign Out
                        </button>
                    </div>
                </div>
            </header>

            {/* Sub-Header Navigation Bar */}
            <div className="bg-[#FAF6EE] border-b border-[#212842]/15 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto flex items-center space-x-1 overflow-x-auto py-2">
                    <button
                        onClick={() => setActiveTab("overview")}
                        className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition rounded-sm cursor-pointer ${
                            activeTab === "overview"
                                ? "bg-[#212842] text-[#F0E7D5]"
                                : "text-[#212842]/70 hover:bg-[#F0E7D5] hover:text-[#212842]"
                        }`}
                    >
                        Overview
                    </button>

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
                                Find Doctor
                            </button>

                            <button
                                onClick={() => setActiveTab("my-appointments")}
                                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition rounded-sm cursor-pointer ${
                                    activeTab === "my-appointments"
                                        ? "bg-[#212842] text-[#F0E7D5]"
                                        : "text-[#212842]/70 hover:bg-[#F0E7D5] hover:text-[#212842]"
                                }`}
                            >
                                My Appointments
                            </button>
                        </>
                    )}

                    {currentRole === "DOCTOR" && (
                        <button
                            onClick={() => setActiveTab("doctor-appointments")}
                            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition rounded-sm cursor-pointer ${
                                activeTab === "doctor-appointments"
                                    ? "bg-[#212842] text-[#F0E7D5]"
                                    : "text-[#212842]/70 hover:bg-[#F0E7D5] hover:text-[#212842]"
                            }`}
                        >
                            Clinical Appointments
                        </button>
                    )}

                    {currentRole !== "PATIENT" && currentRole !== "DOCTOR" && (
                        <button
                            onClick={() => setActiveTab("find-doctor")}
                            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition rounded-sm cursor-pointer ${
                                activeTab === "find-doctor"
                                    ? "bg-[#212842] text-[#F0E7D5]"
                                    : "text-[#212842]/70 hover:bg-[#F0E7D5] hover:text-[#212842]"
                            }`}
                        >
                            Find Doctor
                        </button>
                    )}

                    <button
                        onClick={() => setActiveTab("prescriptions")}
                        className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition rounded-sm cursor-pointer ${
                            activeTab === "prescriptions"
                                ? "bg-[#212842] text-[#F0E7D5]"
                                : "text-[#212842]/70 hover:bg-[#F0E7D5] hover:text-[#212842]"
                        }`}
                    >
                        Prescriptions ({prescriptions.length})
                    </button>

                    <button
                        onClick={() => setActiveTab("records")}
                        className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition rounded-sm cursor-pointer ${
                            activeTab === "records"
                                ? "bg-[#212842] text-[#F0E7D5]"
                                : "text-[#212842]/70 hover:bg-[#F0E7D5] hover:text-[#212842]"
                        }`}
                    >
                        Medical Records ({medicalRecords.length})
                    </button>

                    <button
                        onClick={() => setActiveTab("audit")}
                        className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition rounded-sm cursor-pointer ${
                            activeTab === "audit"
                                ? "bg-[#212842] text-[#F0E7D5]"
                                : "text-[#212842]/70 hover:bg-[#F0E7D5] hover:text-[#212842]"
                        }`}
                    >
                        Blockchain Audit Logs
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
                                    Welcome, {user?.name || "Healthcare User"}
                                </h1>
                                <p className="text-[#212842]/70 text-sm mt-1 max-w-2xl">
                                    AmedicK Healthcare Portal — Authenticated as <strong>{currentRole}</strong>.
                                    Manage verified doctors, clinical appointments, prescriptions, and encrypted health records.
                                </p>
                            </div>

                            <div className="flex items-center space-x-3">
                                {currentRole === "DOCTOR" ? (
                                    <button
                                        onClick={() => setActiveTab("doctor-appointments")}
                                        className="py-2.5 px-4 bg-[#212842] hover:bg-[#181E32] text-[#F0E7D5] text-xs font-bold rounded-sm border border-[#212842] transition cursor-pointer"
                                    >
                                        Manage Appointments
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleOpenBookingModal}
                                        className="py-2.5 px-4 bg-[#212842] hover:bg-[#181E32] text-[#F0E7D5] text-xs font-bold rounded-sm border border-[#212842] transition cursor-pointer"
                                    >
                                        + Schedule Consultation
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Metric Cards Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div
                                onClick={() =>
                                    setActiveTab(
                                        currentRole === "DOCTOR"
                                            ? "doctor-appointments"
                                            : "my-appointments"
                                    )
                                }
                                className="bg-[#FAF6EE] border border-[#212842]/15 p-5 rounded-md hover:border-[#212842] transition cursor-pointer"
                            >
                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#212842]/70 block mb-1">
                                    Appointment System
                                </span>
                                <span className="text-xl font-serif font-bold text-[#212842] block">
                                    {currentRole === "DOCTOR" ? "Doctor Schedule" : "Patient Bookings"}
                                </span>
                                <span className="text-xs block text-[#212842]/60 mt-1 underline">
                                    Click to view live appointments
                                </span>
                            </div>

                            <div
                                onClick={() => setActiveTab("find-doctor")}
                                className="bg-[#FAF6EE] border border-[#212842]/15 p-5 rounded-md hover:border-[#212842] transition cursor-pointer"
                            >
                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#212842]/70 block mb-1">
                                    Verified Clinicians
                                </span>
                                <span className="text-xl font-serif font-bold text-[#212842] block">
                                    Find Doctor
                                </span>
                                <span className="text-xs block text-[#212842]/60 mt-1 underline">
                                    Browse verified doctor profiles
                                </span>
                            </div>

                            <div className="bg-[#FAF6EE] border border-[#212842]/15 p-5 rounded-md">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#212842]/70 block mb-1">
                                    Digital Prescriptions
                                </span>
                                <span className="text-2xl font-serif font-bold text-[#212842]">
                                    {prescriptions.length}
                                </span>
                                <span className="text-xs block text-[#212842]/60 mt-1">
                                    Active pharmacy records
                                </span>
                            </div>

                            <div className="bg-[#FAF6EE] border border-[#212842]/15 p-5 rounded-md">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#212842]/70 block mb-1">
                                    Account Security
                                </span>
                                <span className="text-sm font-mono font-bold text-[#212842] uppercase block mt-1">
                                    VERIFIED ACTIVE
                                </span>
                                <span className="text-xs block text-[#212842]/60 mt-1">
                                    Multi-Factor OTP Protected
                                </span>
                            </div>
                        </div>

                        {/* Direct Role Section */}
                        {currentRole === "PATIENT" ? (
                            <PatientAppointments onOpenBookModal={handleOpenBookingModal} />
                        ) : currentRole === "DOCTOR" ? (
                            <DoctorAppointments />
                        ) : (
                            <PatientFindDoctors />
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
                                        {prescriptions.map((rx) => (
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
                                        ))}
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
                                        {auditLogs.map((log, idx) => (
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
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
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
