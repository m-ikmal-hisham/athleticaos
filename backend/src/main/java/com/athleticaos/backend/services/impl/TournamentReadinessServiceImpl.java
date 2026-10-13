package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.tournament.TournamentReadinessIssue;
import com.athleticaos.backend.dtos.tournament.TournamentReadinessResponse;
import com.athleticaos.backend.entities.*;
import com.athleticaos.backend.repositories.*;
import com.athleticaos.backend.services.TournamentReadinessService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class TournamentReadinessServiceImpl implements TournamentReadinessService {

    private final TournamentRepository tournamentRepository;
    private final TournamentStageRepository stageRepository;
    private final MatchRepository matchRepository;
    private final TournamentTeamRepository tournamentTeamRepository;
    private final TournamentPlayerRepository tournamentPlayerRepository;

    @Override
    @Transactional(readOnly = true)
    public TournamentReadinessResponse checkReadiness(UUID tournamentId) {
        Tournament tournament = tournamentRepository.findById(tournamentId)
                .filter(t -> !Boolean.TRUE.equals(t.getDeleted()))
                .orElseThrow(() -> new EntityNotFoundException("Tournament not found"));

        List<TournamentStage> stages = stageRepository.findByTournamentIdOrderByDisplayOrderAsc(tournamentId);
        List<Match> allMatches = matchRepository.findByTournamentId(tournamentId).stream()
                .filter(m -> !m.isDeleted())
                .toList();
        List<TournamentTeam> tournamentTeams = tournamentTeamRepository.findByTournamentId(tournamentId);

        List<TournamentReadinessIssue> issues = new ArrayList<>();

        boolean tournamentHasCategories = tournament.getCategories() != null && !tournament.getCategories().isEmpty();

        // 1. STAGE_WITHOUT_CATEGORY (ERROR): tournament has categories and a stage has none
        if (tournamentHasCategories) {
            for (TournamentStage stage : stages) {
                if (stage.getCategory() == null) {
                    issues.add(TournamentReadinessIssue.builder()
                            .severity("ERROR")
                            .code("STAGE_WITHOUT_CATEGORY")
                            .message("Stage '" + stage.getName() + "' is not assigned to a category.")
                            .stageId(stage.getId())
                            .stageName(stage.getName())
                            .build());
                }
            }
        }

        // Precompute category pools, pool sizes, and valid placeholders
        Map<UUID, Set<String>> validPlaceholdersByCategory = new HashMap<>();
        List<UUID> categoryIdsToCheck = new ArrayList<>();
        if (tournamentHasCategories) {
            for (TournamentCategory cat : tournament.getCategories()) {
                categoryIdsToCheck.add(cat.getId());
            }
        } else {
            categoryIdsToCheck.add(null);
        }

        for (UUID catId : categoryIdsToCheck) {
            List<TournamentStage> poolStages = stages.stream()
                    .filter(s -> Boolean.TRUE.equals(s.getIsGroupStage()) || s.getStageType() == com.athleticaos.backend.enums.TournamentStageType.POOL)
                    .filter(s -> catId == null ? s.getCategory() == null : (s.getCategory() != null && catId.equals(s.getCategory().getId())))
                    .toList();

            Set<String> validPlaceholders = new HashSet<>();
            int totalTeamsInCat = 0;

            for (TournamentStage pool : poolStages) {
                Set<UUID> poolTeamIds = new HashSet<>();
                for (TournamentTeam tt : tournamentTeams) {
                    if (tt.isActive() && tt.getTeam() != null && Objects.equals(tt.getPoolNumber(), pool.getName())) {
                        poolTeamIds.add(tt.getTeam().getId());
                    }
                }
                for (Match m : allMatches) {
                    if (m.getStage() != null && pool.getId().equals(m.getStage().getId())) {
                        if (m.getHomeTeam() != null) poolTeamIds.add(m.getHomeTeam().getId());
                        if (m.getAwayTeam() != null) poolTeamIds.add(m.getAwayTeam().getId());
                    }
                }

                int poolSize = poolTeamIds.size();
                totalTeamsInCat += poolSize;

                for (int pos = 1; pos <= poolSize; pos++) {
                    for (String label : BracketServiceImpl.generatePoolPositionLabels(pool.getName(), pos)) {
                        String norm = BracketServiceImpl.normalizePlaceholder(label);
                        if (norm != null) {
                            validPlaceholders.add(norm);
                        }
                    }
                }
            }

            for (int s = 1; s <= totalTeamsInCat; s++) {
                validPlaceholders.add("seed " + s);
                validPlaceholders.add("seed" + s);
            }

            validPlaceholdersByCategory.put(catId, validPlaceholders);
        }

        // 2. SLOT_WILL_NOT_SEED (ERROR) and 3. SLOT_EMPTY (ERROR)
        List<Match> knockoutMatches = allMatches.stream()
                .filter(m -> m.getStage() != null && (Boolean.TRUE.equals(m.getStage().getIsKnockoutStage()) || (m.getStage().getStageType() != null && m.getStage().getStageType() != com.athleticaos.backend.enums.TournamentStageType.POOL)))
                .toList();

        for (Match match : knockoutMatches) {
            UUID catId = null;
            if (match.getStage() != null && match.getStage().getCategory() != null) {
                catId = match.getStage().getCategory().getId();
            } else if (match.getCategory() != null) {
                catId = match.getCategory().getId();
            }
            Set<String> validPlaceholders = validPlaceholdersByCategory.getOrDefault(catId, Collections.emptySet());

            // HOME side
            checkKnockoutSlot(match, "HOME", match.getHomeTeam(), match.getHomeTeamPlaceholder(),
                    allMatches, validPlaceholders, issues);

            // AWAY side
            checkKnockoutSlot(match, "AWAY", match.getAwayTeam(), match.getAwayTeamPlaceholder(),
                    allMatches, validPlaceholders, issues);
        }

        // 4. LOSER_WINNER_LINK_DUPLICATE (WARNING):
        // the same match result (winner or loser of match X) feeds more than one slot, or a slot is fed by a later-scheduled match.
        Map<String, List<Match>> targetSlotFeeders = new HashMap<>();
        for (Match feeder : allMatches) {
            if (feeder.getNextMatchIdForWinner() != null && feeder.getWinnerSlot() != null) {
                String key = feeder.getNextMatchIdForWinner() + ":" + feeder.getWinnerSlot().toUpperCase();
                targetSlotFeeders.computeIfAbsent(key, k -> new ArrayList<>()).add(feeder);
            }
            if (feeder.getNextMatchIdForLoser() != null && feeder.getLoserSlot() != null) {
                String key = feeder.getNextMatchIdForLoser() + ":" + feeder.getLoserSlot().toUpperCase();
                targetSlotFeeders.computeIfAbsent(key, k -> new ArrayList<>()).add(feeder);
            }
        }

        Map<UUID, Match> matchesById = new HashMap<>();
        for (Match m : allMatches) {
            matchesById.put(m.getId(), m);
        }

        Set<String> reportedDuplicateSlotKeys = new HashSet<>();
        for (Map.Entry<String, List<Match>> entry : targetSlotFeeders.entrySet()) {
            if (entry.getValue().size() > 1 && reportedDuplicateSlotKeys.add(entry.getKey())) {
                String[] parts = entry.getKey().split(":");
                UUID targetId = UUID.fromString(parts[0]);
                Match target = matchesById.get(targetId);
                issues.add(TournamentReadinessIssue.builder()
                        .severity("WARNING")
                        .code("LOSER_WINNER_LINK_DUPLICATE")
                        .message("Match " + (target != null ? target.getMatchNumber() : "?") + " "
                                + parts[1] + " slot is fed by multiple match results.")
                        .matchId(targetId)
                        .matchNumber(target != null ? target.getMatchNumber() : null)
                        .stageId(target != null && target.getStage() != null ? target.getStage().getId() : null)
                        .stageName(target != null && target.getStage() != null ? target.getStage().getName() : null)
                        .build());
            }
        }

        // Check if a slot is fed by a later-scheduled match
        for (Match feeder : allMatches) {
            checkFeederSchedule(feeder, feeder.getNextMatchIdForWinner(), matchesById, issues);
            checkFeederSchedule(feeder, feeder.getNextMatchIdForLoser(), matchesById, issues);
        }

        // 5. MATCH_WITHOUT_TIME (WARNING): match with no date or kick-off time
        for (Match m : allMatches) {
            if (m.getMatchDate() == null || m.getKickOffTime() == null) {
                issues.add(TournamentReadinessIssue.builder()
                        .severity("WARNING")
                        .code("MATCH_WITHOUT_TIME")
                        .message("Match " + m.getMatchNumber() + " has no scheduled date or kick-off time.")
                        .matchId(m.getId())
                        .matchNumber(m.getMatchNumber())
                        .stageId(m.getStage() != null ? m.getStage().getId() : null)
                        .stageName(m.getStage() != null ? m.getStage().getName() : null)
                        .build());
            }
        }

        // 6. MATCH_TIME_CLASH (WARNING): two matches at the same venue and time.
        // A pair is only reported one by one when both name the same pitch. Without a pitch the
        // organiser may well be using several, so those are counted into a single line instead of
        // one warning per pair (two pools starting together used to produce a wall of warnings).
        int pairsWithoutPitch = 0;
        String venueWithoutPitch = null;
        for (int i = 0; i < allMatches.size(); i++) {
            Match m1 = allMatches.get(i);
            if (!isOpenScheduled(m1)) continue;
            for (int j = i + 1; j < allMatches.size(); j++) {
                Match m2 = allMatches.get(j);
                if (!isOpenScheduled(m2)) continue;

                if (m1.getMatchDate().equals(m2.getMatchDate()) && m1.getKickOffTime().equals(m2.getKickOffTime())) {
                    UUID v1 = m1.getVenueId();
                    String vn1 = m1.getVenueName();
                    UUID v2 = m2.getVenueId();
                    String vn2 = m2.getVenueName();

                    boolean sameVenue = (v1 != null && v1.equals(v2))
                            || (vn1 != null && !vn1.isBlank() && vn1.equalsIgnoreCase(vn2))
                            || (vn1 == null && vn2 == null);

                    if (sameVenue) {
                        String p1 = m1.getPitch() != null ? m1.getPitch().trim() : "";
                        String p2 = m2.getPitch() != null ? m2.getPitch().trim() : "";
                        if (p1.isEmpty() && p2.isEmpty()) {
                            pairsWithoutPitch++;
                            if (venueWithoutPitch == null) {
                                venueWithoutPitch = vn1;
                            }
                        } else if (p1.equalsIgnoreCase(p2)) {
                            issues.add(TournamentReadinessIssue.builder()
                                    .severity("WARNING")
                                    .code("MATCH_TIME_CLASH")
                                    .message("Match " + m1.getMatchNumber() + " and Match " + m2.getMatchNumber()
                                            + " are on the same pitch (" + p1 + ") at the same time.")
                                    .matchId(m1.getId())
                                    .matchNumber(m1.getMatchNumber())
                                    .stageId(m1.getStage() != null ? m1.getStage().getId() : null)
                                    .stageName(m1.getStage() != null ? m1.getStage().getName() : null)
                                    .build());
                        }
                    }
                }
            }
        }
        if (pairsWithoutPitch > 0) {
            String where = venueWithoutPitch != null && !venueWithoutPitch.isBlank() ? " at " + venueWithoutPitch : "";
            issues.add(TournamentReadinessIssue.builder()
                    .severity("WARNING")
                    .code("MATCH_TIME_CLASH")
                    .message(pairsWithoutPitch + (pairsWithoutPitch == 1 ? " pair of matches shares" : " pairs of matches share")
                            + " a kick-off time" + where + " with no pitch set. Fine if you play on several pitches;"
                            + " otherwise stagger the times or set the pitch on each match.")
                    .build());
        }

        // 7. FORMAT_CONFIG_MISSING (WARNING): a category with matches but no format config
        if (tournamentHasCategories) {
            for (TournamentCategory cat : tournament.getCategories()) {
                boolean hasMatches = allMatches.stream().anyMatch(m -> {
                    TournamentCategory mc = m.getStage() != null && m.getStage().getCategory() != null
                            ? m.getStage().getCategory()
                            : m.getCategory();
                    return mc != null && cat.getId().equals(mc.getId());
                });

                if (hasMatches) {
                    boolean hasConfig = tournament.getFormatConfigs() != null && tournament.getFormatConfigs().stream()
                            .anyMatch(cfg -> cfg.getCategory() != null && cat.getId().equals(cfg.getCategory().getId()));
                    if (!hasConfig) {
                        issues.add(TournamentReadinessIssue.builder()
                                .severity("WARNING")
                                .code("FORMAT_CONFIG_MISSING")
                                .message("Category '" + cat.getName() + "' has matches but no format config (lineup limits fall back to XV).")
                                .build());
                    }
                }
            }
        } else {
            boolean hasMatches = !allMatches.isEmpty();
            boolean hasConfig = tournament.getFormatConfigs() != null && !tournament.getFormatConfigs().isEmpty();
            if (hasMatches && !hasConfig) {
                issues.add(TournamentReadinessIssue.builder()
                        .severity("WARNING")
                        .code("FORMAT_CONFIG_MISSING")
                        .message("Tournament has matches but no format config (lineup limits fall back to XV).")
                        .build());
            }
        }

        // 8. TEAM_WITHOUT_ROSTER (WARNING): a team in the tournament with no registered players
        for (TournamentTeam tt : tournamentTeams) {
            if (tt.isActive() && tt.getTeam() != null) {
                List<TournamentPlayer> players = tournamentPlayerRepository.findByTournamentIdAndTeamIdAndIsActiveTrue(
                        tournamentId, tt.getTeam().getId());
                if (players.isEmpty()) {
                    issues.add(TournamentReadinessIssue.builder()
                            .severity("WARNING")
                            .code("TEAM_WITHOUT_ROSTER")
                            .message("Team '" + tt.getTeam().getName() + "' has no registered players in this tournament.")
                            .build());
                }
            }
        }

        boolean ok = issues.stream().noneMatch(i -> "ERROR".equalsIgnoreCase(i.getSeverity()));

        return TournamentReadinessResponse.builder()
                .ok(ok)
                .issues(issues)
                .build();
    }

    private void checkKnockoutSlot(Match match, String side, Team team, String placeholder,
            List<Match> allMatches, Set<String> validPlaceholders, List<TournamentReadinessIssue> issues) {
        if (team != null) {
            return; // Filled with a team
        }
        if (BracketServiceImpl.isSlotFedByFeeder(allMatches, match.getId(), side)) {
            return; // Fed by incoming match
        }

        String sideLabel = "HOME".equalsIgnoreCase(side) ? "Home" : "Away";
        if (BracketServiceImpl.isUnsetPlaceholder(placeholder)) {
            issues.add(TournamentReadinessIssue.builder()
                    .severity("ERROR")
                    .code("SLOT_EMPTY")
                    .message("Match " + match.getMatchNumber() + " — " + sideLabel + " slot is not set yet. Choose a team,"
                            + " a group position, or the winner/loser of another match.")
                    .matchId(match.getId())
                    .matchNumber(match.getMatchNumber())
                    .stageId(match.getStage() != null ? match.getStage().getId() : null)
                    .stageName(match.getStage() != null ? match.getStage().getName() : null)
                    .build());
        } else {
            String norm = BracketServiceImpl.normalizePlaceholder(placeholder);
            if (!validPlaceholders.contains(norm)) {
                issues.add(TournamentReadinessIssue.builder()
                        .severity("ERROR")
                        .code("SLOT_WILL_NOT_SEED")
                        .message("Match " + match.getMatchNumber() + " — " + sideLabel + " slot says '" + placeholder.trim()
                                + "', which does not match any group position, so it will not fill in automatically.")
                        .matchId(match.getId())
                        .matchNumber(match.getMatchNumber())
                        .stageId(match.getStage() != null ? match.getStage().getId() : null)
                        .stageName(match.getStage() != null ? match.getStage().getName() : null)
                        .build());
            }
        }
    }

    /** Has a date and time and is still to be played (finished or cancelled matches cannot clash). */
    private static boolean isOpenScheduled(Match m) {
        if (m.getMatchDate() == null || m.getKickOffTime() == null || m.isDeleted()) {
            return false;
        }
        return m.getStatus() != com.athleticaos.backend.enums.MatchStatus.COMPLETED
                && m.getStatus() != com.athleticaos.backend.enums.MatchStatus.CANCELLED;
    }

    private void checkFeederSchedule(Match feeder, UUID targetMatchId, Map<UUID, Match> matchesById,
            List<TournamentReadinessIssue> issues) {
        if (targetMatchId == null) return;
        Match target = matchesById.get(targetMatchId);
        if (target == null) return;

        if (isScheduledLater(feeder, target)) {
            issues.add(TournamentReadinessIssue.builder()
                    .severity("WARNING")
                    .code("LOSER_WINNER_LINK_DUPLICATE")
                    .message("Match " + target.getMatchNumber() + " is fed by Match " + feeder.getMatchNumber() + " which is scheduled later.")
                    .matchId(target.getId())
                    .matchNumber(target.getMatchNumber())
                    .stageId(target.getStage() != null ? target.getStage().getId() : null)
                    .stageName(target.getStage() != null ? target.getStage().getName() : null)
                    .build());
        }
    }

    private boolean isScheduledLater(Match feeder, Match target) {
        if (feeder == null || target == null) return false;
        if (feeder.getMatchDate() != null && target.getMatchDate() != null) {
            if (feeder.getMatchDate().isAfter(target.getMatchDate())) return true;
            if (feeder.getMatchDate().isBefore(target.getMatchDate())) return false;
            if (feeder.getKickOffTime() != null && target.getKickOffTime() != null) {
                if (feeder.getKickOffTime().isAfter(target.getKickOffTime())) return true;
                if (feeder.getKickOffTime().isBefore(target.getKickOffTime())) return false;
            }
        }
        if (feeder.getMatchNumber() != null && target.getMatchNumber() != null) {
            return feeder.getMatchNumber() > target.getMatchNumber();
        }
        return false;
    }
}
