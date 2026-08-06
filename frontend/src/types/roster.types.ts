export interface TournamentPlayerDTO {
    id: string;
    playerId: string;
    playerName: string;
    /** The number in effect, whichever layer supplied it. */
    playerNumber?: string;
    /** Set only when this tournament overrides the club number; absent means inherited. */
    tournamentJerseyNumber?: number;
    /** The player's club-level default, so the UI can show what is being inherited. */
    teamJerseyNumber?: number;
    organisationName: string;
    isEligible: boolean;
    eligibilityNote?: string;
    hasActiveSuspension: boolean;
    suspensionReason?: string;
    suspensionMatchesRemaining?: number;
    position?: string;
}

export interface PlayerSuspensionDTO {
    id: string;
    tournamentId: string;
    tournamentName: string;
    teamId: string;
    teamName: string;
    playerId: string;
    playerName: string;
    matchId?: string;
    matchLabel?: string;
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
    position?: string;
}

export interface LineupHintsDTO {
    homeTeamPlayers: LineupPlayerDTO[];
    awayTeamPlayers: LineupPlayerDTO[];
}

export interface AddPlayersToRosterRequest {
    playerIds: string[];
    /** Optional tournament jersey number per player id; omitted players inherit their club number. */
    jerseyNumbers?: Record<string, number>;
}
