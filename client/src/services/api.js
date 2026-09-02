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
        
        // Extract clean error message
        const errorMessage =
            error.response?.data?.message ||
            error.message ||
            "An unexpected error occurred. Please try again.";

        return Promise.reject(new Error(errorMessage));
    }
);

// 5. Reusable API Functions

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

export default api;
