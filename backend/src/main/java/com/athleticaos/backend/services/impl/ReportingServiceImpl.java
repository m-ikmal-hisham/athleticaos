package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.reporting.CompetitionHealthSummary;
import com.athleticaos.backend.dtos.reporting.ComplianceIssue;
import com.athleticaos.backend.dtos.reporting.DisciplineSummary;
import com.athleticaos.backend.entities.Match;
import com.athleticaos.backend.entities.MatchEvent;
import com.athleticaos.backend.entities.Tournament;
import com.athleticaos.backend.enums.MatchEventType;
import com.athleticaos.backend.enums.MatchStatus;
import com.athleticaos.backend.repositories.MatchEventRepository;
import com.athleticaos.backend.repositories.MatchRepository;
import com.athleticaos.backend.repositories.TournamentRepository;
import com.athleticaos.backend.services.ReportingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportingServiceImpl implements ReportingService {

    private final TournamentRepository tournamentRepository;
    private final MatchRepository matchRepository;
    private final MatchEventRepository matchEventRepository;

    @Override
    @Transactional(readOnly = true)
    public List<CompetitionHealthSummary> getSeasonHealthSummary(UUID seasonId) {
        // Find all tournaments in the season
        List<Tournament> tournaments = tournamentRepository.findBySeasonId(seasonId);
        return tournaments.stream()
                .map(this::calculateHealth)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<CompetitionHealthSummary> getActiveTournamentsHealth() {
        // Find tournaments that are currently running (simple logic for now: started
        // but not ended + published)
        // Or simply all published tournaments for filtering on FE
        List<Tournament> tournaments = tournamentRepository.findByIsPublishedTrue();
        return tournaments.stream()
                .filter(t -> t.getDeleted() == Boolean.FALSE)
                .map(this::calculateHealth)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ComplianceIssue> getComplianceIssuesForTournament(UUID tournamentId) {
        List<ComplianceIssue> issues = new ArrayList<>();
        Tournament tournament = tournamentRepository.findById(Objects.requireNonNull(tournamentId)).orElse(null);
        if (tournament == null)
            return issues;

        List<Match> matches = matchRepository.findByTournamentId(tournamentId);

        for (Match match : matches) {
            // Check 1: Match Completed but No Score (if status is COMPLETED but scores are
            // null)
            // Or Match Date passed but status still SCHEDULED
            if (match.getMatchDate() != null && match.getMatchDate().isBefore(LocalDate.now())) {
                boolean isCompleted = match.getStatus() == MatchStatus.COMPLETED;
                if (!isCompleted && match.getStatus() != MatchStatus.CANCELLED) {
                    issues.add(ComplianceIssue.builder()
                            .issueType("MISSING_RESULT")
                            .severity("HIGH")
                            .description("Match date has passed but status is not COMPLETED.")
                            .tournamentName(tournament.getName())
                            .matchDetails(getMatchLabel(match))
                            .referenceId(match.getId().toString())
                            .build());
                }
            }

            // Check 2: Unassigned Officials (if required)
            // Implementation depends on Official Assignments data access, skipped for basic
            // example
        }

        return issues;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ComplianceIssue> getAllComplianceIssues() {
        List<ComplianceIssue> allIssues = new ArrayList<>();
        // In a real scenario, we would paginate or scope this to the admin's org tree.
        // For now, let's just grab top 5 active tournaments to avoid massive query.
        List<Tournament> activeTournaments = tournamentRepository.findByIsPublishedTrue();
        for (Tournament t : activeTournaments) {
            allIssues.addAll(getComplianceIssuesForTournament(t.getId()));
        }
        return allIssues;
    }

    @Override
    @Transactional(readOnly = true)
    public List<DisciplineSummary> getDisciplineSummary(UUID tournamentId) {
        List<MatchEvent> events = matchEventRepository
                .findByMatch_Tournament_Id(tournamentId);

        // Map for Team Names
        java.util.Map<UUID, String> teamNames = new java.util.HashMap<>();

        // Re-approach: Loop and aggregate into a Map of Counts
        java.util.Map<UUID, int[]> counts = new java.util.HashMap<>(); // [yellow, red, total]

        for (MatchEvent event : events) {
            if (event.getTeam() == null)
                continue;
            UUID teamId = event.getTeam().getId();
            teamNames.putIfAbsent(teamId, event.getTeam().getName());
            counts.putIfAbsent(teamId, new int[] { 0, 0, 0 });

            int[] stats = counts.get(teamId);

            if (event.getEventType() == MatchEventType.YELLOW_CARD) {
                stats[0]++;
                stats[2]++;
            } else if (event.getEventType() == MatchEventType.RED_CARD) {
                stats[1]++;
                stats[2]++;
            }
        }

        return counts.entrySet().stream()
                .map(entry -> DisciplineSummary.builder()
                        .teamId(entry.getKey().toString())
                        .teamName(teamNames.get(entry.getKey()))
                        .yellowCards(entry.getValue()[0])
                        .redCards(entry.getValue()[1])
                        .totalInfractions(entry.getValue()[2])
                        .build())
                .sorted((a, b) -> Integer.compare(b.getTotalInfractions(), a.getTotalInfractions()))
                .collect(Collectors.toList());
    }

    private CompetitionHealthSummary calculateHealth(Tournament t) {
        List<Match> matches = matchRepository.findByTournamentId(t.getId())
                .stream().filter(m -> !m.isDeleted()).collect(Collectors.toList());

        int total = matches.size();
        int completed = (int) matches.stream().filter(m -> m.getStatus() == MatchStatus.COMPLETED).count();
        int pending = (int) matches.stream().filter(m -> m.getStatus() == MatchStatus.SCHEDULED).count();

        // Overdue: Scheduled in past but still SCHEDULED
        int overdue = (int) matches.stream().filter(m -> m.getStatus() == MatchStatus.SCHEDULED &&
                m.getMatchDate() != null &&
                m.getMatchDate().isBefore(LocalDate.now())).count();

        double rate = total > 0 ? (double) completed / total * 100 : 0;

        // Issue count from compliance check (could apply light version here)
        int issues = overdue; // Simple proxy for now

        return CompetitionHealthSummary.builder()
                .tournamentId(t.getId().toString())
                .tournamentName(t.getName())
                .totalMatches(total)
                .completedMatches(completed)
                .pendingMatches(pending)
                .overdueMatches(overdue)
                .completionRate(rate)
                .activeTeams(0) // Need logic to count distinct teams in roster/matches
                .issueCount(issues)
                .build();
    }

    private String getMatchLabel(Match m) {
        String home = m.getHomeTeam() != null ? m.getHomeTeam().getName() : "TBD";
        String away = m.getAwayTeam() != null ? m.getAwayTeam().getName() : "TBD";
        return home + " vs " + away;
    }
}
