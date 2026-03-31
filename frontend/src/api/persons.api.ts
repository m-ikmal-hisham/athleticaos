import api from './axios';

export interface PersonResponseDTO {
    id: string;
    firstName: string;
    lastName: string;
    icOrPassport: string;
    dob: string;
    gender: string;
    nationality: string;
    email: string;
    phone: string;
    registeredAt: string;
    nationalPlayerStatus: string;
    nationalOrganisationLogoUrl?: string;
    roles: string[];
    userId?: string;
    isPlayer?: boolean;
    isStaff?: boolean;
    isOfficial?: boolean;
    isWorldRugbyCertified?: boolean;
}

export interface PaginatedResponse<T> {
    content: T[];
    totalPages: number;
    totalElements: number;
    size: number;
    number: number;
    first: boolean;
    last: boolean;
    numberOfElements: number;
    empty: boolean;
}

export interface PersonUpdateRequest {
    firstName: string;
    lastName: string;
    icOrPassport: string;
    dob: string;
    gender: string;
    nationality: string;
    email: string;
    phone: string;
    nationalPlayerStatus: string;
}

export interface CreatePersonRequest {
    firstName: string;
    lastName: string;
    icOrPassport: string;
    dob: string;
    gender: string;
    nationality: string;
    email: string;
    phone: string;
    nationalPlayerStatus: string;
}

export const getPersonsByOrganisation = async (
    orgId: string,
    page: number = 0,
    size: number = 50
): Promise<PaginatedResponse<PersonResponseDTO>> => {
    const response = await api.get(`/persons/organisation/${orgId}`, {
        params: { page, size }
    });
    return response.data;
};

export const createPerson = async (orgId: string, request: CreatePersonRequest): Promise<PersonResponseDTO> => {
    const response = await api.post(`/persons/organisation/${orgId}`, request);
    return response.data;
};

export const getPersonById = async (id: string): Promise<PersonResponseDTO> => {
    const response = await api.get(`/persons/${id}`);
    return response.data;
};

export const updatePerson = async (id: string, request: PersonUpdateRequest): Promise<PersonResponseDTO> => {
    const response = await api.put(`/persons/${id}`, request);
    return response.data;
};

export const deletePerson = async (id: string): Promise<void> => {
    await api.delete(`/persons/${id}`);
};

export const getUnlinkedUsers = async (orgId: string): Promise<any[]> => {
    const response = await api.get(`/persons/unlinked-users/${orgId}`);
    return response.data;
};

export const linkPersonToUser = async (personId: string, userId: string): Promise<PersonResponseDTO> => {
    const response = await api.post(`/persons/${personId}/link-user/${userId}`);
    return response.data;
};
