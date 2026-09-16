import api from './axios';

/** Machine-generated stand-in addresses use this domain; they are never deliverable. */
export const PLACEHOLDER_EMAIL_DOMAIN = '@placeholder.invalid';

/** True when the stored address is a generated placeholder rather than a real contact. */
export const isPlaceholderEmail = (email?: string | null): boolean =>
    !!email && email.trim().toLowerCase().endsWith(PLACEHOLDER_EMAIL_DOMAIN);

export const RECORD_VERIFICATION_METHODS = [
    { value: 'PRE_REGISTRATION_RECORD', label: 'Pre-registration record' },
    { value: 'DOCUMENT_SIGHTED', label: 'Document sighted' }
] as const;

export type RecordVerificationMethod = typeof RECORD_VERIFICATION_METHODS[number]['value'];

export interface RecordVerificationSummary {
    status: 'VERIFIED' | 'UNVERIFIED';
    verifiedAt?: string | null;
    verifiedByName?: string | null;
    method?: RecordVerificationMethod | string | null;
}

export interface RecordVerificationRequest {
    method: RecordVerificationMethod;
    attested: boolean;
}

export interface PersonResponseDTO {
    id: string;
    registrationNo?: string | null;
    firstName: string;
    lastName: string;
    recordVerification?: RecordVerificationSummary | null;
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
    dob: string;
    gender: string;
    nationality: string;
    email?: string;
    phone: string;
    nationalPlayerStatus: string;
    confirmPossibleDuplicate?: boolean;
}

export interface CreatePersonRequest {
    firstName: string;
    lastName: string;
    dob: string;
    gender: string;
    nationality: string;
    email: string;
    phone?: string;
    nationalPlayerStatus: string;
    confirmPossibleDuplicate?: boolean;
}

export const getAllPersons = async (
    page: number = 0,
    size: number = 50,
    search?: string,
    missingEmail?: boolean
): Promise<PaginatedResponse<PersonResponseDTO>> => {
    const response = await api.get(`/persons`, {
        params: { page, size, ...(search ? { search } : {}), ...(missingEmail ? { missingEmail } : {}) }
    });
    return response.data;
};

export const getPersonsByOrganisation = async (
    orgId: string,
    page: number = 0,
    size: number = 50,
    search?: string,
    missingEmail?: boolean
): Promise<PaginatedResponse<PersonResponseDTO>> => {
    const response = await api.get(`/persons/organisation/${orgId}`, {
        params: { page, size, ...(search ? { search } : {}), ...(missingEmail ? { missingEmail } : {}) }
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

export const verifyPersonRecord = async (
    personId: string,
    request: RecordVerificationRequest
): Promise<PersonResponseDTO> => {
    const response = await api.post(`/persons/${personId}/record-verification`, request);
    return response.data;
};

export const revokePersonRecordVerification = async (
    personId: string
): Promise<PersonResponseDTO> => {
    const response = await api.delete(`/persons/${personId}/record-verification`);
    return response.data;
};
