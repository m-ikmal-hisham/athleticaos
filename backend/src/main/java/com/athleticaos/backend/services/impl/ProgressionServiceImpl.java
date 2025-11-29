package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.entities.Match;
import com.athleticaos.backend.entities.Team;
import com.athleticaos.backend.entities.Tournament;
import com.athleticaos.backend.entities.TournamentStage;
import com.athleticaos.backend.enums.MatchStatus;
import com.athleticaos.backend.enums.TournamentStageType;
import com.athleticaos.backend.repositories.MatchRepository;
import com.athleticaos.backend.repositories.TournamentRepository;
import com.athleticaos.backend.repositories.TournamentStageRepository;
import com.athleticaos.backend.services.ProgressionService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProgressionServiceImpl implements ProgressionService {

    private final MatchRepository matchRepository;
    private final TournamentRepository tournamentRepository;
    private final TournamentStageRepository stageRepository;

    @Override
    @Transactional
    @SuppressWarnings("null")
    public void processMatchCompletion(UUID matchId) {
        log.info("Processing match completion for match: {}", matchId);

        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new EntityNotFoundException("Match not found"));

        if (!canProgress(matchId)) {
            log.warn("Match {} cannot progress - not completed or no winner determined", matchId);
            return;
        }

        TournamentStage currentStage = match.getStage();
        if (currentStage == null) {
            log.warn("Match {} has no stage assigned, cannot progress", matchId);
            return;
        }

        if (!currentStage.getIsKnockoutStage()) {
            log.debug("Match {} is in group stage, no automatic progression needed", matchId);
            return;
        }

        // Determine winner
        Team winner = determineWinner(match);
        if (winner == null) {
            log.warn("Could not determine winner for match {}", matchId);
            return;
        }

        // Find next stage
        TournamentStage nextStage = findNextStage(currentStage);
        if (nextStage == null) {
            log.info("Match {} is in final stage, no further progression", matchId);
            return;
        }

        // Progress winner to next stage
        progressWinnerToNextStage(match, winner, nextStage);

        // Route loser to placement stage if tournament has placement stages enabled
        Team loser = determineLoser(match);
        if (loser != null && Boolean.TRUE.equals(match.getTournament().getHasPlacementStages())) {
            routeLoserToPlacementStage(match, loser, currentStage);
        }
    }

    @Override
    @Transactional
    public int progressTournament(UUID tournamentId) {
        log.info("Processing tournament progression for tournament: {}", tournamentId);

        // Verify tournament exists
        tournamentRepository.findById(tournamentId)
                .filter(t -> !t.isDeleted())
                .orElseThrow(() -> new EntityNotFoundException("Tournament not found"));

        List<TournamentStage> stages = stageRepository.findByTournamentIdOrderByDisplayOrderAsc(tournamentId);
        int progressedCount = 0;

        for (TournamentStage stage : stages) {
            if (!stage.getIsKnockoutStage()) {
                continue; // Skip group stages
            }

            if (!isStageComplete(stage.getId())) {
                log.debug("Stage {} is not complete yet, skipping progression", stage.getName());
                continue;
            }

            List<Match> stageMatches = matchRepository.findByStageId(stage.getId());
            for (Match match : stageMatches) {
                if (canProgress(match.getId())) {
                    processMatchCompletion(match.getId());
                    progressedCount++;
                }
            }
        }

        log.info("Progressed {} matches in tournament {}", progressedCount, tournamentId);
        return progressedCount;
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isStageComplete(UUID stageId) {
        List<Match> matches = matchRepository.findByStageId(stageId);

        if (matches.isEmpty()) {
            return false;
        }

        return matches.stream()
                .allMatch(match -> match.getStatus() == MatchStatus.COMPLETED);
    }

    @Override
    @Transactional(readOnly = true)
    @SuppressWarnings("null")
    public boolean canProgress(UUID matchId) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new EntityNotFoundException("Match not found"));

        // Match must be completed
        if (match.getStatus() != MatchStatus.COMPLETED) {
            return false;
        }

        // Must have scores
        if (match.getHomeScore() == null || match.getAwayScore() == null) {
            return false;
        }

        // Cannot be a draw (rugby can have draws in pool stages but not knockouts)
        if (match.getHomeScore().equals(match.getAwayScore())) {
            return false;
        }

        // Must be in a knockout stage
        if (match.getStage() == null || !match.getStage().getIsKnockoutStage()) {
            return false;
        }

        return true;
    }

    private Team determineWinner(Match match) {
        if (match.getHomeScore() == null || match.getAwayScore() == null) {
            return null;
        }

        if (match.getHomeScore() > match.getAwayScore()) {
            return match.getHomeTeam();
        } else if (match.getAwayScore() > match.getHomeScore()) {
            return match.getAwayTeam();
        }

        return null; // Draw
    }

    private Team determineLoser(Match match) {
        if (match.getHomeScore() == null || match.getAwayScore() == null) {
            return null;
        }

        if (match.getHomeScore() < match.getAwayScore()) {
            return match.getHomeTeam();
        } else if (match.getAwayScore() < match.getHomeScore()) {
            return match.getAwayTeam();
        }

        return null; // Draw
    }

    @Transactional
    protected void routeLoserToPlacementStage(Match completedMatch, Team loser, TournamentStage currentStage) {
        log.info("Routing loser {} from stage {} to placement stage",
                loser.getName(), currentStage.getName());

        // Determine which placement stage based on current stage type
        TournamentStageType placementStageType = determinePlacementStageType(currentStage.getStageType());
        if (placementStageType == null) {
            log.debug("No placement stage defined for losers of {}", currentStage.getStageType());
            return;
        }

        // Find placement stage
        TournamentStage placementStage = findPlacementStage(completedMatch.getTournament().getId(), placementStageType);
        if (placementStage == null) {
            log.warn("Placement stage {} not found for tournament", placementStageType);
            return;
        }

        // Find or create match in placement stage
        List<Match> placementMatches = matchRepository.findByStageId(placementStage.getId());
        Match targetMatch = findOrCreatePlacementMatch(completedMatch, placementStage, placementMatches, loser);

        // Assign loser to match
        assignLoserToMatch(targetMatch, loser, completedMatch);
    }

    private TournamentStageType determinePlacementStageType(TournamentStageType currentStageType) {
        return switch (currentStageType) {
            case QUARTER_FINAL -> TournamentStageType.BOWL; // QF losers go to Bowl
            case SEMI_FINAL -> TournamentStageType.PLATE; // SF losers go to Plate (or 3rd place)
            default -> null; // No placement for other stages
        };
    }

    @SuppressWarnings("null")
    private TournamentStage findPlacementStage(UUID tournamentId, TournamentStageType stageType) {
        List<TournamentStage> allStages = stageRepository.findByTournamentIdOrderByDisplayOrderAsc(tournamentId);

        return allStages.stream()
                .filter(stage -> stage.getStageType() == stageType)
                .findFirst()
                .orElse(null);
    }

    @SuppressWarnings("null")
    private Match findOrCreatePlacementMatch(Match completedMatch, TournamentStage placementStage,
            List<Match> existingMatches, Team loser) {

        // Find first match with empty slot
        for (Match match : existingMatches) {
            if (match.getHomeTeam() == null || match.getAwayTeam() == null) {
                return match;
            }
        }

        // Create new placement match if needed
        Match newMatch = Match.builder()
                .tournament(completedMatch.getTournament())
                .stage(placementStage)
                .matchDate(completedMatch.getTournament().getEndDate().minusDays(1))
                .kickOffTime(LocalTime.of(12, 0))
                .venue(completedMatch.getTournament().getVenue())
                .status(MatchStatus.SCHEDULED)
                .phase(placementStage.getName())
                .matchCode(String.format("%s-M%d", getStageAbbreviation(placementStage.getStageType()),
                        existingMatches.size() + 1))
                .build();

        return matchRepository.save(newMatch);
    }

    private void assignLoserToMatch(Match targetMatch, Team loser, Match completedMatch) {
        if (targetMatch.getHomeTeam() == null) {
            targetMatch.setHomeTeam(loser);
            log.info("Assigned loser {} as home team in placement match {}",
                    loser.getName(), targetMatch.getMatchCode());
        } else if (targetMatch.getAwayTeam() == null) {
            targetMatch.setAwayTeam(loser);
            log.info("Assigned loser {} as away team in placement match {}",
                    loser.getName(), targetMatch.getMatchCode());
        }

        matchRepository.save(targetMatch);
    }

    @SuppressWarnings("null")
    private TournamentStage findNextStage(TournamentStage currentStage) {
        List<TournamentStage> allStages = stageRepository.findByTournamentIdOrderByDisplayOrderAsc(
                currentStage.getTournament().getId());

        // Find stages with higher display order that are knockout stages
        return allStages.stream()
                .filter(stage -> stage.getIsKnockoutStage())
                .filter(stage -> stage.getDisplayOrder() > currentStage.getDisplayOrder())
                .min(Comparator.comparing(TournamentStage::getDisplayOrder))
                .orElse(null);
    }

    @Transactional
    protected void progressWinnerToNextStage(Match completedMatch, Team winner, TournamentStage nextStage) {
        log.info("Progressing winner {} from stage {} to stage {}",
                winner.getName(), completedMatch.getStage().getName(), nextStage.getName());

        // Find or create match in next stage for this winner
        List<Match> nextStageMatches = matchRepository.findByStageId(nextStage.getId());

        // Determine which position in the next stage this winner should occupy
        Match targetMatch = findOrCreateNextStageMatch(completedMatch, nextStage, nextStageMatches);

        // Assign winner to appropriate position in next match
        assignWinnerToMatch(targetMatch, winner, completedMatch);
    }

    @SuppressWarnings("null")
    private Match findOrCreateNextStageMatch(Match completedMatch, TournamentStage nextStage,
            List<Match> existingMatches) {
        // Calculate which match in the next stage this winner should go to
        // For a standard knockout bracket: QF1 & QF2 winners → SF1, QF3 & QF4 winners →
        // SF2

        List<Match> currentStageMatches = matchRepository.findByStageId(completedMatch.getStage().getId());
        int matchIndex = currentStageMatches.indexOf(completedMatch);
        int nextStageMatchIndex = matchIndex / 2; // Two matches feed into one

        // Find existing match at this index or create new one
        if (nextStageMatchIndex < existingMatches.size()) {
            return existingMatches.get(nextStageMatchIndex);
        }

        // Create new match in next stage
        Match newMatch = Match.builder()
                .tournament(completedMatch.getTournament())
                .stage(nextStage)
                .matchDate(completedMatch.getTournament().getStartDate().plusDays(1)) // Next day
                .kickOffTime(LocalTime.of(15, 0))
                .venue(completedMatch.getTournament().getVenue())
                .status(MatchStatus.SCHEDULED)
                .phase(nextStage.getName())
                .matchCode(String.format("%s-M%d", getStageAbbreviation(nextStage.getStageType()),
                        nextStageMatchIndex + 1))
                .build();

        return matchRepository.save(newMatch);
    }

    private void assignWinnerToMatch(Match targetMatch, Team winner, Match completedMatch) {
        // Determine if winner should be home or away based on bracket position
        List<Match> currentStageMatches = matchRepository.findByStageId(completedMatch.getStage().getId());
        int matchIndex = currentStageMatches.indexOf(completedMatch);

        if (matchIndex % 2 == 0) {
            // Even index (0, 2, 4...) → home team
            if (targetMatch.getHomeTeam() == null) {
                targetMatch.setHomeTeam(winner);
                log.info("Assigned {} as home team in match {}", winner.getName(), targetMatch.getMatchCode());
            }
        } else {
            // Odd index (1, 3, 5...) → away team
            if (targetMatch.getAwayTeam() == null) {
                targetMatch.setAwayTeam(winner);
                log.info("Assigned {} as away team in match {}", winner.getName(), targetMatch.getMatchCode());
            }
        }

        matchRepository.save(targetMatch);
    }

    private String getStageAbbreviation(TournamentStageType stageType) {
        return switch (stageType) {
            case QUARTER_FINAL -> "QF";
            case SEMI_FINAL -> "SF";
            case FINAL -> "F";
            case THIRD_PLACE -> "3P";
            default -> stageType.name().substring(0, 2);
        };
    }
}
