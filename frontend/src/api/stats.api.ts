import api from "./axios";

export const fetchTournamentSummary = (tournamentId: string) =>
  api.get(`/stats/tournaments/${tournamentId}/summary`);

export const fetchTournamentPlayerStats = (tournamentId: string) =>
  api.get(`/stats/tournaments/${tournamentId}/players`);

export const fetchTournamentTeamStats = (tournamentId: string) =>
  api.get(`/stats/tournaments/${tournamentId}/teams`);

export const fetchTournamentLeaderboard = (tournamentId: string) =>
  api.get(`/stats/tournaments/${tournamentId}/leaderboard`);
