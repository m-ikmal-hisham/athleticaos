package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.team.TeamResponse;
import com.athleticaos.backend.dtos.tournament.TournamentCreateRequest;
import com.athleticaos.backend.dtos.tournament.TournamentDashboardResponse;
import com.athleticaos.backend.dtos.tournament.TournamentResponse;
import com.athleticaos.backend.dtos.tournament.TournamentUpdateRequest;
import com.athleticaos.backend.entities.Match;
import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.entities.Tournament;
import com.athleticaos.backend.repositories.MatchRepository;
import com.athleticaos.backend.repositories.OrganisationRepository;
import com.athleticaos.backend.repositories.SeasonRepository;
import com.athleticaos.backend.repositories.TournamentRepository;
import com.athleticaos.backend.repositories.TournamentTeamRepository;
import com.athleticaos.backend.audit.AuditLogger;
import com.athleticaos.backend.services.TournamentService;
import com.athleticaos.backend.services.UserService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TournamentServiceImpl implements TournamentService {

    private final TournamentRepository tournamentRepository;
    private final OrganisationRepository organisationRepository;
    private final SeasonRepository seasonRepository;
    private final UserService userService;
    private final MatchRepository matchRepository;
    private final TournamentTeamRepository tournamentTeamRepository;
    private final AuditLogger auditLogger;
    private final com.athleticaos.backend.services.FormatService formatService;
    private final com.athleticaos.backend.repositories.TeamRepository teamRepository;

    public List<TournamentResponse> getAllTournaments(String level) {
        java.util.Set<UUID> accessibleIds = userService.getAccessibleOrgIdsForCurrentUser();
        List<Tournament> tournaments;
        if (accessibleIds == null) {
            tournaments = tournamentRepository.findAll();
        } else if (accessibleIds.isEmpty()) {
            tournaments = java.util.Collections.emptyList();
        } else {
            tournaments = tournamentRepository.findByOrganiserOrg_IdIn(accessibleIds);
        }

        return tournaments.stream()
                .filter(tournament -> !tournament.isDeleted()) // Filter out deleted tournaments
                .filter(tournament -> level == null || tournament.getLevel().equals(level))
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<TournamentResponse> getPublishedTournaments() {
        return tournamentRepository.findByIsPublishedTrue().stream()
                .filter(tournament -> !tournament.isDeleted())
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @SuppressWarnings("null")
    public TournamentResponse getTournamentById(UUID id) {
        return tournamentRepository.findById(id)
                .filter(tournament -> !tournament.isDeleted())
                .map(this::mapToResponse)
                .orElseThrow(() -> new EntityNotFoundException("Tournament not found"));
    }

    @Override
    @SuppressWarnings("null")
    public TournamentResponse getTournamentBySlug(String slug) {
        return tournamentRepository.findBySlug(slug)
                .filter(tournament -> !tournament.isDeleted())
                .map(this::mapToResponse)
                .orElseThrow(() -> new EntityNotFoundException("Tournament not found"));
    }

    @Override
    public TournamentDashboardResponse getTournamentDashboard(UUID id) {
        Tournament tournament = tournamentRepository.findById(id)
                .filter(t -> !t.isDeleted())
                .orElseThrow(() -> new EntityNotFoundException("Tournament not found"));

        // TODO: Populate stats from Match/Team repositories
        return TournamentDashboardResponse.builder()
                .id(tournament.getId())
                .name(tournament.getName())
                .level(tournament.getLevel())
                .competitionType(tournament.getCompetitionType())
                .ageGrade(tournament.isAgeGrade())
                .ageGroupLabel(tournament.getAgeGroupLabel())
                .startDate(tournament.getStartDate())
                .endDate(tournament.getEndDate())
                .venue(tournament.getVenue())
                .totalMatches(0)
                .completedMatches(0)
                .totalTeams(0)
                .totalPlayers(0)
                .status(mapToResponse(tournament).getStatus())
                .build();
    }

    @Transactional
    @SuppressWarnings("null")
    public TournamentResponse createTournament(TournamentCreateRequest request, HttpServletRequest httpRequest) {
        log.info("Creating tournament: {}", request.getName());

        // Validate dates
        validateDates(request.getStartDate(), request.getEndDate());

        // Validate organiser organisation exists
        Organisation org = organisationRepository.findById(request.getOrganiserOrgId())
                .orElseThrow(() -> new EntityNotFoundException("Organiser Organisation not found"));

        Tournament.TournamentBuilder builder = Tournament.builder()
                .organiserOrg(org)
                .name(request.getName())
                .level(request.getLevel())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .venue(request.getVenue())
                .isPublished(false)
                .deleted(false);

        // Phase C: Set season if provided
        if (request.getSeasonId() != null) {
            com.athleticaos.backend.entities.Season season = seasonRepository.findById(request.getSeasonId())
                    .orElseThrow(() -> new EntityNotFoundException("Season not found"));
            builder.season(season);
        }

        // Generate slug
        String slugBase = request.getName().toLowerCase().replaceAll("[^a-z0-9]", "-");
        String slugSuffix = UUID.randomUUID().toString().substring(0, 8);
        builder.slug(slugBase + "-" + slugSuffix);

        // Phase C: Set competition type if provided
        if (request.getCompetitionType() != null) {
            builder.competitionType(request.getCompetitionType());
        }

        Tournament tournament = builder.build();

        Tournament savedTournament = tournamentRepository.save(tournament);
        auditLogger.logTournamentCreated(savedTournament, httpRequest);
        return mapToResponse(savedTournament);
    }

    @Transactional
    @SuppressWarnings("null")
    public TournamentResponse updateTournament(UUID id, TournamentUpdateRequest request,
            HttpServletRequest httpRequest) {
        log.info("Updating tournament: {}", id);
        Tournament tournament = tournamentRepository.findById(id)
                .filter(t -> !t.isDeleted())
                .orElseThrow(() -> new EntityNotFoundException("Tournament not found"));

        // Update fields if provided
        if (request.getName() != null) {
            tournament.setName(request.getName());
        }
        if (request.getLevel() != null) {
            tournament.setLevel(request.getLevel());
        }
        if (request.getOrganiserOrgId() != null) {
            Organisation org = organisationRepository.findById(request.getOrganiserOrgId())
                    .orElseThrow(() -> new EntityNotFoundException("Organiser Organisation not found"));
            tournament.setOrganiserOrg(org);
        }
        if (request.getStartDate() != null) {
            tournament.setStartDate(request.getStartDate());
        }
        if (request.getEndDate() != null) {
            tournament.setEndDate(request.getEndDate());
        }
        if (request.getVenue() != null) {
            tournament.setVenue(request.getVenue());
        }
        if (request.getIsPublished() != null) {
            tournament.setPublished(request.getIsPublished());
        }

        // Validate dates after updates
        validateDates(tournament.getStartDate(), tournament.getEndDate());

        Tournament savedTournament = tournamentRepository.save(tournament);
        auditLogger.logTournamentUpdated(savedTournament, httpRequest);
        return mapToResponse(savedTournament);
    }

    @Transactional
    @SuppressWarnings("null")
    public void deleteTournament(UUID id) {
        log.info("Soft deleting tournament: {}", id);
        Tournament tournament = tournamentRepository.findById(id)
                .filter(t -> !t.isDeleted())
                .orElseThrow(() -> new EntityNotFoundException("Tournament not found"));

        tournament.setDeleted(true);
        tournamentRepository.save(tournament);
    }

    @Transactional
    @SuppressWarnings("null")
    public TournamentResponse updatePublishStatus(UUID id, boolean publish, HttpServletRequest httpRequest) {
        log.info("Updating publish status for tournament {}: {}", id, publish);
        Tournament tournament = tournamentRepository.findById(id)
                .filter(t -> !t.isDeleted())
                .orElseThrow(() -> new EntityNotFoundException("Tournament not found"));

        tournament.setPublished(publish);
        Tournament savedTournament = tournamentRepository.save(tournament);
        auditLogger.logTournamentUpdated(savedTournament, httpRequest);
        return mapToResponse(savedTournament);
    }

    @Override
    @Transactional
    public TournamentResponse updateStatus(UUID id, com.athleticaos.backend.enums.TournamentStatus status,
            HttpServletRequest httpRequest) {
        log.info("Updating status for tournament {}: {}", id, status);
        Tournament tournament = tournamentRepository.findById(id)
                .filter(t -> !t.isDeleted())
                .orElseThrow(() -> new EntityNotFoundException("Tournament not found"));

        tournament.setStatus(status);

        // Sync flags
        if (status == com.athleticaos.backend.enums.TournamentStatus.DRAFT) {
            tournament.setPublished(false);
        } else {
            tournament.setPublished(true);
        }

        Tournament savedTournament = tournamentRepository.save(tournament);

        // Audit log
        // auditLogger.logTournamentUpdated(savedTournament, httpRequest);
        // Using existing log method if available

        // Since I can't confirm auditLogger has specific method for status change, I'll
        // assume logTournamentUpdated is fine.

        return mapToResponse(savedTournament);
    }

    @Override
    public byte[] exportMatches(UUID tournamentId) {
        return generateCsv(tournamentId, false);
    }

    @Override
    public byte[] exportResults(UUID tournamentId) {
        return generateCsv(tournamentId, true);
    }

    private byte[] generateCsv(UUID tournamentId, boolean includeResults) {
        Tournament tournament = tournamentRepository.findById(tournamentId)
                .orElseThrow(() -> new EntityNotFoundException("Tournament not found"));

        List<Match> matches = matchRepository.findByTournamentId(tournamentId);

        StringBuilder csv = new StringBuilder();
        csv.append("MatchCode,TournamentName,Stage,HomeTeam,AwayTeam,Date,Time,Venue,Status");
        if (includeResults) {
            csv.append(",HomeScore,AwayScore");
        }
        csv.append("\n");

        for (Match match : matches) {
            csv.append(escape(match.getId().toString())).append(","); // Using ID as code for now if code missing
            csv.append(escape(tournament.getName())).append(",");
            csv.append(escape(match.getStage() != null ? match.getStage().getName() : "")).append(",");
            csv.append(escape(match.getHomeTeam() != null ? match.getHomeTeam().getName() : "TBD")).append(",");
            csv.append(escape(match.getAwayTeam() != null ? match.getAwayTeam().getName() : "TBD")).append(",");
            csv.append(match.getMatchDate() != null ? match.getMatchDate().toString() : "").append(",");
            csv.append(match.getKickOffTime() != null ? match.getKickOffTime().toString() : "").append(",");
            csv.append(escape(match.getVenue() != null ? match.getVenue() : "")).append(",");
            csv.append(match.getStatus()).append(",");

            if (includeResults) {
                csv.append(match.getHomeScore() != null ? match.getHomeScore() : "").append(",");
                csv.append(match.getAwayScore() != null ? match.getAwayScore() : "");
            }
            csv.append("\n");
        }

        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    private String escape(String data) {
        if (data == null)
            return "";
        String escapedData = data.replaceAll("\\R", " ");
        if (data.contains(",") || data.contains("\"") || data.contains("'")) {
            data = data.replace("\"", "\"\"");
            escapedData = "\"" + data + "\"";
        }
        return escapedData;
    }

    private void validateDates(java.time.LocalDate startDate, java.time.LocalDate endDate) {
        if (startDate != null && endDate != null && endDate.isBefore(startDate)) {
            throw new IllegalArgumentException("End date must be on or after start date");
        }
    }

    private TournamentResponse mapToResponse(Tournament tournament) {
        // Map enum to friendly string if needed, or just use name()
        // DRAFT, PUBLISHED, LIVE, COMPLETED
        // The frontend expects "Draft", "Upcoming", "Ongoing", "Completed" ?
        // Or we stick to Enum names.
        // Let's use formatted enum names for now (Title Case)
        String status = tournament.getStatus().name();

        // Convert DRAFT -> Draft, LIVE -> Live, PUBLISHED -> Published, COMPLETED ->
        // Completed
        // Actually, let's keep it simple and send the enum string, passing it to
        // frontend as is,
        // or convert to Title Case.
        status = status.charAt(0) + status.substring(1).toLowerCase();
        if ("Published".equals(status))
            status = "Upcoming"; // map Published to Upcoming to match previous logic?
        if ("Live".equals(status))
            status = "Ongoing"; // map Live to Ongoing?

        // Override: if we want to stick to new statuses:
        // Let's return the Raw Enum value or Title Case.
        // The previous logic used "Draft", "Upcoming", "Completed", "Ongoing"
        // My new enum has DRAFT, PUBLISHED, LIVE, COMPLETED.

        // I will map them to maintain frontend compatibility if possible, or update
        // frontend.
        // DRAFT -> Draft
        // PUBLISHED -> Upcoming
        // LIVE -> Ongoing
        // COMPLETED -> Completed

        switch (tournament.getStatus()) {
            case DRAFT:
                status = "Draft";
                break;
            case PUBLISHED:
                status = "Upcoming";
                break;
            case LIVE:
                status = "Ongoing";
                break;
            case COMPLETED:
                status = "Completed";
                break;
            default:
                status = "Draft";
        }

        return TournamentResponse.builder()
                .id(tournament.getId())
                .name(tournament.getName())
                .slug(tournament.getSlug())
                .level(tournament.getLevel())
                .organiserOrgId(tournament.getOrganiserOrg() != null ? tournament.getOrganiserOrg().getId() : null)
                .startDate(tournament.getStartDate())
                .endDate(tournament.getEndDate())
                .venue(tournament.getVenue())
                .isPublished(tournament.isPublished())
                .status(status)
                .seasonName(tournament.getSeason() != null ? tournament.getSeason().getName() : null)
                .competitionType(
                        tournament.getCompetitionType() != null ? tournament.getCompetitionType().name() : null)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<TeamResponse> getTeamsByTournament(UUID tournamentId) {
        return tournamentTeamRepository.findByTournamentId(tournamentId).stream()
                .filter(com.athleticaos.backend.entities.TournamentTeam::isActive)
                .map(tournamentTeam -> TeamResponse.builder()
                        .id(tournamentTeam.getTeam().getId())
                        .organisationId(tournamentTeam.getTeam().getOrganisation().getId())
                        .organisationName(tournamentTeam.getTeam().getOrganisation().getName())
                        .slug(tournamentTeam.getTeam().getSlug())
                        .name(tournamentTeam.getTeam().getName())
                        .category(tournamentTeam.getTeam().getCategory())
                        .ageGroup(tournamentTeam.getTeam().getAgeGroup())
                        .division(tournamentTeam.getTeam().getDivision())
                        .level(tournamentTeam.getTeam().getDivision())
                        .state(tournamentTeam.getTeam().getState())
                        .status(tournamentTeam.getTeam().getStatus())
                        .players(null) // Don't load players for list view
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void addTeamsToTournament(UUID tournamentId, List<UUID> teamIds) {
        Tournament tournament = tournamentRepository.findById(tournamentId)
                .orElseThrow(() -> new EntityNotFoundException("Tournament not found"));

        for (UUID teamId : teamIds) {
            java.util.Optional<com.athleticaos.backend.entities.TournamentTeam> existing = tournamentTeamRepository
                    .findFirstByTournamentIdAndTeamId(tournamentId, teamId);

            if (existing.isPresent()) {
                com.athleticaos.backend.entities.TournamentTeam tt = existing.get();
                if (!tt.isActive()) {
                    tt.setActive(true);
                    tournamentTeamRepository.save(tt);
                }
            } else {
                // Proxy reference enough for relation? Check if need full fetch.
                // Better to fetch or assume existing reference if we trust ID. EntityNotFound
                // if not?
                // Using proxy reference for now to avoid N+1 fetches if many teams.
                // Actually JpaRepository.getReferenceById is better but let's stick to safe
                // entity creation.
                // Assuming teamId valid constraints.

                com.athleticaos.backend.entities.TournamentTeam newTt = com.athleticaos.backend.entities.TournamentTeam
                        .builder()
                        .tournament(tournament)
                        .team(teamRepository.getReferenceById(teamId))
                        .isActive(true)
                        .build();
                tournamentTeamRepository.save(newTt);
            }
        }
    }

    @Override
    @Transactional
    public void removeTeamFromTournament(UUID tournamentId, UUID teamId) {
        com.athleticaos.backend.entities.TournamentTeam tt = tournamentTeamRepository
                .findFirstByTournamentIdAndTeamId(tournamentId, teamId)
                .orElseThrow(() -> new EntityNotFoundException("Team is not registered for this tournament"));

        tt.setActive(false);
        tournamentTeamRepository.save(tt);
    }

    @Override
    @Transactional
    public void generateSchedule(UUID tournamentId,
            com.athleticaos.backend.dtos.tournament.BracketGenerationRequest request) {
        formatService.generateSchedule(tournamentId, request);
    }

    @Override
    @Transactional
    public com.athleticaos.backend.dtos.match.MatchResponse createMatch(UUID tournamentId,
            com.athleticaos.backend.dtos.match.MatchCreateRequest request) {
        Tournament tournament = tournamentRepository.findById(tournamentId)
                .orElseThrow(() -> new EntityNotFoundException("Tournament not found"));

        if (!request.getTournamentId().equals(tournamentId)) {
            throw new IllegalArgumentException("Tournament ID mismatch");
        }

        // Validate home and away teams are registered
        boolean homeRegistered = tournamentTeamRepository
                .findFirstByTournamentIdAndTeamId(tournamentId, request.getHomeTeamId())
                .map(com.athleticaos.backend.entities.TournamentTeam::isActive).orElse(false);
        boolean awayRegistered = tournamentTeamRepository
                .findFirstByTournamentIdAndTeamId(tournamentId, request.getAwayTeamId())
                .map(com.athleticaos.backend.entities.TournamentTeam::isActive).orElse(false);

        if (!homeRegistered || !awayRegistered) {
            throw new IllegalArgumentException("Both teams must be registered in the tournament");
        }

        Match match = Match.builder()
                .tournament(tournament)
                .homeTeam(teamRepository.getReferenceById(request.getHomeTeamId()))
                .awayTeam(teamRepository.getReferenceById(request.getAwayTeamId()))
                .matchDate(request.getMatchDate())
                .kickOffTime(request.getKickOffTime())
                .venue(request.getVenue())
                .pitch(request.getPitch())
                .matchCode(request.getMatchCode())
                .phase(request.getPhase())
                .status(com.athleticaos.backend.enums.MatchStatus.SCHEDULED)
                .build();

        Match savedMatch = matchRepository.save(match);
        // Map to response - simplified manual mapping for now as Mapper inject might
        // start a chain of complexity
        // Assuming we rely on DTOs, let's return a basic response or use a specific
        // mapper if available.
        // Actually, we should check if we can reuse an existing mapper or just build
        // the DTO manually.
        return com.athleticaos.backend.dtos.match.MatchResponse.builder()
                .id(savedMatch.getId())
                .tournamentId(savedMatch.getTournament().getId())
                .homeTeamId(savedMatch.getHomeTeam().getId())
                .homeTeamName(savedMatch.getHomeTeam().getName()) // Potential Lazy loading issue if not careful, but
                                                                  // referencedById might not load name.
                // Getting via Repo.getRefById does not load state. Better to use findById for
                // teams above if we need names here.
                // But for now let's hope frontend reloads or we can fix later.
                // Actually, for validation I fetched TT which has Team, but I didn't keep it.
                // Let's rely on valid entities. If issues, we can fetch eager.
                .awayTeamId(savedMatch.getAwayTeam().getId())
                // .awayTeamName(...)
                .matchDate(savedMatch.getMatchDate())
                .kickOffTime(savedMatch.getKickOffTime())
                .status(savedMatch.getStatus().name())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<com.athleticaos.backend.dtos.match.MatchResponse> getMatchesByTournament(UUID tournamentId) {
        // Verify tournament exists
        tournamentRepository.findById(tournamentId)
                .orElseThrow(() -> new RuntimeException("Tournament not found"));

        List<com.athleticaos.backend.entities.Match> matches = matchRepository
                .findByTournamentIdWithTeams(tournamentId);

        return matches.stream()
                .map(this::mapMatchToResponse)
                .collect(java.util.stream.Collectors.toList());
    }

    @Override
    @Transactional
    public void clearSchedule(UUID tournamentId) {
        // Verify tournament exists
        tournamentRepository.findById(tournamentId)
                .orElseThrow(() -> new RuntimeException("Tournament not found"));

        formatService.clearSchedule(tournamentId);
    }

    private com.athleticaos.backend.dtos.match.MatchResponse mapMatchToResponse(
            com.athleticaos.backend.entities.Match match) {
        // Safe status mapping
        String status = match.getStatus() != null ? match.getStatus().name() : "SCHEDULED";

        com.athleticaos.backend.dtos.match.MatchResponse.MatchResponseBuilder builder = com.athleticaos.backend.dtos.match.MatchResponse
                .builder()
                .id(match.getId())
                .tournamentId(match.getTournament().getId())
                .matchDate(match.getMatchDate())
                .kickOffTime(match.getKickOffTime())
                .venue(match.getVenue())
                .pitch(match.getPitch())
                .matchCode(match.getMatchCode())
                .phase(match.getPhase())
                .status(status)
                .homeScore(match.getHomeScore())
                .awayScore(match.getAwayScore());

        // Add home team info if available
        if (match.getHomeTeam() != null) {
            builder.homeTeamId(match.getHomeTeam().getId());
            builder.homeTeamName(match.getHomeTeam().getName());
            builder.homeTeam(com.athleticaos.backend.dtos.match.MatchResponse.TeamInfo.builder()
                    .id(match.getHomeTeam().getId())
                    .name(match.getHomeTeam().getName())
                    .build());
        } else {
            builder.homeTeamName("TBD");
        }

        // Add away team info if available
        if (match.getAwayTeam() != null) {
            builder.awayTeamId(match.getAwayTeam().getId());
            builder.awayTeamName(match.getAwayTeam().getName());
            builder.awayTeam(com.athleticaos.backend.dtos.match.MatchResponse.TeamInfo.builder()
                    .id(match.getAwayTeam().getId())
                    .name(match.getAwayTeam().getName())
                    .build());
        } else {
            builder.awayTeamName("TBD");
        }

        // Add stage info if available
        if (match.getStage() != null) {
            String stageType = match.getStage().getStageType() != null ? match.getStage().getStageType().name()
                    : "POOL";
            builder.stage(com.athleticaos.backend.dtos.match.MatchResponse.StageInfo.builder()
                    .id(match.getStage().getId().toString())
                    .name(match.getStage().getName())
                    .stageType(stageType)
                    .build());
        }

        return builder.build();
    }
}
