import api from './axios';

export const assignPlayerToTeam = (payload: {
    playerId: string;
    teamId: string;
    jerseyNumber?: number;
    position?: string;
}) => api.post('/player-teams', payload);

export const removePlayerFromTeam = (playerId: string, teamId: string) =>
    api.delete('/player-teams', { params: { playerId, teamId } });

export const fetchTeamRoster = (teamId: string) =>
    api.get(`/player-teams/team/${teamId}/roster`);

export const fetchPlayerTeams = (playerId: string) =>
    api.get(`/player-teams/player/${playerId}/teams`);
