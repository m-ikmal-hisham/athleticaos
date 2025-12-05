import api from "./axios";

export const fetchTournamentSummary = (tournamentId: string) =>
  api.get(`/stats/tournaments/${tournamentId}/summary`);

export const fetchTournamentPlayerStats = (tournamentId: string) =>
  api.get(`/stats/tournaments/${tournamentId}/players`);

export const fetchTournamentTeamStats = (tournamentId: string) =>
  api.get(`/stats/tournaments/${tournamentId}/teams`);

export const fetchTournamentLeaderboard = (tournamentId: string) =>
  api.get(`/stats/tournaments/${tournamentId}/leaderboard`);

export const fetchPlayerStats = (playerId: string) =>
  api.get(`/stats/players/${playerId}`);

export const fetchTeamStats = (teamId: string) =>
  api.get(`/stats/teams/${teamId}`);
