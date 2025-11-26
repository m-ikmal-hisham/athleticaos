import api from './axios';

export const fetchOrganisations = async () => {
    const response = await api.get('/organisations');
    return response;
};
