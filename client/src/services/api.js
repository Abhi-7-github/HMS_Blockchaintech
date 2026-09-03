import axios from "axios";

// 1. Base URL configuration from environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const TOKEN_KEY = "amedick_token";

// 2. Axios instance creation
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// Token Helper Methods
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const removeToken = () => localStorage.removeItem(TOKEN_KEY);

// 3. Request Interceptor: Automatically attach Bearer token to authenticated requests
api.interceptors.request.use(
    (config) => {
        const token = getToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// 4. Response Interceptor: Handle 401 Unauthorized responses & error formatting
api.interceptors.response.use(
    (response) => response.data,
    (error) => {
        if (error.response?.status === 401) {
            removeToken(); // Clear expired or invalid token
        }

        let errorMessage =
            error.response?.data?.message ||
            error.message ||
            "An unexpected error occurred. Please try again.";

        if (error.message === "Network Error" && !error.response) {
            errorMessage = "Network Error: Cannot connect to server. Please verify backend is running on http://localhost:5000";
        }

        return Promise.reject(new Error(errorMessage));
    }
);

// 5. Authentication API Functions

/**
 * Register a new user account (PATIENT / DOCTOR)
 * @param {Object} userData - { name, email, phone, password, role }
 */
export const register = async (userData) => {
    return await api.post("/auth/register", userData);
};

/**
 * Verify OTP code sent during signup
 * @param {Object} otpData - { email, otp }
 */
export const verifyOtp = async (otpData) => {
    return await api.post("/auth/verify-otp", otpData);
};

/**
 * Resend OTP code to email
 * @param {Object} emailData - { email }
 */
export const resendOtp = async (emailData) => {
    return await api.post("/auth/resend-otp", emailData);
};

/**
 * Authenticate user and store JWT token
 * @param {Object} credentials - { email, password }
 */
export const login = async (credentials) => {
    const response = await api.post("/auth/login", credentials);
    if (response?.token) {
        setToken(response.token);
    }
    return response;
};

/**
 * Fetch profile of currently authenticated user
 */
export const getCurrentUser = async () => {
    return await api.get("/auth/me");
};

/**
 * Log out user by removing token
 */
export const logout = () => {
    removeToken();
};

// 6. Doctor Profile & Certificate Services

/**
 * Create Doctor Profile
 * @param {Object} profileData
 */
export const createDoctorProfile = async (profileData) => {
    return await api.post("/doctor/profile", profileData);
};

/**
 * Upload Doctor Verification Certificate
 * @param {FormData} formData
 */
export const uploadDoctorCertificate = async (formData) => {
    return await api.post("/doctors/certificates", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });
};

// 7. Admin Doctor Verification API Functions

/**
 * Fetch list of pending doctors requiring admin verification
 * @param {number} page
 * @param {number} limit
 */
export const getAdminPendingDoctors = async (page = 1, limit = 10) => {
    return await api.get(`/admin/doctors/pending?page=${page}&limit=${limit}`);
};

/**
 * Fetch list of all doctors with optional verification status filter (ALL, PENDING, VERIFIED, REJECTED)
 * @param {string} status
 */
export const getAdminDoctors = async (status = "") => {
    const url = status ? `/admin/doctors?status=${encodeURIComponent(status)}` : "/admin/doctors";
    return await api.get(url);
};

/**
 * Fetch detailed doctor profile and submitted certificates by Doctor ID
 * @param {string} id - Doctor ObjectId
 */
export const getAdminDoctorById = async (id) => {
    return await api.get(`/admin/doctors/${id}`);
};

/**
 * Fetch secure temporary access URL for a specific doctor certificate
 * @param {string} doctorId - Doctor ObjectId
 * @param {string} certificateId - DoctorCertificate ObjectId
 */
export const getAdminDoctorCertificate = async (doctorId, certificateId) => {
    return await api.get(`/admin/doctors/${doctorId}/certificates/${certificateId}`);
};

/**
 * Approve doctor verification request
 * @param {string} id - Doctor ObjectId
 */
export const approveAdminDoctor = async (id) => {
    return await api.patch(`/admin/doctors/${id}/verify`);
};

/**
 * Reject doctor verification request with a mandatory rejection reason
 * @param {string} id - Doctor ObjectId
 * @param {string} rejectionReason
 */
export const rejectAdminDoctor = async (id, rejectionReason) => {
    return await api.patch(`/admin/doctors/${id}/reject`, { rejectionReason });
};

export default api;
