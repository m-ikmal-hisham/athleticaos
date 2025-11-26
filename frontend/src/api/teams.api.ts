import api from './axios';

export const fetchTeams = async () => {
    const response = await api.get('/teams');
    return response;
};
