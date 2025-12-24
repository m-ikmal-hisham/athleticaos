export interface TournamentPlayerDTO {
    id: string;
    playerId: string;
    playerName: string;
    playerNumber?: string;
    organisationName: string;
    isEligible: boolean;
    eligibilityNote?: string;
    hasActiveSuspension: boolean;
    suspensionReason?: string;
    suspensionMatchesRemaining?: number;
}

export interface PlayerSuspensionDTO {
    id: string;
    tournamentId: string;
    tournamentName: string;
    teamId: string;
    teamName: string;
    playerId: string;
    playerName: string;
    reason: string;
    matchesRemaining: number;
    isActive: boolean;
    createdAt: string;
}

export interface LineupPlayerDTO {
    playerId: string;
    playerName: string;
    playerNumber?: string;
    isEligible: boolean;
    eligibilityNote?: string;
    isSuspended: boolean;
    suspensionReason?: string;
    suspensionMatchesRemaining?: number;
}

export interface LineupHintsDTO {
    homeTeamPlayers: LineupPlayerDTO[];
    awayTeamPlayers: LineupPlayerDTO[];
}

export interface AddPlayersToRosterRequest {
    playerIds: string[];
}
