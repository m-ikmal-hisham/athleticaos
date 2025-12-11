package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.Match;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MatchRepository extends JpaRepository<Match, UUID> {
        List<Match> findByTournamentId(UUID tournamentId);

        @org.springframework.data.jpa.repository.Query("SELECT m FROM Match m " +
                        "LEFT JOIN FETCH m.homeTeam " +
                        "LEFT JOIN FETCH m.awayTeam " +
                        "LEFT JOIN FETCH m.stage " +
                        "WHERE m.tournament.id = :tournamentId")
        List<Match> findByTournamentIdWithTeams(
                        @org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId);

        List<Match> findByStageId(UUID stageId);

        // Find matches where the team is either home or away
        List<Match> findByHomeTeamIdOrAwayTeamId(UUID homeTeamId, UUID awayTeamId);

        List<Match> findByTournamentIdAndStatus(UUID tournamentId, com.athleticaos.backend.enums.MatchStatus status);

        List<Match> findByStatus(com.athleticaos.backend.enums.MatchStatus status);

        long countByStatus(com.athleticaos.backend.enums.MatchStatus status);

        @org.springframework.data.jpa.repository.Query("SELECT m FROM Match m WHERE m.homeTeam.organisation.id IN :orgIds OR m.awayTeam.organisation.id IN :orgIds OR m.tournament.organiserOrg.id IN :orgIds")
        List<Match> findMatchesByOrganisationIds(
                        @org.springframework.data.repository.query.Param("orgIds") java.util.Set<UUID> orgIds);

        java.util.Optional<Match> findByMatchCode(String matchCode);

        void deleteByTournamentId(UUID tournamentId);
}
