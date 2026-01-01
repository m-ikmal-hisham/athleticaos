// ============================================
// Authentication Types
// ============================================

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    roles: string[];
    organisationId?: string;
    organisationName?: string;
    active: boolean;
    isActive?: boolean; // Backend returns isActive
    status?: string;
    createdAt?: string;
    updatedAt?: string;
    // Address fields
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    postcode?: string;
    state?: string;
    country?: string;
    stateCode?: string;
    countryCode?: string;
    address?: string; // Legacy
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    roles: string[];
    organisationId?: string;
}

export interface AuthResponse {
    token: string;
    user: User;
}

// ============================================
// Organisation Types
// ============================================

export enum OrgType {
    UNION = 'UNION',
    CLUB = 'CLUB',
    SCHOOL = 'SCHOOL',
    DISTRICT = 'DISTRICT',
}

export interface Organisation {
    id: string;
    name: string;
    orgType: OrgType;
    parentOrgId?: string;
    primaryColor?: string;
    secondaryColor?: string;
    logoUrl?: string;
    createdAt: string;
    updatedAt: string;
}

export interface OrganisationCreateRequest {
    name: string;
    orgType: OrgType;
    parentOrgId?: string;
    primaryColor?: string;
    secondaryColor?: string;
    logoUrl?: string;
}

// ============================================
// Team Types
// ============================================

export enum TeamCategory {
    MEN = 'MEN',
    WOMEN = 'WOMEN',
    MIXED = 'MIXED',
}

export enum AgeGroup {
    U12 = 'U12',
    U15 = 'U15',
    U18 = 'U18',
    U20 = 'U20',
    SENIOR = 'SENIOR',
}

export interface Team {
    id: string;
    organisationId: string;
    organisationName?: string;
    slug?: string;
    name: string;
    category: string;
    ageGroup: string;
    division?: string;
    state?: string;
    status: string;
    // Tournament context fields (optional)
    poolNumber?: string;
    tournamentCategoryId?: string;
}

export interface TeamCreateRequest {
    organisationId: string;
    name: string;
    category: TeamCategory;
    ageGroup: AgeGroup;
}

// ============================================
// Player Types
// ============================================

export enum Gender {
    MALE = 'MALE',
    FEMALE = 'FEMALE',
    OTHER = 'OTHER',
}

export enum DominantSide {
    LEFT = 'LEFT',
    RIGHT = 'RIGHT',
    BOTH = 'BOTH',
}

export interface Player {
    id: string;
    personId: string;
    slug?: string;
    // Person (PII) fields
    firstName: string;
    lastName: string;
    gender: Gender;
    dob: string;
    icOrPassport: string; // Now included in response
    identificationType?: string;
    identificationValue?: string;
    nationality: string;
    email?: string;
    phone?: string;
    // Structured Address
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    postcode?: string;
    state?: string;
    country?: string;
    address?: string; // Legacy
    // Player (Rugby-specific) fields
    status: string; // ACTIVE, INACTIVE, BANNED
    dominantHand?: DominantSide;
    dominantLeg?: DominantSide;
    heightCm?: number;
    weightKg?: number;
    organisationId?: string;
    organisationName?: string;
    teamNames?: string[];
    createdAt: string;
}

export interface TeamPlayer {
    playerId: string;
    firstName: string;
    lastName: string;
    email: string;
    jerseyNumber?: number;
    position?: string;
    status: string;
    joinedDate: string;
    isActive: boolean;
}

export interface PlayerCreateRequest {
    // Person (PII) fields - required
    firstName: string;
    lastName: string;
    gender: Gender;
    dob: string;
    icOrPassport: string;
    identificationType?: string;
    identificationValue?: string;
    nationality: string;
    email: string;
    phone?: string;
    address?: string;
    // Player (Rugby-specific) fields - optional
    status?: string;
    dominantHand?: DominantSide;
    dominantLeg?: DominantSide;
    heightCm?: number;
    weightKg?: number;
}

export interface PlayerUpdateRequest {
    // Person (PII) fields - all optional for updates
    firstName?: string;
    lastName?: string;
    gender?: string;
    dob?: string;
    icOrPassport?: string;
    identificationType?: string;
    identificationValue?: string;
    nationality?: string;
    email?: string;
    phone?: string;
    address?: string;
    // Player (Rugby-specific) fields - all optional
    status?: string;
    dominantHand?: string;
    dominantLeg?: string;
    heightCm?: number;
    weightKg?: number;
}

// ============================================
// Tournament Types
// ============================================

export enum TournamentLevel {
    NATIONAL = 'NATIONAL',
    STATE = 'STATE',
    DISTRICT = 'DISTRICT',
    SCHOOL = 'SCHOOL',
    CLUB = 'CLUB',
}

export enum TournamentStatus {
    DRAFT = 'Draft',
    UPCOMING = 'Upcoming', // Mapped from PUBLISHED
    ONGOING = 'Ongoing',   // Mapped from LIVE
    COMPLETED = 'Completed',
    CANCELLED = 'Cancelled',
}

