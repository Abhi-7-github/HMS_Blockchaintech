const mongoose = require("mongoose");

/**
 * Converts a 24-hour format time string ("HH:mm") into total minutes from midnight.
 * Returns null if the format is invalid.
 */
const timeToMinutes = (timeStr) => {
    if (!timeStr || typeof timeStr !== "string") return null;
    const match = timeStr.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
    if (!match) return null;
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    return hours * 60 + minutes;
};

const appointmentSchema = new mongoose.Schema(
    {
        patientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Patient",
            required: [true, "Patient reference is required"],
            index: true,
        },
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Doctor",
            required: [true, "Doctor reference is required"],
            index: true,
        },
        appointmentDate: {
            type: Date,
            required: [true, "Appointment date is required"],
        },
        startTime: {
            type: String,
            required: [true, "Start time is required"],
            trim: true,
            validate: {
                validator: function (v) {
                    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
                },
                message: "Start time must be in HH:mm 24-hour format (e.g., 09:00 or 14:30)",
            },
        },
        endTime: {
            type: String,
            required: [true, "End time is required"],
            trim: true,
            validate: {
                validator: function (v) {
                    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
                },
                message: "End time must be in HH:mm 24-hour format (e.g., 09:30 or 15:00)",
            },
        },
        consultationMode: {
            type: String,
            uppercase: true,
            trim: true,
            required: [true, "Consultation mode is required"],
            enum: {
                values: ["ONLINE", "IN_PERSON"],
                message: "{VALUE} is not a valid consultation mode for an appointment",
            },
        },
        reason: {
            type: String,
            required: [true, "Reason for appointment is required"],
            trim: true,
        },
        status: {
            type: String,
            uppercase: true,
            trim: true,
            default: "REQUESTED",
            enum: {
                values: ["REQUESTED", "CONFIRMED", "REJECTED", "CANCELLED", "COMPLETED"],
                message: "{VALUE} is not a valid appointment status",
            },
        },
    },
    {
        timestamps: true, // Automatically manages createdAt and updatedAt
    }
);

// Compound indexes for optimal query performance
appointmentSchema.index({ doctorId: 1, appointmentDate: 1, status: 1 });
appointmentSchema.index({ patientId: 1, appointmentDate: 1, status: 1 });
appointmentSchema.index({ doctorId: 1, appointmentDate: 1, startTime: 1 });
appointmentSchema.index({ patientId: 1, appointmentDate: 1, startTime: 1 });
appointmentSchema.index({ status: 1 });

// Pre-validate hook for date/time validation, doctor verification check, and conflict prevention
appointmentSchema.pre("validate", async function () {
    // 1. Validate startTime and endTime ordering
    if (this.startTime && this.endTime) {
        const startMins = timeToMinutes(this.startTime);
        const endMins = timeToMinutes(this.endTime);
        if (startMins !== null && endMins !== null && endMins <= startMins) {
            this.invalidate("endTime", "End time must be strictly after start time");
        }
    }

    // 2. Validate that appointment date & start time are not in the past (for new appointments or modified date/time)
    if (this.isNew || this.isModified("appointmentDate") || this.isModified("startTime")) {
        if (this.appointmentDate && this.startTime) {
            const [startH, startM] = this.startTime.split(":").map(Number);
            const appointmentDateTime = new Date(this.appointmentDate);
            appointmentDateTime.setHours(startH, startM, 0, 0);

            // Allow a 1-minute margin for execution delay
            const now = new Date(Date.now() - 60000);
            if (appointmentDateTime < now) {
                this.invalidate("appointmentDate", "Appointment date and start time cannot be in the past");
            }
        }
    }

    // 3. Requirement 3: Only VERIFIED doctors can receive appointments
    if (this.isNew || this.isModified("doctorId")) {
        if (this.doctorId) {
            const Doctor = mongoose.model("Doctor");
            const doctor = await Doctor.findById(this.doctorId);
            if (!doctor) {
                this.invalidate("doctorId", "Doctor not found");
            } else if (doctor.verificationStatus !== "VERIFIED") {
                this.invalidate("doctorId", "Appointments can only be booked with VERIFIED doctors");
            } else if (this.consultationMode && doctor.consultationMode !== "BOTH" && doctor.consultationMode !== this.consultationMode) {
                this.invalidate("consultationMode", `Doctor only supports ${doctor.consultationMode} consultations`);
            }
        }
    }

    // Requirement 1: Validate patient existence
    if (this.isNew || this.isModified("patientId")) {
        if (this.patientId) {
            const Patient = mongoose.model("Patient");
            const patient = await Patient.findById(this.patientId);
            if (!patient) {
                this.invalidate("patientId", "Patient not found");
            }
        }
    }

    // 4. Requirement 5: Prevent obvious appointment conflicts for active appointments
    if (
        (this.isNew ||
            this.isModified("appointmentDate") ||
            this.isModified("startTime") ||
            this.isModified("endTime") ||
            this.isModified("doctorId") ||
            this.isModified("patientId") ||
            this.isModified("status")) &&
        !["CANCELLED", "REJECTED"].includes(this.status)
    ) {
        if (this.doctorId && this.appointmentDate && this.startTime && this.endTime) {
            const newStart = timeToMinutes(this.startTime);
            const newEnd = timeToMinutes(this.endTime);

            if (newStart !== null && newEnd !== null) {
                const startOfDay = new Date(this.appointmentDate);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(this.appointmentDate);
                endOfDay.setHours(23, 59, 59, 999);

                // Check conflict for doctor
                const doctorConflictQuery = {
                    _id: { $ne: this._id },
                    doctorId: this.doctorId,
                    appointmentDate: { $gte: startOfDay, $lte: endOfDay },
                    status: { $nin: ["CANCELLED", "REJECTED"] },
                };
                const existingDoctorAppointments = await mongoose.model("Appointment").find(doctorConflictQuery);
                for (const app of existingDoctorAppointments) {
                    const appStart = timeToMinutes(app.startTime);
                    const appEnd = timeToMinutes(app.endTime);
                    if (newStart < appEnd && newEnd > appStart) {
                        this.invalidate("startTime", "Doctor has an existing appointment during this time slot");
                        break;
                    }
                }

                // Check conflict for patient
                if (this.patientId) {
                    const patientConflictQuery = {
                        _id: { $ne: this._id },
                        patientId: this.patientId,
                        appointmentDate: { $gte: startOfDay, $lte: endOfDay },
                        status: { $nin: ["CANCELLED", "REJECTED"] },
                    };
                    const existingPatientAppointments = await mongoose.model("Appointment").find(patientConflictQuery);
                    for (const app of existingPatientAppointments) {
                        const appStart = timeToMinutes(app.startTime);
                        const appEnd = timeToMinutes(app.endTime);
                        if (newStart < appEnd && newEnd > appStart) {
                            this.invalidate("startTime", "Patient already has an appointment scheduled during this time slot");
                            break;
                        }
                    }
                }
            }
        }
    }
});

const Appointment = mongoose.model("Appointment", appointmentSchema);

module.exports = Appointment;
