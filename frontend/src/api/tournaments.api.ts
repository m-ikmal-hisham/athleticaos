import api from './axios';

export const fetchTournaments = async () => {
    const response = await api.get('/tournaments');
    return response;
};
