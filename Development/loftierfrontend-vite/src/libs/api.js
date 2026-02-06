// src/libs/api.js
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
    baseURL: API_BASE_URL,
    // headers: { "Content-Type": "application/json" } // Standard practice
});

/**
 * Single Interceptor for Token Management
 * This is more reliable than using axios.defaults because it 
 * fetches the token fresh for every single request.
 */
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("jwt_token");
        if (token) {
            // Use the newer Axios 'headers.set' method for better compatibility
            config.headers.set("Authorization", `Bearer ${token}`);
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;