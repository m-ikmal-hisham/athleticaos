import api from './axios';

export const assignPlayerToTeam = (payload: {
    playerId: string;
    teamId: string;
    jerseyNumber?: number;
    position?: string;
}) => api.post('/player-teams', payload);

export const removePlayerFromTeam = (playerId: string, teamId: string) =>
    api.delete('/player-teams', { params: { playerId, teamId } });

export const removePlayersFromTeam = (playerIds: string[], teamId: string) =>
    api.delete('/player-teams/batch', { params: { playerIds: playerIds.join(','), teamId } });

/** A team's roster; with a tournamentId, only the players in its squad for that tournament. */
export const fetchTeamRoster = (teamId: string, tournamentId?: string) =>
    api.get(`/player-teams/team/${teamId}/roster`, { params: tournamentId ? { tournamentId } : undefined });

export const fetchPlayerTeams = (playerId: string) =>
    api.get(`/player-teams/player/${playerId}/teams`);
