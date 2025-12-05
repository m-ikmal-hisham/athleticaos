import axios from 'axios';
import { Season, SeasonOverview, SeasonCreateRequest, SeasonUpdateRequest } from '../types/season.types';

const API_URL = '/api/v1/seasons';

export const getSeasons = async (): Promise<Season[]> => {
    const response = await axios.get(API_URL);
    return response.data;
};

export const getActiveSeasons = async (): Promise<Season[]> => {
    const response = await axios.get(`${API_URL}/active`);
    return response.data;
};

export const getSeasonById = async (id: string): Promise<Season> => {
    const response = await axios.get(`${API_URL}/${id}`);
    return response.data;
};

export const getSeasonOverview = async (id: string): Promise<SeasonOverview> => {
    const response = await axios.get(`${API_URL}/${id}/overview`);
    return response.data;
};

export const createSeason = async (season: SeasonCreateRequest): Promise<Season> => {
    const response = await axios.post(API_URL, season);
    return response.data;
};

export const updateSeason = async (id: string, season: SeasonUpdateRequest): Promise<Season> => {
    const response = await axios.put(`${API_URL}/${id}`, season);
    return response.data;
};

export const updateSeasonStatus = async (id: string, status: string): Promise<Season> => {
    const response = await axios.patch(`${API_URL}/${id}/status`, null, {
        params: { status },
    });
    return response.data;
};
