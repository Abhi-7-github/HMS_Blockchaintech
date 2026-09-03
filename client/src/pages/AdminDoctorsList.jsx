import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAdminDoctors, getCurrentUser, logout } from "../services/api";

const AdminDoctorsList = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [doctors, setDoctors] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    // Filter and Search States
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [searchQuery, setSearchQuery] = useState("");

    const fetchDoctorList = async (status = "") => {
        setIsLoading(true);
        setErrorMessage("");
        try {
            const filterValue = status === "ALL" ? "" : status;
            const res = await getAdminDoctors(filterValue);
            setDoctors(res.data || []);
        } catch (err) {
            console.error("Failed to fetch doctors for admin:", err.message);
            setErrorMessage(err.message || "Failed to load doctor profiles. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const initDashboard = async () => {
            try {
                const me = await getCurrentUser();
                setUser(me?.user || null);
            } catch (e) {
                console.error("Failed to fetch admin identity:", e.message);
            }
            fetchDoctorList(statusFilter);
        };

        initDashboard();
    }, []);

    const handleFilterChange = (e) => {
        const selected = e.target.value;
        setStatusFilter(selected);
        fetchDoctorList(selected);
    };

    const handleLogout = () => {
        logout();
        navigate("/login", { replace: true });
    };

    // Client-side search filtering across Name, Specialization, Registration Number, Hospital, Email
    const filteredDoctors = doctors.filter((doc) => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;

        const name = (doc.userId?.name || "").toLowerCase();
        const email = (doc.userId?.email || "").toLowerCase();
        const specialization = (doc.specialization || "").toLowerCase();
        const regNo = (doc.registrationNumber || "").toLowerCase();
        const hospital = (doc.hospital || "").toLowerCase();

        return (
            name.includes(query) ||
            email.includes(query) ||
            specialization.includes(query) ||
            regNo.includes(query) ||
            hospital.includes(query)
        );
    });

    const pendingCount = doctors.filter((d) => d.verificationStatus === "PENDING").length;
    const verifiedCount = doctors.filter((d) => d.verificationStatus === "VERIFIED").length;
    const rejectedCount = doctors.filter((d) => d.verificationStatus === "REJECTED").length;

    return (
        <div className="min-h-screen bg-[#F0E7D5] text-[#212842] flex flex-col font-sans">
            {/* Header / Brand Navigation Bar */}
            <header className="bg-[#212842] text-[#F0E7D5] border-b border-[#F0E7D5]/15 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
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

                        <div className="hidden md:flex items-center ml-6 pl-6 border-l border-[#F0E7D5]/20">
                            <span className="text-xs uppercase font-mono px-2.5 py-1 border border-[#F0E7D5]/30 text-[#F0E7D5] rounded-sm">
                                ADMIN VERIFICATION DESK
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center space-x-6">
                        <div className="text-right hidden sm:block">
                            <span className="block text-xs font-bold text-[#F0E7D5] uppercase tracking-wider">
                                {user?.name || "System Administrator"}
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

            {/* Sub-Header Navigation */}
            <div className="bg-[#FAF6EE] border-b border-[#212842]/15 px-4 sm:px-6 lg:px-8 py-3">
                <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center space-x-2 text-xs">
                        <button
                            onClick={() => navigate("/admin/dashboard")}
                            className="font-bold text-[#212842]/70 hover:text-[#212842]"
                        >
                            Dashboard
                        </button>
                        <span className="text-[#212842]/40">/</span>
                        <span className="font-bold text-[#212842]">Doctor Verifications</span>
                    </div>

                    {/* Quick Metric Badges */}
                    <div className="flex items-center space-x-2 text-[11px] font-mono">
                        <span className="px-2.5 py-1 bg-[#212842] text-[#F0E7D5] font-bold rounded-sm">
                            Total: {doctors.length}
                        </span>
                        <span className="px-2.5 py-1 border border-[#212842] text-[#212842] font-bold rounded-sm">
                            Pending: {pendingCount}
                        </span>
                        <span className="px-2.5 py-1 border border-[#212842] bg-[#F0E7D5] text-[#212842] font-bold rounded-sm">
                            Verified: {verifiedCount}
                        </span>
                    </div>
                </div>
            </div>

            {/* Main Content Dashboard */}
            <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
                {/* Title Banner */}
                <div className="bg-[#FAF6EE] border border-[#212842]/15 p-6 rounded-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-serif font-bold text-[#212842] tracking-tight">
                            Doctor Credential Verification Desk
                        </h1>
                        <p className="text-xs text-[#212842]/70 mt-1 max-w-2xl">
                            Review practitioner credentials, medical registration certificates, and grant clinical access permissions across the AmedicK network.
                        </p>
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="bg-[#FAF6EE] border border-[#212842]/15 p-4 rounded-md flex flex-col sm:flex-row items-center justify-between gap-4">
                    {/* Search Input */}
                    <div className="w-full sm:w-96 relative">
                        <input
                            type="text"
                            placeholder="Search doctor name, specialization, reg no, hospital..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-3 pr-4 py-2.5 bg-[#F0E7D5] border border-[#212842]/30 rounded-sm text-xs text-[#212842] placeholder-[#212842]/50 focus:outline-none focus:border-[#212842]"
                        />
                    </div>

                    {/* Verification Status Filter Dropdown */}
                    <div className="flex items-center space-x-3 w-full sm:w-auto">
                        <label className="text-xs font-bold uppercase tracking-wider text-[#212842]/70 whitespace-nowrap">
                            Filter Status:
                        </label>
                        <select
                            value={statusFilter}
                            onChange={handleFilterChange}
                            className="p-2.5 bg-[#F0E7D5] border border-[#212842]/30 rounded-sm text-xs font-bold text-[#212842] cursor-pointer focus:outline-none focus:border-[#212842]"
                        >
                            <option value="ALL">All Doctors</option>
                            <option value="PENDING">Pending Approval ({pendingCount})</option>
                            <option value="VERIFIED">Verified ({verifiedCount})</option>
                            <option value="REJECTED">Rejected ({rejectedCount})</option>
                        </select>
                    </div>
                </div>

                {/* ERROR STATE */}
                {errorMessage && (
                    <div className="p-4 bg-[#FAF6EE] border border-[#212842] rounded-md text-xs text-[#212842] flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <span className="font-bold uppercase tracking-wider">Error:</span>
                            <span>{errorMessage}</span>
                        </div>
                        <button
                            onClick={() => fetchDoctorList(statusFilter)}
                            className="py-1 px-3 bg-[#212842] text-[#F0E7D5] text-[10px] font-bold uppercase rounded-sm hover:bg-[#181E32] cursor-pointer"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {/* LOADING STATE */}
                {isLoading ? (
                    <div className="bg-[#FAF6EE] border border-[#212842]/15 p-12 rounded-md flex flex-col items-center justify-center space-y-3">
                        <div className="w-6 h-6 border-2 border-[#212842] border-t-transparent animate-spin rounded-full"></div>
                        <span className="text-xs font-bold uppercase tracking-wider text-[#212842]">
                            Fetching Doctor Applications...
                        </span>
                    </div>
                ) : filteredDoctors.length === 0 ? (
                    /* EMPTY STATE */
                    <div className="bg-[#FAF6EE] border border-[#212842]/15 p-12 rounded-md text-center space-y-3">
                        <span className="text-xl font-serif font-bold text-[#212842] block">No Doctors Found</span>
                        <p className="text-xs text-[#212842]/70 max-w-md mx-auto">
                            {searchQuery
                                ? `No practitioner profiles match your search criteria "${searchQuery}".`
                                : `There are currently no doctor profiles matching status "${statusFilter}".`}
                        </p>
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="py-2 px-4 bg-[#212842] text-[#F0E7D5] text-xs font-bold rounded-sm cursor-pointer"
                            >
                                Clear Search Filter
                            </button>
                        )}
                    </div>
                ) : (
                    /* DOCTORS TABLE */
                    <div className="bg-[#FAF6EE] border border-[#212842]/15 rounded-md overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-[#212842]">
                                <thead>
                                    <tr className="bg-[#212842] text-[#F0E7D5] font-bold uppercase text-[10px] tracking-wider border-b border-[#212842]">
                                        <th className="py-3 px-4">Doctor</th>
                                        <th className="py-3 px-4">Specialization</th>
                                        <th className="py-3 px-4">Qualification</th>
                                        <th className="py-3 px-4">Registration Number</th>
                                        <th className="py-3 px-4">Hospital / Experience</th>
                                        <th className="py-3 px-4">Submitted</th>
                                        <th className="py-3 px-4">Status</th>
                                        <th className="py-3 px-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#212842]/10">
                                    {filteredDoctors.map((doc) => (
                                        <tr key={doc._id || doc.doctorId} className="hover:bg-[#F0E7D5]/70 transition">
                                            {/* Doctor Name & Email */}
                                            <td className="py-3.5 px-4">
                                                <span className="font-bold text-sm block">
                                                    {doc.userId?.name || doc.name || "Dr. Unnamed"}
                                                </span>
                                                <span className="text-[11px] text-[#212842]/70 font-mono">
                                                    {doc.userId?.email || doc.email || "No email"}
                                                </span>
                                            </td>

                                            {/* Specialization */}
                                            <td className="py-3.5 px-4 font-semibold">{doc.specialization}</td>

                                            {/* Qualification */}
                                            <td className="py-3.5 px-4">{doc.qualification}</td>

                                            {/* Registration Number */}
                                            <td className="py-3.5 px-4 font-mono font-bold text-[11px]">
                                                {doc.registrationNumber}
                                            </td>

                                            {/* Hospital / Experience */}
                                            <td className="py-3.5 px-4">
                                                <span className="block font-semibold">{doc.hospital}</span>
                                                <span className="text-[10px] text-[#212842]/70 font-mono">
                                                    {doc.experience} Years Exp.
                                                </span>
                                            </td>

                                            {/* Submitted Date */}
                                            <td className="py-3.5 px-4 font-mono text-[11px]">
                                                {new Date(doc.createdAt || doc.submittedDate).toLocaleDateString()}
                                            </td>

                                            {/* Status Badge */}
                                            <td className="py-3.5 px-4">
                                                <span
                                                    className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase rounded-sm border ${
                                                        doc.verificationStatus === "VERIFIED"
                                                            ? "bg-[#212842] text-[#F0E7D5] border-[#212842]"
                                                            : doc.verificationStatus === "REJECTED"
                                                            ? "bg-[#FAF6EE] text-[#212842] border-[#212842] line-through"
                                                            : "bg-[#F0E7D5] text-[#212842] border-[#212842]"
                                                    }`}
                                                >
                                                    {doc.verificationStatus}
                                                </span>
                                            </td>

                                            {/* Action Button */}
                                            <td className="py-3.5 px-4 text-right">
                                                <button
                                                    onClick={() => navigate(`/admin/doctors/${doc._id || doc.doctorId}`)}
                                                    className="py-1.5 px-3 bg-[#212842] hover:bg-[#181E32] text-[#F0E7D5] text-[10px] font-bold uppercase rounded-sm transition cursor-pointer border border-[#212842]"
                                                >
                                                    Review & Verify →
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default AdminDoctorsList;
