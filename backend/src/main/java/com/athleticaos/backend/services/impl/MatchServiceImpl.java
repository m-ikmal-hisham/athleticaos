package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.util.UrlSanitizer;

import com.athleticaos.backend.dtos.match.MatchCreateRequest;
import com.athleticaos.backend.dtos.match.MatchResponse;
import com.athleticaos.backend.dtos.match.MatchUpdateRequest;
import com.athleticaos.backend.dtos.match.MatchValidationDTO;
import com.athleticaos.backend.dtos.match.OperationsDashboardDTO;
import com.athleticaos.backend.entities.Match;
import com.athleticaos.backend.entities.Team;
import com.athleticaos.backend.entities.Tournament;
import com.athleticaos.backend.entities.TournamentFormatConfig;
import com.athleticaos.backend.enums.MatchStatus;
import com.athleticaos.backend.repositories.MatchRepository;
import com.athleticaos.backend.repositories.TeamRepository;
import com.athleticaos.backend.repositories.TournamentRepository;
import com.athleticaos.backend.audit.AuditLogger;
import com.athleticaos.backend.services.MatchService;
import com.athleticaos.backend.services.PlayerSuspensionService;
import com.athleticaos.backend.services.ProgressionService;
import com.athleticaos.backend.services.BracketService;
import com.athleticaos.backend.services.UserService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@lombok.extern.slf4j.Slf4j
public class MatchServiceImpl implements MatchService {

    private final MatchRepository matchRepository;
    private final TournamentRepository tournamentRepository;
    private final TeamRepository teamRepository;
    private final com.athleticaos.backend.repositories.MatchEventRepository matchEventRepository;
    private final UserService userService;
    private final AuditLogger auditLogger;
    private final PlayerSuspensionService suspensionService;

    private final com.athleticaos.backend.repositories.MatchLineupRepository matchLineupRepository;
    private final com.athleticaos.backend.repositories.MatchOfficialRepository matchOfficialRepository;
    private final com.athleticaos.backend.repositories.PlayerSuspensionRepository playerSuspensionRepository;
    private final com.athleticaos.backend.repositories.MediaAssetRepository mediaAssetRepository;
    private final com.athleticaos.backend.repositories.EventRepository eventRepository;
    private final com.athleticaos.backend.services.StatisticsService statisticsService;
    private final com.athleticaos.backend.repositories.TournamentStageRepository stageRepository;
    private final ProgressionService progressionService;
    private final BracketService bracketService;

    @Override
    @Transactional(readOnly = true)
    public List<MatchResponse> getAllMatches() {
        return getAllMatches(null, null, null);
    }

    // ... [omitted unchanged methods for brevity in tool call, but must be careful
    // with offsets if not replacing whole block.
    // Actually, I should use specific small replace calls for injection and for the
    // methods to avoid large text matching issues.]
    // I will replace fields and then separate replace calls for
    // deleteMatch/deleteMatches.

