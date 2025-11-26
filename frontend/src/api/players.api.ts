import api from './axios';

export const fetchPlayers = async () => {
    const response = await api.get('/users?role=PLAYER');
    return response;
};