export interface Tournament {
    id: string;
    slug?: string;
    organiserOrgId: string;
    name: string;
    level: TournamentLevel;
    startDate: string;
    endDate: string;
    venue: string;
    status: TournamentStatus;
    createdAt: string;
    updatedAt: string;
    seasonId?: string;
    seasonName?: string;
    competitionType?: string;
    isAgeGrade?: boolean;
    ageGroupLabel?: string;
    categories?: TournamentCategory[];
    logoUrl?: string;
    livestreamUrl?: string;
    organiserBranding?: {
        id: string;
        name: string;
        logoUrl?: string;
    };
}

export interface TournamentCategory {
    id: string;
    tournamentId: string;
    name: string;
    description?: string;
    gender?: string;
    minAge?: number;
    maxAge?: number;
}

export interface CreateCategoryRequest {
    name: string;
    description?: string;
    gender?: string;
    minAge?: number;
    maxAge?: number;
}

export interface TournamentCreateRequest {
    organiserOrgId: string;
    name: string;
    level: TournamentLevel;
    startDate: string;
    endDate: string;
    venue: string;
    categories?: CreateCategoryRequest[];
    logoUrl?: string;
    livestreamUrl?: string;
}

export interface TournamentStatsSummary {
    totalMatches: number;
    completedMatches: number;
    totalTeams: number;
    totalPlayers: number;
    totalGoals: number;
}

export interface TournamentDashboardResponse {
    id: string;
    name: string;
    level: TournamentLevel;
    competitionType: string;
    ageGrade: boolean;
    ageGroupLabel?: string;
    startDate: string;
    endDate: string;
    venue: string;
    totalMatches: number;
    completedMatches: number;
    totalTeams: number;
    totalPlayers: number;
    status: TournamentStatus;
    stats: TournamentStatsSummary;
    seasonName?: string;
    categories?: TournamentCategory[];
}

export interface TournamentFormatConfig {
    id?: string;
    tournamentId?: string;
    formatType: string;
    rugbyFormat: 'XV' | 'SEVENS' | 'TENS' | 'TOUCH';
    teamCount: number;
    poolCount?: number;
    matchDurationMinutes: number;
    pointsWin?: number;
    pointsDraw?: number;
    pointsLoss?: number;
    pointsBonusTry?: number;
    pointsBonusLoss?: number;
    startersCount: number;
    maxBenchCount: number;
}

// ============================================
// Match Types
// ============================================

export interface MatchStage {
    id: string; // Changed from enum to object/interface if needed, but keeping simple for now. Actually backend returns object.
    name: string;
    stageType: string;
}

export enum MatchStatus {
    SCHEDULED = 'SCHEDULED',
    LIVE = 'LIVE',
    COMPLETED = 'COMPLETED',
    POSTPONED = 'POSTPONED',
    CANCELLED = 'CANCELLED',
}

export interface Match {
    id: string;
    tournamentId: string;
    homeTeamId: string;
    homeTeam?: { id: string, name: string }; // Optional populated team
    awayTeamId: string;
    awayTeam?: { id: string, name: string }; // Optional populated team
    matchDate: string;
    kickOffTime: string; // Added
    venue?: string; // Changed from location to venue to match backend
    location?: string; // Keep for backward compat if needed
    pitch?: string;
    matchCode?: string;
    stage?: MatchStage; // Changed from enum
    phase?: string;
    status: MatchStatus;
    homeScore?: number;
    awayScore?: number;
    createdAt: string;
    updatedAt: string;
}

export interface MatchCreateRequest {
    tournamentId: string;
    homeTeamId: string;
    awayTeamId: string;
    matchDate: string;
    kickOffTime: string;
    venue?: string;
    pitch?: string;
    matchCode?: string;
    phase?: string;
    status?: MatchStatus;
}

export interface MatchResponse extends Match {
    homeTeamName?: string;
    awayTeamName?: string;
}

export interface TournamentStageResponse {
    id: string;
    tournamentId: string;
    name: string;
    stageType: string;
    displayOrder: number;
    groupStage: boolean;
    knockoutStage: boolean;
}

export interface TournamentStageBracket {
    stage: TournamentStageResponse;
    matches: MatchResponse[];
}

export interface BracketViewResponse {
    tournament: Tournament;
    stages: TournamentStageBracket[];
}

export interface Standings {
    poolName: string;
    teamId: string;
    teamName: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    pointsFor: number;
    pointsAgainst: number;
    pointsDiff: number;
    points: number;
}

export type StandingsResponse = Standings;

// ============================================
// API Response Types
// ============================================

export interface ApiError {
    message: string;
    details?: string;
    status: number;
    timestamp: string;
}

export interface PaginatedResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
}

export enum LineupRole {
    STARTER = 'STARTER',
    BENCH = 'BENCH',
    RESERVE = 'RESERVE',
    NOT_SELECTED = 'NOT_SELECTED'
}

export interface MatchLineupEntry {
    playerId: string;
    playerName: string;
    jerseyNumber?: number;
    isCaptain: boolean;
    role: LineupRole;
    orderIndex?: number;
    isStarter?: boolean;
    positionDisplay?: string;
}
