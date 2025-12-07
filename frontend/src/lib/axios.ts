import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// Create axios instance
const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add JWT token
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('athos_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // Handle 401 Unauthorized
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            // Clear auth data and redirect to login
            localStorage.removeItem('athos_token');
            localStorage.removeItem('auth_user');
            window.location.href = '/login';

            return Promise.reject(error);
        }

        // Handle other errors
        if (error.response) {
            // Server responded with error status
            const apiError = {
                message: error.response.data?.message || 'An error occurred',
                details: error.response.data?.details,
                status: error.response.status,
                timestamp: error.response.data?.timestamp || new Date().toISOString(),
            };
            return Promise.reject(apiError);
        } else if (error.request) {
            // Request was made but no response received
            return Promise.reject({
                message: 'Network error. Please check your connection.',
                status: 0,
                timestamp: new Date().toISOString(),
            });
        } else {
            // Something else happened
            return Promise.reject({
                message: error.message || 'An unexpected error occurred',
                status: 0,
                timestamp: new Date().toISOString(),
            });
        }
    }
);

export default axiosInstance;
