export enum SeasonLevel {
    INTERNATIONAL = 'INTERNATIONAL',
    NATIONAL = 'NATIONAL',
    STATE = 'STATE',
    DISTRICT = 'DISTRICT',
    CLUB = 'CLUB',
    SCHOOL = 'SCHOOL',
}

export enum SeasonStatus {
    PLANNED = 'PLANNED',
    ACTIVE = 'ACTIVE',
    COMPLETED = 'COMPLETED',
    ARCHIVED = 'ARCHIVED',
}

export interface Season {
    id: string;
    name: string;
    code: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    level: SeasonLevel;
    status: SeasonStatus;
    organiser?: {
        id: string;
        name: string;
    };
    createdAt: string;
    updatedAt: string;
}

export interface SeasonOverview {
    id: string;
    name: string;
    code: string;
    level: SeasonLevel;
    status: SeasonStatus;
    startDate?: string;
    endDate?: string;
    totalTournaments: number;
    totalMatches: number;
    completedMatches: number;
    totalTeams: number;
    totalPlayers: number;
}

export interface SeasonCreateRequest {
    name: string;
    code: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    level: SeasonLevel;
    status?: SeasonStatus;
    organiser?: {
        id: string;
    };
}

export interface SeasonUpdateRequest {
    name?: string;
    code?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    level?: SeasonLevel;
    organiser?: {
        id: string;
    };
}
