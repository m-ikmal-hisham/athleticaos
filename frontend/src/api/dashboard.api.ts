import api from './axios';

export const fetchDashboardStats = () => api.get('/dashboard/stats');
