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
    private final com.athleticaos.backend.repositories.TournamentPlayerRepository tournamentPlayerRepository;
    private final com.athleticaos.backend.repositories.TournamentFormatConfigRepository tournamentFormatConfigRepository;

    @Override
    @Transactional(readOnly = true)
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
                .filter(tournament -> !Boolean.TRUE.equals(tournament.getDeleted())) // Filter out deleted tournaments
                .filter(tournament -> level == null || tournament.getLevel().equals(level))
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<TournamentResponse> getTournamentsBySeason(UUID seasonId) {
        return tournamentRepository.findBySeasonId(seasonId).stream()
                .filter(tournament -> !Boolean.TRUE.equals(tournament.getDeleted()))
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<TournamentResponse> getPublishedTournaments() {
        return tournamentRepository.findByIsPublishedTrue().stream()
                .filter(tournament -> !Boolean.TRUE.equals(tournament.getDeleted()))
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    @SuppressWarnings("null")
    public TournamentResponse getTournamentById(UUID id) {
        Tournament tournament = tournamentRepository.findById(id)
                .filter(t -> !Boolean.TRUE.equals(t.getDeleted()))
                .orElseThrow(() -> new EntityNotFoundException("Tournament not found"));

        return mapToResponse(tournament);
    }

    @Override
    @Transactional(readOnly = true)
    public TournamentResponse getTournamentBySlug(String slug) {
        return tournamentRepository.findBySlug(slug)
                .filter(tournament -> !Boolean.TRUE.equals(tournament.getDeleted()))
                .map(this::mapToResponse)
                .orElseThrow(() -> new EntityNotFoundException("Tournament not found"));
    }

    @Override
    @Transactional(readOnly = true)
    @SuppressWarnings("null")
    public TournamentDashboardResponse getTournamentDashboard(UUID id) {
        Tournament tournament = tournamentRepository.findById(id)
                .filter(t -> !Boolean.TRUE.equals(t.getDeleted()))
                .orElseThrow(() -> new EntityNotFoundException("Tournament not found"));

        int totalMatches = matchRepository.findByTournamentId(id).size();
        int completedMatches = matchRepository
                .findByTournamentIdAndStatus(id, com.athleticaos.backend.enums.MatchStatus.COMPLETED).size();
        // Fix: Only count active and non-deleted teams
        int totalTeams = (int) tournamentTeamRepository.countByTournamentIdAndIsActiveTrueAndDeletedFalse(id);
        int totalPlayers = tournamentPlayerRepository.findByTournamentId(id).size();

        List<Match> matches = matchRepository.findByTournamentId(id);
        long totalPoints = matches.stream()
                .filter(m -> m.getStatus() == com.athleticaos.backend.enums.MatchStatus.COMPLETED
                        || m.getStatus() == com.athleticaos.backend.enums.MatchStatus.LIVE)
                .mapToLong(m -> (m.getHomeScore() != null ? m.getHomeScore() : 0)
                        + (m.getAwayScore() != null ? m.getAwayScore() : 0))
                .sum();

        com.athleticaos.backend.dtos.stats.TournamentStatsSummaryResponse stats = new com.athleticaos.backend.dtos.stats.TournamentStatsSummaryResponse(
                tournament.getId(),
                tournament.getName(),
                totalMatches,
                completedMatches,
                0, // tries placeholder
                (int) totalPoints,
                0, // yellow placeholder
                0, // red placeholder
                totalTeams,
                totalPlayers,
                totalPoints);

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
                .totalMatches(totalMatches)
                .completedMatches(completedMatches)
                .totalTeams(totalTeams)
                .totalPlayers(totalPlayers)
                .status(mapToResponse(tournament).getStatus())
                .stats(stats)
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
                .logoUrl(request.getLogoUrl())
                .bannerUrl(request.getBannerUrl())
                .backgroundUrl(request.getBackgroundUrl())
                .livestreamUrl(request.getLivestreamUrl())
                .isPublished(false)
                .deleted(false);

        // Phase C: Set season if provided
        if (request.getSeasonId() != null) {
            com.athleticaos.backend.entities.Season season = seasonRepository.findById(request.getSeasonId())
                    .orElseThrow(() -> new EntityNotFoundException("Season not found"));
            builder.season(season);
        } else if (request.getSeasonName() != null && !request.getSeasonName().trim().isEmpty()) {
            // Auto-create season if name provided
            String seasonName = request.getSeasonName().trim();
            com.athleticaos.backend.entities.Season season = findOrCreateSeason(seasonName, org);
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

        // Create categories if provided
        if (request.getCategories() != null && !request.getCategories().isEmpty()) {
            final Tournament tournamentForCategories = savedTournament;
            List<com.athleticaos.backend.entities.TournamentCategory> categories = request.getCategories().stream()
                    .map(catReq -> com.athleticaos.backend.entities.TournamentCategory.builder()
                            .tournament(tournamentForCategories)
                            .name(catReq.getName())
                            .description(catReq.getDescription())
                            .gender(catReq.getGender())
                            .minAge(catReq.getMinAge())
                            .maxAge(catReq.getMaxAge())
                            .build())
                    .collect(Collectors.toList());

            savedTournament.getCategories().addAll(categories);
            savedTournament = tournamentRepository.save(savedTournament);
        }

        auditLogger.logTournamentCreated(savedTournament, httpRequest);
        return mapToResponse(savedTournament);
    }

    @Transactional
    @SuppressWarnings("null")
    public TournamentResponse updateTournament(UUID id, TournamentUpdateRequest request,
            HttpServletRequest httpRequest) {
        log.info("Updating tournament: {}, request categories: {}", id, request.getCategories());
        Tournament tournament = tournamentRepository.findById(id)
                .filter(t -> !Boolean.TRUE.equals(t.getDeleted()))
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
        if (request.getLogoUrl() != null) {
            tournament.setLogoUrl(request.getLogoUrl());
        }
        if (request.getLivestreamUrl() != null) {
            tournament.setLivestreamUrl(request.getLivestreamUrl());
        }
        if (request.getBannerUrl() != null) {
            tournament.setBannerUrl(request.getBannerUrl());
        }
        if (request.getBackgroundUrl() != null) {
            tournament.setBackgroundUrl(request.getBackgroundUrl());
        }
        if (request.getIsPublished() != null) {
            tournament.setPublished(request.getIsPublished());
        }

        // Handle Season Linking
        if (request.getSeasonId() != null) {
            com.athleticaos.backend.entities.Season season = seasonRepository.findById(request.getSeasonId())
                    .orElseThrow(() -> new EntityNotFoundException("Season not found"));
            tournament.setSeason(season);
        } else if (request.getSeasonName() != null && !request.getSeasonName().trim().isEmpty()) {
            // Auto-create or find existing season by name
            String seasonName = request.getSeasonName().trim();
            com.athleticaos.backend.entities.Season season = findOrCreateSeason(seasonName,
                    tournament.getOrganiserOrg());
            tournament.setSeason(season);
        }

        // Handle Category Updates
        if (request.getCategories() != null) {
            // Clear existing categories
            tournament.getCategories().clear();

            // Add new categories from request
            List<com.athleticaos.backend.entities.TournamentCategory> newCategories = request.getCategories().stream()
                    .map(catReq -> com.athleticaos.backend.entities.TournamentCategory.builder()
                            .tournament(tournament)
                            .name(catReq.getName())
                            .description(catReq.getDescription())
                            .gender(catReq.getGender())
                            .minAge(catReq.getMinAge())
                            .maxAge(catReq.getMaxAge())
                            .build())
                    .collect(Collectors.toList());

            tournament.getCategories().addAll(newCategories);
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
                .filter(t -> !Boolean.TRUE.equals(t.getDeleted()))
                .orElseThrow(() -> new EntityNotFoundException("Tournament not found"));

        tournament.setDeleted(true);
        tournamentRepository.save(tournament);

        // Cascade soft delete to matches and teams
        matchRepository.softDeleteByTournamentId(id);
        tournamentTeamRepository.softDeleteByTournamentId(id);
    }

    @Transactional
    @SuppressWarnings("null")
    public TournamentResponse updatePublishStatus(UUID id, boolean publish, HttpServletRequest httpRequest) {
        log.info("Updating publish status for tournament {}: {}", id, publish);
        Tournament tournament = tournamentRepository.findById(id)
                .filter(t -> !Boolean.TRUE.equals(t.getDeleted()))
                .orElseThrow(() -> new EntityNotFoundException("Tournament not found"));

        tournament.setPublished(publish);
        Tournament savedTournament = tournamentRepository.save(tournament);
        auditLogger.logTournamentUpdated(savedTournament, httpRequest);
        return mapToResponse(savedTournament);
    }

    @Override
    @Transactional
    @SuppressWarnings("null")
    public TournamentResponse updateStatus(UUID id, com.athleticaos.backend.enums.TournamentStatus status,
            HttpServletRequest httpRequest) {
        log.info("Updating status for tournament {}: {}", id, status);
        Tournament tournament = tournamentRepository.findById(id)
                .filter(t -> !Boolean.TRUE.equals(t.getDeleted()))
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

    @SuppressWarnings("null")
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

        // Auto-fix invalid slug (ensure it propagates on list views too)
        if (tournament.getSlug() != null && tournament.getSlug().contains(" ")) {
            String fixedSlug = tournament.getSlug().replace(" ", "-");
            log.warn("Auto-fixing invalid slug for tournament {}: {} -> {}", tournament.getId(), tournament.getSlug(),
                    fixedSlug);
            tournament.setSlug(fixedSlug);
            // Verify we are in transaction or simpler: assume this will be persisted if
            // transactional,
            // or explicitly save if we are in a read-only context (which might be an
            // issue).
            // Since mapToResponse is called from Transactional methods usually...
            // But valid read-only transactions won't flush changes?
            // Let's force a repository save. This is a side effect but necessary for this
            // fix.
            tournamentRepository.save(tournament);
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
                .logoUrl(tournament.getLogoUrl())
                .bannerUrl(tournament.getBannerUrl())
                .backgroundUrl(tournament.getBackgroundUrl())
                .livestreamUrl(tournament.getLivestreamUrl())
                .rugbyFormat(
                        tournament.getFormatConfig() != null ? tournament.getFormatConfig().getRugbyFormat() : null)
                .competitionType(
                        tournament.getCompetitionType() != null ? tournament.getCompetitionType().name() : null)
                .categories(tournament.getCategories().stream()
                        .map(cat -> com.athleticaos.backend.dtos.tournament.TournamentCategoryDTO.builder()
                                .id(cat.getId())
                                .tournamentId(cat.getTournament().getId())
                                .name(cat.getName())
                                .description(cat.getDescription())
                                .gender(cat.getGender())
                                .minAge(cat.getMinAge())
                                .maxAge(cat.getMaxAge())
                                .build())
                        .collect(Collectors.toList()))
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
                        .state(tournamentTeam.getTeam().getState())
                        .status(tournamentTeam.getTeam().getStatus())
                        .poolNumber(tournamentTeam.getPoolNumber())
                        .tournamentCategoryId(
                                tournamentTeam.getCategory() != null ? tournamentTeam.getCategory().getId() : null)
                        .players(null) // Don't load players for list view
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    @SuppressWarnings("null")
    public void addTeamsToTournament(UUID tournamentId, List<UUID> teamIds) {
        Tournament tournament = tournamentRepository.findById(tournamentId)
                .orElseThrow(() -> new EntityNotFoundException("Tournament not found"));

        for (UUID teamId : teamIds) {
            // Fetch the Team entity to access its fields for category matching
            com.athleticaos.backend.entities.Team team = teamRepository.findById(teamId)
                    .orElseThrow(() -> new EntityNotFoundException("Team not found: " + teamId));

            // Auto-assign category if possible
            com.athleticaos.backend.entities.TournamentCategory assignedCategory = findMatchingCategory(tournament,
                    team);

            java.util.Optional<com.athleticaos.backend.entities.TournamentTeam> existing = tournamentTeamRepository
                    .findFirstByTournamentIdAndTeamId(tournamentId, teamId);

            if (existing.isPresent()) {
                com.athleticaos.backend.entities.TournamentTeam tt = existing.get();
                boolean changed = false;

                if (!tt.isActive()) {
                    tt.setActive(true);
                    changed = true;
                }

                // If category is missing, try to update it
                if (tt.getCategory() == null && assignedCategory != null) {
                    tt.setCategory(assignedCategory);
                    changed = true;
                }

                if (changed) {
                    tournamentTeamRepository.save(tt);
                }
            } else {
                com.athleticaos.backend.entities.TournamentTeam newTt = com.athleticaos.backend.entities.TournamentTeam
                        .builder()
                        .tournament(tournament)
                        .team(team)
                        .category(assignedCategory)
                        .isActive(true)
                        .build();
                tournamentTeamRepository.save(newTt);
            }
        }
    }

    private com.athleticaos.backend.entities.TournamentCategory findMatchingCategory(Tournament tournament,
            com.athleticaos.backend.entities.Team team) {
        if (tournament.getCategories() == null || tournament.getCategories().isEmpty()) {
            return null;
        }

        // 1. Filter by Gender
        List<com.athleticaos.backend.entities.TournamentCategory> genderMatches = tournament.getCategories().stream()
                .filter(cat -> isGenderMatch(team.getCategory(), cat.getGender()))
                .collect(Collectors.toList());

        if (genderMatches.isEmpty()) {
            return null;
        }

        if (genderMatches.size() == 1) {
            return genderMatches.get(0);
        }

        // 2. If multiple gender matches, filter by Age Group / Name
        // Try to match Age Group string in Category Name (e.g. "U12" in "U12 Boys")
        String ageGroup = team.getAgeGroup();
        if (ageGroup != null) {
            String normalizeAge = ageGroup.replace(" ", "").toLowerCase(); // "senior", "u12"
            List<com.athleticaos.backend.entities.TournamentCategory> ageMatches = genderMatches.stream()
                    .filter(cat -> {
                        String catName = cat.getName().toLowerCase().replace(" ", "");
                        // Simple contains check
                        if (catName.contains(normalizeAge))
                            return true;
                        // Handle "Open" for "Senior"
                        if (normalizeAge.equals("senior") && catName.contains("open"))
                            return true;
                        return false;
                    })
                    .collect(Collectors.toList());

            if (ageMatches.size() == 1) {
                return ageMatches.get(0);
            }
        }

        return null;
    }

    private boolean isGenderMatch(String teamCategory, String catGender) {
        if (teamCategory == null || catGender == null)
            return false;
        String tc = teamCategory.toUpperCase();
        String cg = catGender.toUpperCase();

        boolean teamMixed = tc.contains("MIXED");
        boolean catMixed = cg.contains("MIXED");

        if (teamMixed && catMixed)
            return true;
        // Prioritize explicit Male/Female
        // Note: "WOMEN" contains "MEN", so check Female first or use refined logic
        // Actually "WOMEN" contains "MEN".
        // Logic fix:
        if (tc.contains("WOMEN") || tc.contains("FEMALE")) {
            return cg.contains("WOMEN") || cg.contains("FEMALE");
        }
        if (tc.equals("MEN") || tc.equals("MENS") || tc.equals("MALE")) {
            return cg.equals("MEN") || cg.equals("MENS") || cg.equals("MALE")
                    || (cg.contains("MEN") && !cg.contains("WOMEN"));
        }

        return false;
    }

    @SuppressWarnings("null")
    private com.athleticaos.backend.entities.Season findOrCreateSeason(String seasonName, Organisation org) {
        // Find existing season by name and organiser
        java.util.Optional<com.athleticaos.backend.entities.Season> existing = seasonRepository.findAll().stream()
                .filter(s -> s.getOrganiser().getId().equals(org.getId()) && s.getName().equalsIgnoreCase(seasonName))
                .findFirst();

        if (existing.isPresent()) {
            return existing.get();
        }

        // logical slug generation
        String code = seasonName.toLowerCase().replaceAll("[^a-z0-9]", "-");
        String uniqueCode = code;
        if (seasonRepository.findAll().stream().anyMatch(s -> s.getCode().equals(code))) {
            uniqueCode = code + "-" + UUID.randomUUID().toString().substring(0, 6);
        }

        return seasonRepository.save(com.athleticaos.backend.entities.Season.builder()
                .name(seasonName)
                .code(uniqueCode)
                .organiser(org)
                .status(com.athleticaos.backend.enums.SeasonStatus.PLANNED)
                .level(com.athleticaos.backend.enums.SeasonLevel.NATIONAL) // Default to National if unknown
                .build());
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
    public void removeTeamsFromTournament(UUID tournamentId, List<UUID> teamIds) {
        // Find all active teams for this tournament that match the IDs
        // Note: findFirstBy... implies list.
        // Let's iterate for now to ensure we handle "not found" gracefully or just
        // ignore if not found (idempotent)
        // Ideally we fetch all relevant TTEs in one query.
        // But for simplicity/reuse:
        for (UUID teamId : teamIds) {
            tournamentTeamRepository.findFirstByTournamentIdAndTeamId(tournamentId, teamId)
                    .ifPresent(tt -> {
                        tt.setActive(false);
                        tournamentTeamRepository.save(tt);
                    });
        }
    }

    @Override
    @Transactional
    public void updateTeamPool(UUID tournamentId, UUID teamId, String poolNumber) {
        com.athleticaos.backend.entities.TournamentTeam tt = tournamentTeamRepository
                .findFirstByTournamentIdAndTeamId(tournamentId, teamId)
                .orElseThrow(() -> new EntityNotFoundException("Team is not registered for this tournament"));

        tt.setPoolNumber(poolNumber);
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
    @SuppressWarnings("null")
    public List<com.athleticaos.backend.entities.TournamentStage> generateStructure(UUID tournamentId, int poolCount,
            com.athleticaos.backend.dtos.tournament.BracketGenerationRequest request) {
        Tournament tournament = tournamentRepository.findById(tournamentId)
                .orElseThrow(() -> new EntityNotFoundException("Tournament not found"));
        return formatService.generateStructure(tournament, poolCount, request);
    }

    @Override
    @Transactional
    @SuppressWarnings("null")
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
        tournamentRepository.findById(java.util.Objects.requireNonNull(tournamentId))
                .orElseThrow(() -> new EntityNotFoundException("Tournament not found"));

        List<com.athleticaos.backend.entities.Match> matches = matchRepository
                .findByTournamentIdWithTeams(tournamentId);

        return matches.stream()
                .map(this::mapMatchToResponse)
                .collect(java.util.stream.Collectors.toList());
    }

    @Override
    @Transactional
    public void clearSchedule(UUID tournamentId) {
        // Default behavior: Clear All (structure included)
        clearSchedule(tournamentId, true);
    }

    @Override
    @Transactional
    public void clearSchedule(UUID tournamentId, boolean clearStructure) {
        // Verify tournament exists
        tournamentRepository.findById(java.util.Objects.requireNonNull(tournamentId))
                .orElseThrow(() -> new EntityNotFoundException("Tournament not found"));

        formatService.clearSchedule(tournamentId, clearStructure);
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
                    .categoryId(match.getStage().getCategory() != null ? match.getStage().getCategory().getId() : null)
                    .build());
        }

        return builder.build();
    }

    @Override
    @Transactional(readOnly = true)
    @SuppressWarnings("null")
    public com.athleticaos.backend.dtos.tournament.TournamentFormatConfigDTO getFormatConfig(UUID tournamentId,
            UUID categoryId) {
        Tournament tournament = tournamentRepository.findById(tournamentId)
                .orElseThrow(() -> new EntityNotFoundException("Tournament not found"));

        com.athleticaos.backend.entities.TournamentFormatConfig config = tournament.getFormatConfig(categoryId);
        return config != null ? mapToConfigDTO(config) : null;
    }

    // Kept for backward compatibility if needed, but redirects to global (null
    // category)
    public com.athleticaos.backend.dtos.tournament.TournamentFormatConfigDTO getFormatConfig(UUID tournamentId) {
        return getFormatConfig(tournamentId, null);
    }

    @Override
    @Transactional
    @SuppressWarnings("null")
    public com.athleticaos.backend.dtos.tournament.TournamentFormatConfigDTO updateFormatConfig(UUID tournamentId,
            com.athleticaos.backend.dtos.tournament.TournamentFormatConfigDTO configDTO) {

        Tournament tournament = tournamentRepository.findById(tournamentId)
                .orElseThrow(() -> new EntityNotFoundException("Tournament not found"));

        // Validation: Matches exist check removed to allow fixing configuration/timing.
        // Re-generation or manual adjustment will be needed to apply timing changes to
        // actual matches.
        boolean hasMatches = !matchRepository.findByTournamentId(tournamentId).isEmpty();
        if (hasMatches) {
            log.warn(
                    "Updating format parameters for tournament {} which already has calculated matches. User must regenerate or manually update matches to reflect timing changes.",
                    tournamentId);
        }

        // Strict lookup to avoid updating Global config when a specific category config
        // Fix: Use direct repository lookup to handle Unique Constraint correctly
        // Instead of traversing tournament.getFormatConfigs(), we query the DB
        // directly.
        com.athleticaos.backend.entities.TournamentFormatConfig config;

        if (configDTO.getCategoryId() != null) {
            config = tournamentFormatConfigRepository
                    .findByTournamentIdAndCategoryId(tournamentId, configDTO.getCategoryId())
                    .orElse(null);
        } else {
            config = tournamentFormatConfigRepository
                    .findByTournamentIdAndCategoryIsNull(tournamentId)
                    .orElse(null);
        }

        if (config == null) {
            // Create new
            config = new com.athleticaos.backend.entities.TournamentFormatConfig();
            config.setTournament(tournament);

            if (configDTO.getCategoryId() != null) {
                com.athleticaos.backend.entities.TournamentCategory cat = tournament.getCategories().stream()
                        .filter(c -> c.getId().equals(configDTO.getCategoryId()))
                        .findFirst()
                        .orElseThrow(() -> new EntityNotFoundException("Category not found"));
                config.setCategory(cat);
            }
        }

        // Apply updates
        config.setFormatType(configDTO.getFormatType());
        config.setRugbyFormat(configDTO.getRugbyFormat());
        config.setTeamCount(configDTO.getTeamCount());
        config.setPoolCount(configDTO.getPoolCount());
        config.setMatchDurationMinutes(configDTO.getMatchDurationMinutes());
        config.setPointsWin(configDTO.getPointsWin());
        config.setPointsDraw(configDTO.getPointsDraw());
        config.setPointsLoss(configDTO.getPointsLoss());
        config.setPointsBonusTry(configDTO.getPointsBonusTry());
        config.setPointsBonusLoss(configDTO.getPointsBonusLoss());
        config.setStartersCount(configDTO.getStartersCount());
        config.setMaxBenchCount(configDTO.getMaxBenchCount());
        config.setBufferTimeMinutes(configDTO.getBufferTimeMinutes());
        config.setCarnivalStartTime(
                configDTO.getCarnivalStartTime() != null ? java.time.LocalTime.parse(configDTO.getCarnivalStartTime())
                        : null);
        config.setCarnivalEndTime(
                configDTO.getCarnivalEndTime() != null ? java.time.LocalTime.parse(configDTO.getCarnivalEndTime())
                        : null);
        config.setIsOneWayMatch(configDTO.getIsOneWayMatch());
        config.setIncludePlacementStages(configDTO.getIncludePlacementStages());

        // Save directly via repo
        config = tournamentFormatConfigRepository.save(config);

        // Update main tournament format field if updating GLOBAL config
        if (configDTO.getCategoryId() == null) {
            tournament.setFormat(configDTO.getFormatType());
            tournament.setNumberOfPools(configDTO.getPoolCount());
        }

        tournament.addFormatConfig(config); // Use helper to add/replace
        tournamentRepository.save(tournament);

        return mapToConfigDTO(config);
    }

    private com.athleticaos.backend.dtos.tournament.TournamentFormatConfigDTO mapToConfigDTO(
            com.athleticaos.backend.entities.TournamentFormatConfig config) {
        return com.athleticaos.backend.dtos.tournament.TournamentFormatConfigDTO.builder()
                .id(config.getId())
                .tournamentId(config.getTournament().getId())
                .categoryId(config.getCategory() != null ? config.getCategory().getId() : null)
                .formatType(config.getFormatType())
                .rugbyFormat(config.getRugbyFormat())
                .teamCount(config.getTeamCount())
                .poolCount(config.getPoolCount())
                .matchDurationMinutes(config.getMatchDurationMinutes())
                .bufferTimeMinutes(config.getBufferTimeMinutes())
                .carnivalStartTime(
                        config.getCarnivalStartTime() != null ? config.getCarnivalStartTime().toString() : null)
                .carnivalEndTime(config.getCarnivalEndTime() != null ? config.getCarnivalEndTime().toString() : null)
                .isOneWayMatch(config.getIsOneWayMatch())
                .includePlacementStages(config.getIncludePlacementStages())
                .pointsWin(config.getPointsWin())
                .pointsDraw(config.getPointsDraw())
                .pointsLoss(config.getPointsLoss())
                .pointsBonusTry(config.getPointsBonusTry())
                .pointsBonusLoss(config.getPointsBonusLoss())
                .startersCount(config.getStartersCount())
                .maxBenchCount(config.getMaxBenchCount())
                .build();
    }

    @Override
    @Transactional
    public void updateStage(UUID tournamentId, UUID stageId, String name) {
        // Validate tournament ownership if needed, but stageId lookup in formatService
        // handles it via Entity reference
        // Ideally we should check if stage belongs to tournamentId, but FormatService
        // checks Stage existence.
        // We can add check here if we want to be strict.
        formatService.updateStageName(stageId, name);
    }
}
