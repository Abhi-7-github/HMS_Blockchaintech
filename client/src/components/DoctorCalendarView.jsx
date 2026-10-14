import React, { useState, useMemo } from "react";

const getAptDateStr = (dateVal) => {
    if (!dateVal) return "";
    if (typeof dateVal === "string" && dateVal.includes("T")) {
        return dateVal.split("T")[0];
    }
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FULL_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const DoctorCalendarView = ({
    appointments = [],
    doctorProfile,
    scheduleForm,
    onConfirm,
    onReject,
    onComplete,
    onCancel,
    onOpenReschedule,
    onEnterConsultationRoom,
    onOpenScheduleModal,
    actionInProgressId,
}) => {
    const today = new Date();
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-11
    const [selectedDateStr, setSelectedDateStr] = useState(getAptDateStr(today));

    // Group appointments by YYYY-MM-DD
    const appointmentsByDate = useMemo(() => {
        const map = {};
        appointments.forEach((apt) => {
            const dateStr = getAptDateStr(apt.appointmentDate);
            if (!dateStr) return;
            if (!map[dateStr]) map[dateStr] = [];
            map[dateStr].push(apt);
        });
        return map;
    }, [appointments]);

    // Navigation
    const handlePrevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear((prev) => prev - 1);
        } else {
            setCurrentMonth((prev) => prev - 1);
        }
    };

    const handleNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear((prev) => prev + 1);
        } else {
            setCurrentMonth((prev) => prev + 1);
        }
    };

    const handleToday = () => {
        setCurrentYear(today.getFullYear());
        setCurrentMonth(today.getMonth());
        setSelectedDateStr(getAptDateStr(today));
    };

    // Calculate calendar grid days
    const calendarDays = useMemo(() => {
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

        const cells = [];

        // Prev month padding
        for (let i = firstDayOfMonth - 1; i >= 0; i--) {
            const dayNum = daysInPrevMonth - i;
            const prevMonthIndex = currentMonth === 0 ? 11 : currentMonth - 1;
            const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
            const dateStr = `${prevYear}-${String(prevMonthIndex + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
            cells.push({
                dayNum,
                dateStr,
                isCurrentMonth: false,
                dayOfWeek: new Date(prevYear, prevMonthIndex, dayNum).getDay(),
            });
        }

        // Current month days
        for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
            cells.push({
                dayNum,
                dateStr,
                isCurrentMonth: true,
                dayOfWeek: new Date(currentYear, currentMonth, dayNum).getDay(),
            });
        }

        // Next month padding to fill complete grid rows (35 or 42 cells)
        const totalRows = cells.length > 35 ? 42 : 35;
        const remaining = totalRows - cells.length;
        for (let dayNum = 1; dayNum <= remaining; dayNum++) {
            const nextMonthIndex = currentMonth === 11 ? 0 : currentMonth + 1;
            const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
            const dateStr = `${nextYear}-${String(nextMonthIndex + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
            cells.push({
                dayNum,
                dateStr,
                isCurrentMonth: false,
                dayOfWeek: new Date(nextYear, nextMonthIndex, dayNum).getDay(),
            });
        }

        return cells;
    }, [currentYear, currentMonth]);

    const activeDays = scheduleForm?.availableDays || [
        "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
    ];

    const todayStr = getAptDateStr(today);

    // Selected date appointments
    const selectedDateAppointments = appointmentsByDate[selectedDateStr] || [];

    const selectedDateObj = selectedDateStr ? new Date(`${selectedDateStr}T00:00:00`) : null;
    const selectedDayName = selectedDateObj ? FULL_DAYS[selectedDateObj.getDay()] : "";
    const isWorkingDay = activeDays.includes(selectedDayName);

    const getBadgeStyle = (status) => {
        switch (status) {
            case "CONFIRMED":
                return "bg-emerald-800 text-emerald-100 border-emerald-900";
            case "REQUESTED":
                return "bg-amber-700 text-amber-100 border-amber-800";
            case "COMPLETED":
                return "bg-indigo-900 text-indigo-100 border-indigo-950";
            case "REJECTED":
            case "CANCELLED":
                return "bg-rose-900 text-rose-100 border-rose-950";
            default:
                return "bg-[#212842] text-[#F0E7D5] border-[#212842]";
        }
    };

    return (
        <div className="space-y-6 text-[#212842]">
            {/* Calendar Controls & Header */}
            <div className="bg-[#FAF6EE] border border-[#212842]/15 p-5 rounded-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center space-x-3">
                        <span className="text-2xl">📅</span>
                        <h2 className="text-xl md:text-2xl font-serif font-bold text-[#212842]">
                            {MONTH_NAMES[currentMonth]} {currentYear}
                        </h2>
                    </div>
                    <p className="text-xs text-[#212842]/70 mt-1">
                        Select any date on the calendar to view appointments and manage clinical scheduling.
                    </p>
                </div>

                <div className="flex items-center space-x-2">
                    <button
                        onClick={handleToday}
                        className="py-1.5 px-3 bg-[#F0E7D5] hover:bg-[#E2D7C2] text-[#212842] font-bold text-xs rounded-sm border border-[#212842]/30 transition cursor-pointer"
                    >
                        Today
                    </button>
                    <button
                        onClick={handlePrevMonth}
                        className="py-1.5 px-3 bg-[#FAF6EE] hover:bg-[#F0E7D5] text-[#212842] font-bold text-xs rounded-sm border border-[#212842]/40 transition cursor-pointer"
                        title="Previous Month"
                    >
                        ◀ Prev
                    </button>
                    <button
                        onClick={handleNextMonth}
                        className="py-1.5 px-3 bg-[#FAF6EE] hover:bg-[#F0E7D5] text-[#212842] font-bold text-xs rounded-sm border border-[#212842]/40 transition cursor-pointer"
                        title="Next Month"
                    >
                        Next ▶
                    </button>
                    {onOpenScheduleModal && (
                        <button
                            onClick={onOpenScheduleModal}
                            className="py-1.5 px-3.5 bg-[#212842] hover:bg-[#181E32] text-[#F0E7D5] font-bold text-xs rounded-sm border border-[#212842] transition cursor-pointer flex items-center space-x-1"
                        >
                            <span>⚙️</span>
                            <span>Set Working Hours</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Main Calendar & Agenda Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* 1. Monthly Calendar Grid (Left / Top 7-8 cols) */}
                <div className="lg:col-span-8 bg-[#FAF6EE] border border-[#212842]/15 rounded-md p-5 shadow-sm space-y-3">
                    
                    {/* Day of Week Header */}
                    <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs uppercase tracking-wider text-[#212842]/70 border-b border-[#212842]/15 pb-2">
                        {DAYS_OF_WEEK.map((d, i) => (
                            <div key={d} className={i === 0 || i === 6 ? "text-[#212842]/50" : ""}>
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Date Cells */}
                    <div className="grid grid-cols-7 gap-1.5">
                        {calendarDays.map((cell) => {
                            const aptsOnDay = appointmentsByDate[cell.dateStr] || [];
                            const isToday = cell.dateStr === todayStr;
                            const isSelected = cell.dateStr === selectedDateStr;
                            const fullDayName = FULL_DAYS[cell.dayOfWeek];
                            const isClinicDay = activeDays.includes(fullDayName);

                            const hasRequested = aptsOnDay.some((a) => a.status === "REQUESTED");
                            const hasConfirmed = aptsOnDay.some((a) => a.status === "CONFIRMED");
                            const hasCompleted = aptsOnDay.some((a) => a.status === "COMPLETED");

                            return (
                                <button
                                    key={cell.dateStr}
                                    type="button"
                                    onClick={() => setSelectedDateStr(cell.dateStr)}
                                    className={`min-h-[76px] p-1.5 rounded-sm border text-left flex flex-col justify-between transition cursor-pointer ${
                                        isSelected
                                            ? "border-[#212842] bg-[#F0E7D5] ring-2 ring-[#212842]/20"
                                            : cell.isCurrentMonth
                                            ? "border-[#212842]/15 bg-[#FAF6EE] hover:bg-[#F0E7D5]/60 hover:border-[#212842]/40"
                                            : "border-[#212842]/10 bg-[#FAF6EE]/50 opacity-45 hover:opacity-80"
                                    }`}
                                >
                                    {/* Top Row: Date number & Working indicator */}
                                    <div className="flex items-center justify-between w-full">
                                        <span
                                            className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded-xs ${
                                                isToday
                                                    ? "bg-[#212842] text-[#F0E7D5]"
                                                    : isSelected
                                                    ? "text-[#212842] font-black underline"
                                                    : "text-[#212842]"
                                            }`}
                                        >
                                            {cell.dayNum}
                                        </span>

                                        {cell.isCurrentMonth && (
                                            <span
                                                className={`text-[8px] font-mono px-1 rounded-2xs ${
                                                    isClinicDay
                                                        ? "text-emerald-800 font-semibold"
                                                        : "text-[#212842]/40"
                                                }`}
                                                title={isClinicDay ? "Doctor Working Day" : "Non-working Day"}
                                            >
                                                {isClinicDay ? "ON" : "OFF"}
                                            </span>
                                        )}
                                    </div>

                                    {/* Bottom: Appointment Indicators */}
                                    <div className="w-full mt-1 space-y-0.5">
                                        {aptsOnDay.length > 0 ? (
                                            <>
                                                <div className="flex items-center space-x-1">
                                                    {hasRequested && (
                                                        <span className="w-2 h-2 rounded-full bg-amber-600 inline-block" title="Pending Requests" />
                                                    )}
                                                    {hasConfirmed && (
                                                        <span className="w-2 h-2 rounded-full bg-emerald-700 inline-block" title="Confirmed Upcoming" />
                                                    )}
                                                    {hasCompleted && (
                                                        <span className="w-2 h-2 rounded-full bg-indigo-800 inline-block" title="Completed" />
                                                    )}
                                                </div>
                                                <div className="text-[9px] font-bold font-mono text-[#212842] truncate">
                                                    {aptsOnDay.length} apt{aptsOnDay.length > 1 ? "s" : ""}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="h-4" />
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Color Legend */}
                    <div className="pt-3 border-t border-[#212842]/15 flex flex-wrap items-center justify-between text-[11px] text-[#212842]/70 gap-2">
                        <div className="flex items-center space-x-3">
                            <span className="flex items-center space-x-1">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                                <span>Pending Request</span>
                            </span>
                            <span className="flex items-center space-x-1">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-700" />
                                <span>Confirmed</span>
                            </span>
                            <span className="flex items-center space-x-1">
                                <span className="w-2.5 h-2.5 rounded-full bg-indigo-800" />
                                <span>Completed</span>
                            </span>
                        </div>
                        <div className="font-mono text-[10px]">
                            ON = Working Day | OFF = Non-working
                        </div>
                    </div>
                </div>

                {/* 2. Agenda / Appointments for Selected Date (Right 4-5 cols) */}
                <div className="lg:col-span-4 bg-[#FAF6EE] border border-[#212842]/15 rounded-md p-5 flex flex-col justify-between space-y-4 shadow-sm">
                    <div>
                        {/* Selected Date Header */}
                        <div className="border-b border-[#212842]/15 pb-3">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#212842]/70 block">
                                Selected Date Agenda
                            </span>
                            <h3 className="text-lg font-serif font-bold text-[#212842] mt-0.5">
                                {selectedDateObj ? (
                                    selectedDateObj.toLocaleDateString("en-US", {
                                        weekday: "long",
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                    })
                                ) : (
                                    "No Date Selected"
                                )}
                            </h3>
                            <div className="flex items-center space-x-2 mt-1.5 text-xs">
                                <span
                                    className={`px-2 py-0.5 rounded-xs font-bold text-[10px] ${
                                        isWorkingDay
                                            ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                                            : "bg-[#F0E7D5] text-[#212842]/60 border border-[#212842]/20"
                                    }`}
                                >
                                    {isWorkingDay ? "✓ Active Clinical Working Day" : "Non-working Day"}
                                </span>
                                <span className="font-mono text-[#212842]/70 text-[10px]">
                                    ({selectedDateAppointments.length} Bookings)
                                </span>
                            </div>
                        </div>

                        {/* Working Timings reminder */}
                        <div className="py-2.5 px-3 bg-[#F0E7D5] border border-[#212842]/15 rounded-sm text-xs mt-3">
                            <span className="font-bold text-[#212842] block text-[11px]">
                                Consultation Hours for {selectedDayName}:
                            </span>
                            <span className="font-mono text-[11px] text-[#212842]/80">
                                🕒 {scheduleForm?.dailyStartTime || "09:00"} - {scheduleForm?.dailyEndTime || "17:00"} ({scheduleForm?.availableTimings})
                            </span>
                        </div>

                        {/* Appointments on this date */}
                        <div className="mt-4 space-y-3 max-h-[460px] overflow-y-auto pr-1">
                            {selectedDateAppointments.length === 0 ? (
                                <div className="py-10 text-center text-[#212842]/60 text-xs italic bg-[#F0E7D5]/40 rounded-sm p-4 border border-[#212842]/10">
                                    No consultations scheduled on this date.
                                </div>
                            ) : (
                                selectedDateAppointments.map((apt) => {
                                    const patientUser = apt.patientId?.userId || {};
                                    const isPendingAction = actionInProgressId === apt._id;

                                    return (
                                        <div
                                            key={apt._id}
                                            className="p-3.5 bg-[#F0E7D5] border border-[#212842]/20 rounded-md space-y-2 text-xs hover:border-[#212842] transition"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className={`px-2 py-0.5 text-[9px] font-mono font-bold uppercase border rounded-xs ${getBadgeStyle(apt.status)}`}>
                                                    {apt.status}
                                                </span>
                                                <span className="font-mono font-bold text-xs text-[#212842]">
                                                    ⏰ {apt.startTime} - {apt.endTime}
                                                </span>
                                            </div>

                                            <div>
                                                <div className="font-bold text-sm text-[#212842]">
                                                    {patientUser.name || "Patient"}
                                                </div>
                                                <div className="text-[11px] text-[#212842]/70">
                                                    Mode: <strong className="font-mono">{apt.consultationMode}</strong> • Phone: {patientUser.phone || "N/A"}
                                                </div>
                                            </div>

                                            <div className="text-[11px] text-[#212842]/85 bg-[#FAF6EE] p-2 rounded-xs border border-[#212842]/10">
                                                <strong>Reason: </strong> {apt.reason}
                                            </div>

                                            {/* Action Buttons for this specific appointment */}
                                            <div className="pt-2 border-t border-[#212842]/15 flex flex-wrap items-center justify-end gap-1.5">
                                                {["REQUESTED", "CONFIRMED"].includes(apt.status) && onOpenReschedule && (
                                                    <button
                                                        onClick={() => onOpenReschedule(apt)}
                                                        className="py-1 px-2.5 bg-[#FAF6EE] hover:bg-[#E2D7C2] text-[#212842] font-bold text-[10px] rounded-xs border border-[#212842]/30 cursor-pointer"
                                                    >
                                                        📅 Reschedule
                                                    </button>
                                                )}

                                                {apt.status === "REQUESTED" && (
                                                    <>
                                                        {onReject && (
                                                            <button
                                                                onClick={() => onReject(apt._id)}
                                                                disabled={isPendingAction}
                                                                className="py-1 px-2.5 bg-rose-900 text-white font-bold text-[10px] rounded-xs cursor-pointer"
                                                            >
                                                                Reject
                                                            </button>
                                                        )}
                                                        {onConfirm && (
                                                            <button
                                                                onClick={() => onConfirm(apt._id)}
                                                                disabled={isPendingAction}
                                                                className="py-1 px-2.5 bg-emerald-800 text-white font-bold text-[10px] rounded-xs cursor-pointer"
                                                            >
                                                                Confirm
                                                            </button>
                                                        )}
                                                    </>
                                                )}

                                                {["CONFIRMED", "COMPLETED"].includes(apt.status) && onEnterConsultationRoom && (
                                                    <button
                                                        onClick={() => onEnterConsultationRoom(apt._id)}
                                                        className="py-1 px-2.5 bg-emerald-700 text-white font-bold text-[10px] rounded-xs cursor-pointer flex items-center space-x-1"
                                                    >
                                                        <span>📹</span>
                                                        <span>Enter Room</span>
                                                    </button>
                                                )}

                                                {apt.status === "CONFIRMED" && (
                                                    <>
                                                        {onCancel && (
                                                            <button
                                                                onClick={() => onCancel(apt._id)}
                                                                disabled={isPendingAction}
                                                                className="py-1 px-2.5 bg-rose-900 text-white font-bold text-[10px] rounded-xs cursor-pointer"
                                                            >
                                                                Cancel
                                                            </button>
                                                        )}
                                                        {onComplete && (
                                                            <button
                                                                onClick={() => onComplete(apt._id)}
                                                                disabled={isPendingAction}
                                                                className="py-1 px-2.5 bg-[#212842] text-[#F0E7D5] font-bold text-[10px] rounded-xs cursor-pointer"
                                                            >
                                                                Done
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DoctorCalendarView;