    @Override
    @Transactional(readOnly = true)
    public List<MatchResponse> getMatchesByStatus(String status) {
        return getAllMatches(status, null, null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MatchResponse> getAllMatches(String status, UUID tournamentId, UUID teamId) {
        java.util.Set<UUID> accessibleIds = userService.getAccessibleOrgIdsForCurrentUser();
        List<Match> matches;

        if (teamId != null) {
            matches = matchRepository.findByHomeTeamIdOrAwayTeamId(teamId, teamId);
            
            // If the user has a restricted set of accessible organisations, filter results
            if (accessibleIds != null) {
                matches = matches.stream()
                        .filter(m -> {
                            UUID homeOrgId = m.getHomeTeam() != null && m.getHomeTeam().getOrganisation() != null ? m.getHomeTeam().getOrganisation().getId() : null;
                            UUID awayOrgId = m.getAwayTeam() != null && m.getAwayTeam().getOrganisation() != null ? m.getAwayTeam().getOrganisation().getId() : null;
                            UUID tournamentOrgId = m.getTournament() != null && m.getTournament().getOrganiserOrg() != null ? m.getTournament().getOrganiserOrg().getId() : null;
                            return (homeOrgId != null && accessibleIds.contains(homeOrgId)) ||
                                   (awayOrgId != null && accessibleIds.contains(awayOrgId)) ||
                                   (tournamentOrgId != null && accessibleIds.contains(tournamentOrgId));
                        })
                        .collect(Collectors.toList());
            }

            // If tournamentId is provided, filter the results
            if (tournamentId != null) {
                matches = matches.stream()
                        .filter(m -> m.getTournament() != null && m.getTournament().getId().equals(tournamentId))
                        .collect(Collectors.toList());
            }
        } else {
            if (accessibleIds == null) {
                // SUPER_ADMIN sees all
                if (tournamentId != null) {
                    matches = matchRepository.findByTournamentIdWithDetails(tournamentId);
                } else {
                    matches = matchRepository.findAllWithDetails();
                }
            } else if (accessibleIds.isEmpty()) {
                matches = java.util.Collections.emptyList();
            } else {
                // Filter by accessible organisations
                matches = matchRepository.findMatchesByOrganisationIds(accessibleIds);

                // If tournamentId is provided, filter the results
                if (tournamentId != null) {
                    matches = matches.stream()
                            .filter(m -> m.getTournament() != null && m.getTournament().getId().equals(tournamentId))
                            .collect(Collectors.toList());
                }
            }
        }

        // Filter by status if provided
        if (status != null && !status.isEmpty() && !"ALL".equalsIgnoreCase(status)) {
            try {
                MatchStatus matchStatus = MatchStatus.valueOf(status.toUpperCase());
                matches = matches.stream()
                        .filter(m -> m.getStatus() == matchStatus)
                        .collect(Collectors.toList());
            } catch (IllegalArgumentException e) {
                return java.util.Collections.emptyList();
            }
        }

        return mapMatchesToResponses(matches);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MatchResponse> getMatchesByTournament(UUID tournamentId) {
        if (tournamentId == null) {
            throw new IllegalArgumentException("Tournament ID must not be null");
        }
        // Validate tournament exists
        if (!tournamentRepository.existsById(tournamentId)) {
            throw new EntityNotFoundException("Tournament not found with ID: " + tournamentId);
        }
        return mapMatchesToResponses(matchRepository.findByTournamentId(tournamentId));
    }

    @Override
    @Transactional(readOnly = true)
    public MatchResponse getMatchById(UUID id) {
        if (id == null) {
            throw new IllegalArgumentException("Match ID must not be null");
        }
        Match match = matchRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Match not found with ID: " + id));
        return mapToResponse(match);
    }

    @Override
    @Transactional(readOnly = true)
    public MatchResponse getMatchByCode(String matchCode) {
        List<Match> matches = matchRepository.findByMatchCode(matchCode);

        if (matches.isEmpty()) {
            throw new EntityNotFoundException("Match not found with code: " + matchCode);
        }

        Match match;
        if (matches.size() == 1) {
            match = matches.get(0);
        } else {
            // Handle duplicates: Prioritize LIVE/ONGOING tournaments
            match = matches.stream()
                    .filter(m -> m.getTournament() != null &&
                            ("LIVE".equalsIgnoreCase(m.getTournament().getStatus().name()) ||
                                    "ONGOING".equalsIgnoreCase(m.getTournament().getStatus().name())))
                    .findFirst()
                    .orElse(matches.get(0)); // Fallback to first match if no active tournament match found
        }

        return mapToResponse(match);
    }

    @Override
    @Transactional
    public MatchResponse createMatch(MatchCreateRequest request, HttpServletRequest httpRequest) {
        UUID tournamentId = request.getTournamentId();
        if (tournamentId == null) {
            throw new IllegalArgumentException("Tournament ID must not be null");
        }
        Tournament tournament = tournamentRepository.findById(tournamentId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Tournament not found with ID: " + tournamentId));

        Team homeTeam = null;
        UUID homeTeamId = request.getHomeTeamId();
        if (homeTeamId != null) {
            homeTeam = teamRepository.findById(homeTeamId)
                    .orElseThrow(
                            () -> new EntityNotFoundException(
                                    "Home Team not found with ID: " + homeTeamId));
        }

        Team awayTeam = null;
        UUID awayTeamId = request.getAwayTeamId();
        if (awayTeamId != null) {
            awayTeam = teamRepository.findById(awayTeamId)
                    .orElseThrow(
                            () -> new EntityNotFoundException(
                                    "Away Team not found with ID: " + awayTeamId));
        }

        // Validation: Home team != Away team (only if both are present)
        if (homeTeam != null && awayTeam != null && homeTeam.getId().equals(awayTeam.getId())) {
            throw new IllegalArgumentException("Home team and Away team cannot be the same.");
        }

        com.athleticaos.backend.entities.TournamentStage stage = null;
        UUID stageId = request.getStageId();
        if (stageId != null) {
            stage = stageRepository.findById(stageId)
                    .orElseThrow(() -> new EntityNotFoundException("Stage not found with ID: " + stageId));
        }

        // Basic Scheduling Logic: Check if match date is valid (optional soft rule,
        // keeping it simple for now)
        // We could check if matchDate is within tournament start/end dates here.

        Match match = Match.builder()
                .tournament(tournament)
                .homeTeam(homeTeam)
                .awayTeam(awayTeam)
                .homeTeamPlaceholder(request.getHomeTeamPlaceholder())
                .awayTeamPlaceholder(request.getAwayTeamPlaceholder())
                .matchDate(request.getMatchDate())
                .kickOffTime(request.getKickOffTime())
                .venue(request.getVenue())
                .pitch(request.getPitch())
                .phase(request.getPhase())
                .stage(stage)
                .matchCode(request.getMatchCode())
                .status(MatchStatus.SCHEDULED) // Default status
                .build();

        if (match == null) {
            throw new IllegalStateException("Match cannot be null");
        }
        Match savedMatch = matchRepository.save(match);
        auditLogger.logMatchCreated(savedMatch, httpRequest);
        return mapToResponse(savedMatch);
    }

    @Override
    @Transactional
    public MatchResponse updateMatch(UUID id, MatchUpdateRequest request, HttpServletRequest httpRequest) {
        if (id == null) {
            throw new IllegalArgumentException("Match ID must not be null");
        }
        Match match = matchRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Match not found with ID: " + id));

        if (request.getMatchDate() != null) {
            match.setMatchDate(request.getMatchDate());
        }
        if (request.getKickOffTime() != null) {
            match.setKickOffTime(request.getKickOffTime());
        }
        if (request.getVenue() != null) {
            match.setVenue(request.getVenue());
        }
        if (request.getPitch() != null) {
            match.setPitch(request.getPitch());
        }
        if (request.getPhase() != null) {
            match.setPhase(request.getPhase());
        }
        UUID stageId = request.getStageId();
        if (stageId != null) {
            com.athleticaos.backend.entities.TournamentStage stage = stageRepository.findById(stageId)
                    .orElseThrow(() -> new EntityNotFoundException("Stage not found with ID: " + stageId));
            match.setStage(stage);
        }
        if (request.getMatchCode() != null) {
            match.setMatchCode(request.getMatchCode());
        }

        // A slot is filled either by a fixed team or by a feeder link, never both.
        rejectContradictorySlot("Home", request.getHomeTeamId(),
                request.getHomeFromWinnerOfMatchId(), request.getHomeFromLoserOfMatchId());
        rejectContradictorySlot("Away", request.getAwayTeamId(),
                request.getAwayFromWinnerOfMatchId(), request.getAwayFromLoserOfMatchId());

        // Update Teams if provided
        UUID homeTeamId = request.getHomeTeamId();
        if (homeTeamId != null) {
            Team homeTeam = teamRepository.findById(homeTeamId)
                    .orElseThrow(() -> new EntityNotFoundException("Home Team not found"));
            match.setHomeTeam(homeTeam);
            // Naming a team supersedes any feeder that was pointing at this slot; leaving the
            // old link in place would let a later result overwrite the manual assignment.
            clearIncomingLinksToSlot(match, "HOME");
            // The placeholder was only ever a stand-in for this team, so drop it rather than
            // leave a stale "Seed 3" attached to a slot that is now decided.
            match.setHomeTeamPlaceholder(null);
        }
        if (request.getHomeTeamPlaceholder() != null) {
            match.setHomeTeamPlaceholder(request.getHomeTeamPlaceholder());
            if (homeTeamId == null) {
                // A placeholder means the slot is not decided yet, so it cannot keep holding a
                // team — otherwise the slot would show a team and a "Seed 3" label at once.
                match.setHomeTeam(null);
                clearIncomingLinksToSlot(match, "HOME");
            }
        }

        UUID awayTeamId = request.getAwayTeamId();
        if (awayTeamId != null) {
            Team awayTeam = teamRepository.findById(awayTeamId)
                    .orElseThrow(() -> new EntityNotFoundException("Away Team not found"));
            match.setAwayTeam(awayTeam);
            clearIncomingLinksToSlot(match, "AWAY");
            match.setAwayTeamPlaceholder(null);
        }
        if (request.getAwayTeamPlaceholder() != null) {
            match.setAwayTeamPlaceholder(request.getAwayTeamPlaceholder());
            if (awayTeamId == null) {
                match.setAwayTeam(null);
                clearIncomingLinksToSlot(match, "AWAY");
            }
        }

        // Validation: Home team != Away team (checked against the resulting state,
        // since updates are partial and either side may be unchanged)
        if (match.getHomeTeam() != null && match.getAwayTeam() != null
                && match.getHomeTeam().getId().equals(match.getAwayTeam().getId())) {
            throw new IllegalArgumentException("Home team and Away team cannot be the same.");
        }

        // --- FEEDER LINKS LOGIC ---
        // Handle Home Feeder Match
        UUID homeFromWinnerOfMatchId = request.getHomeFromWinnerOfMatchId();
        UUID homeFromLoserOfMatchId = request.getHomeFromLoserOfMatchId();
        if (homeFromWinnerOfMatchId != null) {
            clearIncomingLinksToSlot(match, "HOME");
            Match feeder = matchRepository.findById(homeFromWinnerOfMatchId).orElseThrow();
            feeder.setNextMatchIdForWinner(match.getId());
            feeder.setWinnerSlot("HOME");
            matchRepository.save(feeder);
            // The slot is now decided by an earlier result, so any team previously pinned to
            // it must go. Leaving it would show a team that the feeder may later contradict.
            match.setHomeTeam(null);
            // Label it the way the generator does. Clearing the label without replacing it left
            // the slot rendering as "EMPTY SPOT", indistinguishable from one nothing feeds.
            match.setHomeTeamPlaceholder(feederPlaceholder("Winner", feeder));
        } else if (homeFromLoserOfMatchId != null) {
            clearIncomingLinksToSlot(match, "HOME");
            Match feeder = matchRepository.findById(homeFromLoserOfMatchId).orElseThrow();
            feeder.setNextMatchIdForLoser(match.getId());
            feeder.setLoserSlot("HOME");
            matchRepository.save(feeder);
            match.setHomeTeam(null);
            match.setHomeTeamPlaceholder(feederPlaceholder("Loser", feeder));
        }

        // Handle Away Feeder Match
        UUID awayFromWinnerOfMatchId = request.getAwayFromWinnerOfMatchId();
        UUID awayFromLoserOfMatchId = request.getAwayFromLoserOfMatchId();
        if (awayFromWinnerOfMatchId != null) {
            clearIncomingLinksToSlot(match, "AWAY");
            Match feeder = matchRepository.findById(awayFromWinnerOfMatchId).orElseThrow();
            feeder.setNextMatchIdForWinner(match.getId());
            feeder.setWinnerSlot("AWAY");
            matchRepository.save(feeder);
            match.setAwayTeam(null);
            match.setAwayTeamPlaceholder(feederPlaceholder("Winner", feeder));
        } else if (awayFromLoserOfMatchId != null) {
            clearIncomingLinksToSlot(match, "AWAY");
            Match feeder = matchRepository.findById(awayFromLoserOfMatchId).orElseThrow();
            feeder.setNextMatchIdForLoser(match.getId());
            feeder.setLoserSlot("AWAY");
            matchRepository.save(feeder);
            match.setAwayTeam(null);
            match.setAwayTeamPlaceholder(feederPlaceholder("Loser", feeder));
        }
        // ------------------------

        // Set scores first if provided in the request
        if (request.getHomeScore() != null) {
            match.setHomeScore(request.getHomeScore());
        }
        if (request.getAwayScore() != null) {
            match.setAwayScore(request.getAwayScore());
        }

        // Status update logic - validate after scores are set
        if (request.getStatus() != null) {
            if (request.getStatus() == MatchStatus.COMPLETED) {
                // Require scores to be set (either from request or already in entity), unless the
                // result is a bye or walkover, which carries an explicit winner instead of scores.
                if (!hasExplicitResult(match)
                        && (match.getHomeScore() == null || match.getAwayScore() == null)) {
                    throw new IllegalArgumentException(
                            "Cannot set status to COMPLETED without home and away scores.");
                }
            }
            match.setStatus(request.getStatus());

            // Decrement suspensions if match is completed
            if (request.getStatus() == MatchStatus.COMPLETED) {
                suspensionService.decrementSuspensions(match);
            }
        }

        Match updatedMatch = matchRepository.save(match);
        auditLogger.logMatchUpdated(updatedMatch, httpRequest);
        triggerAutoProgression(updatedMatch);
        return mapToResponse(updatedMatch);
    }

    private void clearIncomingLinksToSlot(Match targetMatch, String slot) {
        if (targetMatch == null || targetMatch.getId() == null) return;
        List<Match> winnerFeeders = matchRepository.findByNextMatchIdForWinnerAndWinnerSlot(targetMatch.getId(), slot);
        if (winnerFeeders != null) {
            for(Match m : winnerFeeders) {
                m.setNextMatchIdForWinner(null);
                m.setWinnerSlot(null);
            }
            matchRepository.saveAll(winnerFeeders);
        }
        
        List<Match> loserFeeders = matchRepository.findByNextMatchIdForLoserAndLoserSlot(targetMatch.getId(), slot);
        if (loserFeeders != null) {
            for(Match m : loserFeeders) {
                m.setNextMatchIdForLoser(null);
                m.setLoserSlot(null);
            }
            matchRepository.saveAll(loserFeeders);
        }
    }

    @Override
    @Transactional
    public void deleteMatch(UUID id) {
        if (id == null) {
            throw new IllegalArgumentException("Match ID must not be null");
        }
        if (!matchRepository.existsById(id)) {
            throw new EntityNotFoundException("Match not found with ID: " + id);
        }
        matchEventRepository.deleteByMatchId(id);
        matchLineupRepository.deleteByMatchId(id);
        matchOfficialRepository.deleteByMatchId(id);
        playerSuspensionRepository.deleteByMatchId(id);
        mediaAssetRepository.deleteByMatchId(id);
        eventRepository.deleteByLinkedMatchId(id);

        matchRepository.deleteById(id);
    }

    @Override
    @Transactional
    public void deleteMatches(List<UUID> ids) {
        if (ids == null || ids.isEmpty()) {
            return;
        }
        matchEventRepository.deleteByMatchIdIn(ids);
        matchLineupRepository.deleteByMatchIdIn(ids);
        matchOfficialRepository.deleteByMatchIdIn(ids);
        playerSuspensionRepository.deleteByMatchIdIn(ids);
        mediaAssetRepository.deleteByMatchIdIn(ids);
        eventRepository.deleteByLinkedMatchIdIn(ids);

        matchRepository.deleteAllById(ids);
    }

    private MatchResponse mapToResponse(Match match) {
        return mapToResponse(match, null, null, null, null);
    }

    private MatchResponse mapToResponse(Match match,
            java.util.Map<UUID, UUID> homeWinnerMap,
            java.util.Map<UUID, UUID> homeLoserMap,
            java.util.Map<UUID, UUID> awayWinnerMap,
            java.util.Map<UUID, UUID> awayLoserMap) {
        MatchResponse.MatchResponseBuilder builder = MatchResponse.builder()
                .id(match.getId())
                .tournamentId(match.getTournament() != null ? match.getTournament().getId() : null)
                .tournamentName(match.getTournament() != null ? match.getTournament().getName() : "")
                .tournamentSlug(match.getTournament() != null ? match.getTournament().getSlug() : null)
                .matchDate(match.getMatchDate())
                .kickOffTime(match.getKickOffTime())
                .venue(match.getVenue())
                .pitch(match.getPitch())
                .status(match.getStatus().name())
                .homeScore(match.getHomeScore())
                .awayScore(match.getAwayScore())
                .resultType(match.getResultType() != null ? match.getResultType().name() : null)
                .winnerTeamId(match.getWinnerTeam() != null ? match.getWinnerTeam().getId() : null)
                .phase(match.getPhase() != null ? match.getPhase() : (match.getStage() != null ? match.getStage().getName() : null))
                .matchCode(match.getMatchCode());

        if (match.getStage() != null) {
            builder.stage(MatchResponse.StageInfo.builder()
                    .id(match.getStage().getId().toString())
                    .name(match.getStage().getName())
                    .stageType(match.getStage().getStageType() != null ? match.getStage().getStageType().name() : null)
                    .categoryId(match.getStage().getCategory() != null ? match.getStage().getCategory().getId() : null)
                    .build());
        }

        // Populate lineup configuration from tournament format config
        if (match.getTournament() != null) {
            UUID categoryId = null;
            if (match.getStage() != null && match.getStage().getCategory() != null) {
                categoryId = match.getStage().getCategory().getId();
            }
            TournamentFormatConfig config = match.getTournament().getFormatConfig(categoryId);
            
            if (config != null) {
                builder.startersCount(config.getStartersCount());
                builder.maxBenchCount(config.getMaxBenchCount());
            } else {
                // Fallback to XV defaults for backward compatibility
                builder.startersCount(15);
                builder.maxBenchCount(10);
            }
        } else {
            // Fallback to XV defaults for backward compatibility
            builder.startersCount(15);
            builder.maxBenchCount(10);
        }

        if (match.getHomeTeam() != null) {
            builder.homeTeamId(match.getHomeTeam().getId());
            builder.homeTeamName(match.getHomeTeam().getName());
            
            String homeLogo = match.getHomeTeam().getLogoUrl();
            if (homeLogo == null && match.getHomeTeam().getOrganisation() != null) {
                homeLogo = match.getHomeTeam().getOrganisation().getLogoUrl();
            }
            builder.homeTeamLogoUrl(UrlSanitizer.sanitize(homeLogo));
            
            builder.homeTeamShortName(match.getHomeTeam().getShortName());
            if (match.getHomeTeam().getOrganisation() != null) {
                builder.homeTeamOrgId(match.getHomeTeam().getOrganisation().getId());
            }
        } else {
            builder.homeTeamName(match.getHomeTeamPlaceholder() != null ? match.getHomeTeamPlaceholder() : "TBD");
        }
        builder.homeTeamPlaceholder(match.getHomeTeamPlaceholder());

        if (match.getAwayTeam() != null) {
            builder.awayTeamId(match.getAwayTeam().getId());
            builder.awayTeamName(match.getAwayTeam().getName());
            
            String awayLogo = match.getAwayTeam().getLogoUrl();
            if (awayLogo == null && match.getAwayTeam().getOrganisation() != null) {
                awayLogo = match.getAwayTeam().getOrganisation().getLogoUrl();
            }
            builder.awayTeamLogoUrl(UrlSanitizer.sanitize(awayLogo));
            
            builder.awayTeamShortName(match.getAwayTeam().getShortName());
            if (match.getAwayTeam().getOrganisation() != null) {
                builder.awayTeamOrgId(match.getAwayTeam().getOrganisation().getId());
            }
        } else {
            builder.awayTeamName(match.getAwayTeamPlaceholder() != null ? match.getAwayTeamPlaceholder() : "TBD");
        }
        builder.awayTeamPlaceholder(match.getAwayTeamPlaceholder());

        // Resolve Feeder Match References
        UUID matchId = match.getId();
        if (matchId != null) {
            // Home Winner Feeder
            if (homeWinnerMap != null && homeWinnerMap.containsKey(matchId)) {
                builder.homeFromWinnerOfMatchId(homeWinnerMap.get(matchId));
            } else if (homeWinnerMap == null) {
                List<Match> feeders = matchRepository.findByNextMatchIdForWinnerAndWinnerSlot(matchId, "HOME");
                if (feeders != null && !feeders.isEmpty()) {
                    builder.homeFromWinnerOfMatchId(feeders.get(0).getId());
                }
            }

            // Home Loser Feeder
            if (homeLoserMap != null && homeLoserMap.containsKey(matchId)) {
                builder.homeFromLoserOfMatchId(homeLoserMap.get(matchId));
            } else if (homeLoserMap == null) {
                List<Match> feeders = matchRepository.findByNextMatchIdForLoserAndLoserSlot(matchId, "HOME");
                if (feeders != null && !feeders.isEmpty()) {
                    builder.homeFromLoserOfMatchId(feeders.get(0).getId());
                }
            }

            // Away Winner Feeder
            if (awayWinnerMap != null && awayWinnerMap.containsKey(matchId)) {
                builder.awayFromWinnerOfMatchId(awayWinnerMap.get(matchId));
            } else if (awayWinnerMap == null) {
                List<Match> feeders = matchRepository.findByNextMatchIdForWinnerAndWinnerSlot(matchId, "AWAY");
                if (feeders != null && !feeders.isEmpty()) {
                    builder.awayFromWinnerOfMatchId(feeders.get(0).getId());
                }
            }

            // Away Loser Feeder
            if (awayLoserMap != null && awayLoserMap.containsKey(matchId)) {
                builder.awayFromLoserOfMatchId(awayLoserMap.get(matchId));
            } else if (awayLoserMap == null) {
                List<Match> feeders = matchRepository.findByNextMatchIdForLoserAndLoserSlot(matchId, "AWAY");
                if (feeders != null && !feeders.isEmpty()) {
                    builder.awayFromLoserOfMatchId(feeders.get(0).getId());
                }
            }
        }

        return builder.build();
    }

    private List<MatchResponse> mapMatchesToResponses(List<Match> matches) {
        if (matches == null || matches.isEmpty()) {
            return java.util.Collections.emptyList();
        }
        
        java.util.Map<UUID, UUID> homeWinnerMap = new java.util.HashMap<>();
        java.util.Map<UUID, UUID> homeLoserMap = new java.util.HashMap<>();
        java.util.Map<UUID, UUID> awayWinnerMap = new java.util.HashMap<>();
        java.util.Map<UUID, UUID> awayLoserMap = new java.util.HashMap<>();

        for (Match m : matches) {
            if (m.getId() == null) continue;
            if (m.getNextMatchIdForWinner() != null) {
                if ("HOME".equalsIgnoreCase(m.getWinnerSlot())) {
                    homeWinnerMap.put(m.getNextMatchIdForWinner(), m.getId());
                } else if ("AWAY".equalsIgnoreCase(m.getWinnerSlot())) {
                    awayWinnerMap.put(m.getNextMatchIdForWinner(), m.getId());
                }
            }
            if (m.getNextMatchIdForLoser() != null) {
                if ("HOME".equalsIgnoreCase(m.getLoserSlot())) {
                    homeLoserMap.put(m.getNextMatchIdForLoser(), m.getId());
                } else if ("AWAY".equalsIgnoreCase(m.getLoserSlot())) {
                    awayLoserMap.put(m.getNextMatchIdForLoser(), m.getId());
                }
            }
        }

        return matches.stream()
                .map(m -> mapToResponse(m, homeWinnerMap, homeLoserMap, awayWinnerMap, awayLoserMap))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void recalculateMatchScores(UUID matchId) {
        if (matchId == null) {
            throw new IllegalArgumentException("Match ID must not be null");
        }
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new EntityNotFoundException("Match not found with ID: " + matchId));

        List<com.athleticaos.backend.entities.MatchEvent> events = matchEventRepository.findByMatchId(matchId);

        int homeScore = 0;
        int awayScore = 0;

        for (com.athleticaos.backend.entities.MatchEvent event : events) {
            int points = statisticsService.getPointsForEventType(event.getEventType());
            if (match.getHomeTeam() != null && event.getTeam() != null
                    && event.getTeam().getId().equals(match.getHomeTeam().getId())) {
                homeScore += points;
            } else if (match.getAwayTeam() != null && event.getTeam() != null
                    && event.getTeam().getId().equals(match.getAwayTeam().getId())) {
                awayScore += points;
            }
        }

        match.setHomeScore(homeScore);
        match.setAwayScore(awayScore);
        Match updatedMatch = matchRepository.save(match);
        triggerAutoProgression(updatedMatch);
    }

    @Override
    @Transactional
    public MatchResponse updateMatchStatus(UUID id, String status, HttpServletRequest httpRequest) {
        if (id == null) {
            throw new IllegalArgumentException("Match ID must not be null");
        }
        Match match = matchRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Match not found with ID: " + id));

        MatchStatus matchStatus;
        try {
            matchStatus = MatchStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid match status: " + status);
        }

        match.setStatus(matchStatus);

        // Decrement suspensions if match is completed
        if (matchStatus == MatchStatus.COMPLETED) {
            // Byes and walkovers are complete without scores — their winner is recorded explicitly.
            if (!hasExplicitResult(match) && (match.getHomeScore() == null || match.getAwayScore() == null)) {
                throw new IllegalArgumentException("Cannot set status to COMPLETED without home and away scores.");
            }
            suspensionService.decrementSuspensions(match);
        }

        Match updatedMatch = matchRepository.save(match);
        triggerAutoProgression(updatedMatch);
        return mapToResponse(updatedMatch);
    }

    @Override
    @Transactional
    public MatchResponse recordUnplayedResult(UUID id, com.athleticaos.backend.enums.MatchResultType resultType,
            UUID winnerTeamId, HttpServletRequest httpRequest) {
        if (id == null) {
            throw new IllegalArgumentException("Match ID must not be null");
        }
        if (resultType == null || resultType == com.athleticaos.backend.enums.MatchResultType.NORMAL) {
            throw new IllegalArgumentException(
                    "Result type must be WALKOVER or BYE. Use the normal score update for a played match.");
        }

        Match match = matchRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Match not found with ID: " + id));

        Team winner = resolveUnplayedWinner(match, resultType, winnerTeamId);

        match.setResultType(resultType);
        match.setWinnerTeam(winner);
        match.setStatus(MatchStatus.COMPLETED);

        if (resultType == com.athleticaos.backend.enums.MatchResultType.WALKOVER) {
            // World Rugby awards a forfeited match to the non-offending side as a set scoreline
            // rather than leaving it blank, and standings count it. Without a score the result
            // displayed as 0-0 everywhere with no way to tell who had won.
            boolean homeWon = match.getHomeTeam() != null && winner.getId().equals(match.getHomeTeam().getId());
            match.setHomeScore(homeWon ? WALKOVER_WINNING_SCORE : WALKOVER_LOSING_SCORE);
            match.setAwayScore(homeWon ? WALKOVER_LOSING_SCORE : WALKOVER_WINNING_SCORE);
        }
        // A bye keeps null scores: there was no opponent, so there is no result to record.

        Match updatedMatch = matchRepository.save(match);
        auditLogger.logMatchUpdated(updatedMatch, httpRequest);
        triggerAutoProgression(updatedMatch);
        return mapToResponse(updatedMatch);
    }

    /**
     * Scoreline awarded for a walkover, following the World Rugby convention of 28-0 to the
     * non-offending side. Byes are not scored — they have no opponent.
     */
    private static final int WALKOVER_WINNING_SCORE = 28;
    private static final int WALKOVER_LOSING_SCORE = 0;

    private Team resolveUnplayedWinner(Match match, com.athleticaos.backend.enums.MatchResultType resultType,
            UUID winnerTeamId) {
        Team home = match.getHomeTeam();
        Team away = match.getAwayTeam();

        if (resultType == com.athleticaos.backend.enums.MatchResultType.BYE) {
            // A bye has exactly one team; the winner is whoever is present.
            if (home != null && away != null) {
                throw new IllegalArgumentException(
                        "This match has two teams, so it cannot be a bye. Record it as a walkover instead.");
            }
            Team present = home != null ? home : away;
            if (present == null) {
                throw new IllegalArgumentException("Cannot mark an empty match as a bye - neither slot has a team.");
            }
            return present;
        }

        // WALKOVER: both sides are known, so the winner must be named explicitly.
        if (winnerTeamId == null) {
            throw new IllegalArgumentException("A walkover needs the winning team to be specified.");
        }
        if (home != null && home.getId().equals(winnerTeamId)) {
            return home;
        }
        if (away != null && away.getId().equals(winnerTeamId)) {
            return away;
        }
        throw new IllegalArgumentException("The winning team must be one of the two teams in this match.");
    }

    @Override
    @Transactional
    public int applyByesForTournament(UUID tournamentId) {
        if (tournamentId == null) {
            throw new IllegalArgumentException("Tournament ID must not be null");
        }

        List<Match> candidates = matchRepository.findByTournamentId(tournamentId).stream()
                .filter(m -> m.getStage() != null && Boolean.TRUE.equals(m.getStage().getIsKnockoutStage()))
                .filter(m -> m.getStatus() == MatchStatus.SCHEDULED)
                // Exactly one side filled: two teams is a real match, neither is simply undecided.
                .filter(m -> (m.getHomeTeam() == null) != (m.getAwayTeam() == null))
                .toList();

        int applied = 0;
        for (Match match : candidates) {
            String emptySlot = match.getHomeTeam() == null ? "HOME" : "AWAY";
            if (hasPendingFeeder(match, emptySlot)) {
                // Still waiting on an earlier result, so the slot is undecided, not empty.
                continue;
            }

            Team present = match.getHomeTeam() != null ? match.getHomeTeam() : match.getAwayTeam();
            match.setResultType(com.athleticaos.backend.enums.MatchResultType.BYE);
            match.setWinnerTeam(present);
            match.setStatus(MatchStatus.COMPLETED);
            Match saved = matchRepository.save(match);
            triggerAutoProgression(saved);
            applied++;
        }

        log.info("Applied {} bye(s) for tournament {}", applied, tournamentId);
        return applied;
    }

    /**
     * A slot can be filled by a fixed team or fed from an earlier match, but not both — the
     * two would contradict each other as soon as that earlier match finished.
     */
    private void rejectContradictorySlot(String slotLabel, UUID teamId, UUID fromWinnerId, UUID fromLoserId) {
        if (teamId != null && (fromWinnerId != null || fromLoserId != null)) {
            throw new IllegalArgumentException(slotLabel
                    + " cannot be both a specific team and fed from another match. Choose one.");
        }
        if (fromWinnerId != null && fromLoserId != null) {
            throw new IllegalArgumentException(slotLabel
                    + " cannot be fed by both the winner and the loser of a match. Choose one.");
        }
    }

    /**
     * Label for a slot fed from an earlier match, matching the wording the bracket generator
     * uses ("Winner MATCH-CODE") so a manually rewired slot reads the same as a generated one.
     */
    private String feederPlaceholder(String outcome, Match feeder) {
        String code = feeder.getMatchCode() != null ? feeder.getMatchCode() : "match";
        String label = outcome + " " + code;
        return label.length() > 255 ? label.substring(0, 255) : label;
    }

    /** Byes and walkovers are decided by an explicit winner rather than by scores. */
    private boolean hasExplicitResult(Match match) {
        return match.getResultType() == com.athleticaos.backend.enums.MatchResultType.BYE
                || match.getResultType() == com.athleticaos.backend.enums.MatchResultType.WALKOVER;
    }

    /** True when another match is scheduled to feed the given slot, so it is not truly empty. */
    private boolean hasPendingFeeder(Match match, String slot) {
        List<Match> winnerFeeders = matchRepository.findByNextMatchIdForWinnerAndWinnerSlot(match.getId(), slot);
        if (winnerFeeders != null && !winnerFeeders.isEmpty()) {
            return true;
        }
        List<Match> loserFeeders = matchRepository.findByNextMatchIdForLoserAndLoserSlot(match.getId(), slot);
        return loserFeeders != null && !loserFeeders.isEmpty();
    }

    @Override
    @Transactional(readOnly = true)
    public OperationsDashboardDTO getOperationsDashboard() {
        // Reuse getAllMatches to ensure we only count accessible matches
        List<MatchResponse> allMatches = getAllMatches();

        long live = 0;
        long pending = 0;
        long completed = 0;
        List<MatchValidationDTO> attentionRequired = new java.util.ArrayList<>();

        java.time.LocalDateTime now = java.time.LocalDateTime.now();

        for (MatchResponse m : allMatches) {
            String status = m.getStatus();
            if ("LIVE".equalsIgnoreCase(status) || "ONGOING".equalsIgnoreCase(status)) {
                live++;
            } else if ("COMPLETED".equalsIgnoreCase(status)) {
                completed++;
            } else {
                pending++;
                // Check if overdue (Scheduled but in the past)
                if ("SCHEDULED".equalsIgnoreCase(status) && m.getMatchDate() != null) {
                    java.time.LocalDateTime startDateTime = m.getMatchDate().atTime(
                            m.getKickOffTime() != null ? m.getKickOffTime() : java.time.LocalTime.MIN);

                    if (startDateTime.isBefore(now)) {
                        attentionRequired.add(MatchValidationDTO.builder()
                                .matchId(m.getId())
                                .matchCode(m.getMatchCode())
                                .homeTeamName(m.getHomeTeamName())
                                .awayTeamName(m.getAwayTeamName())
                                .issues(java.util.Collections.singletonList("Match is SCHEDULED but past start time."))
                                .build());
                    }
                }
            }
        }

        return OperationsDashboardDTO.builder()
                .totalMatches(allMatches.size())
                .liveMatches(live)
                .pendingMatches(pending)
                .completedMatches(completed)
                .attentionRequired(attentionRequired)
                .build();
    }

    /**
     * Schedules auto-progression to run AFTER the current transaction commits.
     * 
     * This is critical for PostgreSQL: if progression logic fails with a SQL error
     * (e.g., constraint violation, NPE during query), PostgreSQL marks the entire
     * transaction as aborted. A Java try-catch cannot heal the DB transaction state,
     * so all subsequent SQL in the same transaction would fail with:
     * "ERROR: current transaction is aborted, commands ignored until end of transaction block"
     * 
     * By deferring to afterCommit, the match update always succeeds, and progression
     * failures are isolated in their own transaction.
     */
    private void triggerAutoProgression(Match match) {
        if (match == null || match.getStatus() != MatchStatus.COMPLETED) {
            return;
        }

        com.athleticaos.backend.entities.TournamentStage stage = match.getStage();
        if (stage == null) {
            return;
        }

        // Capture IDs before afterCommit (entities may be detached after commit)
        final UUID matchId = match.getId();
        // A pool match that explicitly feeds a bracket must progress its winner too, so treat
        // "has an outgoing link" the same as "is in a knockout stage". Keying off the stage alone
        // left such winners stranded until someone noticed.
        final boolean isKnockout = Boolean.TRUE.equals(stage.getIsKnockoutStage())
                || match.getNextMatchIdForWinner() != null
                || match.getNextMatchIdForLoser() != null;
        final UUID tournamentId = match.getTournament() != null ? match.getTournament().getId() : null;

        org.springframework.transaction.support.TransactionSynchronizationManager
                .registerSynchronization(new org.springframework.transaction.support.TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        performAutoProgression(matchId, isKnockout, tournamentId);
                    }
                });
    }

    /**
     * Executes the actual auto-progression logic. Runs outside the original transaction
     * so any failures here do not affect the match update.
     */
    private void performAutoProgression(UUID matchId, boolean isKnockout, UUID tournamentId) {
        if (isKnockout) {
            log.info("Triggering auto-progression for knockout match {}", matchId);
            try {
                progressionService.processMatchCompletion(matchId);
            } catch (Exception e) {
                log.error("Failed to auto-progress knockout match {}", matchId, e);
            }
        } else if (tournamentId != null) {
            log.info("Checking if all pool matches are completed for tournament {}", tournamentId);
            try {
                List<com.athleticaos.backend.entities.TournamentStage> poolStages = stageRepository.findByTournamentIdOrderByDisplayOrderAsc(tournamentId)
                        .stream()
                        .filter(s -> Boolean.TRUE.equals(s.getIsGroupStage()))
                        .toList();

                boolean allPoolStagesCompleted = true;
                for (com.athleticaos.backend.entities.TournamentStage poolStage : poolStages) {
                    if (!progressionService.isStageComplete(poolStage.getId())) {
                        allPoolStagesCompleted = false;
                        break;
                    }
                }

                if (allPoolStagesCompleted && !poolStages.isEmpty()) {
                    log.info("All pool stages completed. Seeding knockout bracket for tournament {}", tournamentId);
                    bracketService.progressPoolsToKnockout(tournamentId);
                }
            } catch (Exception e) {
                log.error("Failed to auto-progress pool stages for tournament {}", tournamentId, e);
            }
        }
    }
}
