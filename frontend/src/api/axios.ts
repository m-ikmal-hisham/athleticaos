import axios from 'axios';

const api = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL || ''}/api/v1`,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
    xsrfCookieName: 'XSRF-TOKEN',
    xsrfHeaderName: 'X-XSRF-TOKEN',
});

// Request interceptor to add credentials
api.interceptors.request.use(
    (config) => {
        config.withCredentials = true;
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle 401 errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Handle unauthorized access by redirection
            // We avoid importing the store here to prevent circular dependencies
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
