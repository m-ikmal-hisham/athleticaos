package com.athleticaos.backend.services.impl;

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
    private final AuditLogger auditLogger;

    public List<TournamentResponse> getAllTournaments() {
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
        String status;
        java.time.LocalDate now = java.time.LocalDate.now();

        if (!tournament.isPublished()) {
            status = "Draft";
        } else if (now.isBefore(tournament.getStartDate())) {
            status = "Upcoming";
        } else if (now.isAfter(tournament.getEndDate())) {
            status = "Completed";
        } else {
            status = "Ongoing";
        }

        return TournamentResponse.builder()
                .id(tournament.getId())
                .name(tournament.getName())
                .level(tournament.getLevel())
                .organiserOrgId(tournament.getOrganiserOrg().getId())
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
}
