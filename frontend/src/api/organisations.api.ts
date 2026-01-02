import api from "./axios";

export type OrganisationLevel = 'COUNTRY' | 'STATE' | 'DIVISION' | 'DISTRICT' | 'CLUB' | 'SCHOOL';

export interface Organisation {
    id: string;
    name: string;
    slug?: string;
    type: string;
    orgLevel: OrganisationLevel;
    parentOrgId?: string | null;
    parentOrganisationName?: string;
    primaryColor?: string;
    secondaryColor?: string;
    tertiaryColor?: string;
    quaternaryColor?: string;
    logoUrl?: string;
    accentColor?: string;
    coverImageUrl?: string;
    state?: string; // Legacy/Display state name
    status?: string;
    // Address Fields
    addressLine1?: string;
    addressLine2?: string;
    postcode?: string;
    city?: string;
    stateCode?: string;
    countryCode?: string;
}

export interface OrganisationTreeNode extends Organisation {
    children?: OrganisationTreeNode[];
}

export interface OrganisationCreateRequest {
    name: string;
    orgType: string;
    orgLevel?: OrganisationLevel;
    parentOrgId?: string;
    primaryColor?: string;
    secondaryColor?: string;
    tertiaryColor?: string;
    quaternaryColor?: string;
    logoUrl?: string;
    accentColor?: string;
    coverImageUrl?: string;
}

export interface OrganisationUpdateRequest {
    name?: string;
    state?: string;
    status?: string;
    orgLevel?: OrganisationLevel;
    primaryColor?: string;
    secondaryColor?: string;
    tertiaryColor?: string;
    quaternaryColor?: string;
    logoUrl?: string;
    accentColor?: string;
    coverImageUrl?: string;
}

export const fetchOrganisations = () => api.get<Organisation[]>("/organisations").then(res => res.data);

export const getOrganisationById = (id: string) => api.get<Organisation>(`/organisations/${id}`).then(res => res.data);

export const createOrganisation = (data: OrganisationCreateRequest) => api.post<Organisation>("/organisations", data).then(res => res.data);

export const updateOrganisation = (id: string, data: OrganisationUpdateRequest) => api.put<Organisation>(`/organisations/${id}`, data).then(res => res.data);

export const deleteOrganisation = (id: string) => api.delete(`/organisations/${id}`).then(res => res.data);

// Hierarchy endpoints
export const getCountries = () => api.get<Organisation[]>("/organisations/hierarchy/countries").then(res => res.data);
export const getStates = (countryId: string) => api.get<Organisation[]>(`/organisations/hierarchy/states?countryId=${countryId}`).then(res => res.data);
export const getDivisions = (stateId: string) => api.get<Organisation[]>(`/organisations/hierarchy/divisions?stateId=${stateId}`).then(res => res.data);
export const getDistricts = (stateId: string) => api.get<Organisation[]>(`/organisations/hierarchy/districts?stateId=${stateId}`).then(res => res.data);
export const getChildren = (parentId: string) => api.get<Organisation[]>(`/organisations/hierarchy/children?parentId=${parentId}`).then(res => res.data);
export const getOrganisationTree = (countryId: string) => api.get<OrganisationTreeNode>(`/organisations/hierarchy/tree/${countryId}`).then(res => res.data);
