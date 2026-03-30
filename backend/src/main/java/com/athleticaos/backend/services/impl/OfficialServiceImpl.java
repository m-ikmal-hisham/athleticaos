package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.audit.AuditLogger;
import com.athleticaos.backend.dtos.official.*;
import com.athleticaos.backend.entities.*;
import com.athleticaos.backend.repositories.*;
import com.athleticaos.backend.services.OfficialService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class OfficialServiceImpl implements OfficialService {

    private final OfficialRegistryRepository officialRepository;
    private final MatchOfficialRepository matchOfficialRepository;
    private final UserRepository userRepository;
    private final PersonRepository personRepository;
    private final MatchRepository matchRepository;
    private final TournamentRepository tournamentRepository;
    private final OfficialRoleRepository officialRoleRepository;
    private final TournamentOfficialRepository tournamentOfficialRepository;
    private final AuditLogger auditLogger;
    private final HttpServletRequest request;

    // ─── Registry Management ────────────────────────────────────────────

    @Override
    @Transactional
    public OfficialRegistryDTO registerOfficial(RegisterOfficialRequest req) {
        // Validate at least one identifier is provided
        if (req.getUserId() == null && req.getPersonId() == null) {
            throw new IllegalArgumentException("Either userId or personId must be provided");
        }

        User user = null;
        Person person = null;

        if (req.getUserId() != null) {
            user = userRepository.findById(req.getUserId())
                    .orElseThrow(() -> new EntityNotFoundException("User not found"));
            if (officialRepository.findByUserId(req.getUserId()).isPresent()) {
                throw new IllegalArgumentException("User is already registered as an official");
            }
        }
        if (req.getPersonId() != null) {
            person = personRepository.findById(req.getPersonId())
                    .orElseThrow(() -> new EntityNotFoundException("Person not found"));
        }

        LocalDateTime expiryDate = null;
        if (req.getExpiryDate() != null && !req.getExpiryDate().isBlank()) {
            expiryDate = LocalDateTime.parse(req.getExpiryDate());
        }

        OfficialRegistry official = OfficialRegistry.builder()
                .user(user)
                .person(person)
                .accreditationLevel(req.getAccreditationLevel())
                .primaryRole(req.getPrimaryRole())
                .badgeNumber(req.getBadgeNumber())
                .accreditationExpiryDate(expiryDate)
                .isWorldRugbyCertified(req.isWorldRugbyCertified())
                .build();

        official = officialRepository.save(official);
        return toRegistryDTO(official);
    }

    @Override
    @Transactional
    public OfficialRegistryDTO updateOfficial(UUID officialId, RegisterOfficialRequest req) {
        OfficialRegistry official = officialRepository.findById(Objects.requireNonNull(officialId))
                .orElseThrow(() -> new EntityNotFoundException("Official not found"));

        official.setAccreditationLevel(req.getAccreditationLevel());
        official.setPrimaryRole(req.getPrimaryRole());

        if (req.getExpiryDate() != null && !req.getExpiryDate().isBlank()) {
            official.setAccreditationExpiryDate(LocalDateTime.parse(req.getExpiryDate()));
        }

        official = officialRepository.save(official);
        return toRegistryDTO(official);
    }

    @Override
    @Transactional(readOnly = true)
    public List<OfficialRegistryDTO> getAllOfficials() {
        return officialRepository.findAll().stream()
                .map(this::toRegistryDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public OfficialRegistryDTO getOfficialById(UUID officialId) {
        OfficialRegistry official = officialRepository.findById(Objects.requireNonNull(officialId))
                .orElseThrow(() -> new EntityNotFoundException("Official not found"));
        return toRegistryDTO(official);
    }

    // ─── Match Assignment Management ────────────────────────────────────

    @Override
    @Transactional
    public MatchOfficialDTO assignOfficialToMatch(UUID matchId, AssignOfficialRequest req) {
        Match match = matchRepository.findById(Objects.requireNonNull(matchId))
                .orElseThrow(() -> new EntityNotFoundException("Match not found"));
        OfficialRegistry official = officialRepository.findById(Objects.requireNonNull(req.getOfficialId()))
                .orElseThrow(() -> new EntityNotFoundException("Official not found"));

        OfficialRole role = null;
        String assignedRoleStr = req.getAssignedRole();

        if (req.getOfficialRoleId() != null) {
            role = officialRoleRepository.findById(req.getOfficialRoleId())
                    .orElseThrow(() -> new EntityNotFoundException("Official Role not found"));
            assignedRoleStr = role.getName();
        }

        if (assignedRoleStr == null || assignedRoleStr.isBlank()) {
            throw new IllegalArgumentException("Either officialRoleId or assignedRole must be provided");
        }

        MatchOfficial assignment = MatchOfficial.builder()
                .match(match)
                .official(official)
                .officialRole(role)
                .assignedRole(assignedRoleStr)
                .isConfirmed(true)
                .build();

        MatchOfficial saved = matchOfficialRepository.save(assignment);
        auditLogger.logOfficialAssigned(saved, request);
        return toMatchOfficialDTO(saved);
    }

    @Override
    @Transactional
    public void removeOfficialFromMatch(UUID assignmentId) {
        if (!matchOfficialRepository.existsById(Objects.requireNonNull(assignmentId))) {
            throw new EntityNotFoundException("Assignment not found");
        }
        matchOfficialRepository.deleteById(Objects.requireNonNull(assignmentId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<MatchOfficialDTO> getOfficialsForMatch(UUID matchId) {
        return matchOfficialRepository.findByMatchId(matchId).stream()
                .map(this::toMatchOfficialDTO)
                .collect(Collectors.toList());
    }

    // ─── Tournament Official Panel Management ───────────────────────────

    @Override
    @Transactional
    public TournamentOfficialDTO addOfficialToTournament(UUID tournamentId, AddTournamentOfficialRequest req) {
        Tournament tournament = tournamentRepository.findById(Objects.requireNonNull(tournamentId))
                .orElseThrow(() -> new EntityNotFoundException("Tournament not found"));
        OfficialRegistry official = officialRepository.findById(Objects.requireNonNull(req.getOfficialId()))
                .orElseThrow(() -> new EntityNotFoundException("Official not found"));

        var existing = tournamentOfficialRepository.findByTournamentIdAndOfficialId(tournamentId, official.getId());
        if (existing.isPresent()) {
            TournamentOfficial to = existing.get();
            if (!to.isActive()) {
                to.setActive(true);
                to = tournamentOfficialRepository.save(to);
            }
            return toTournamentOfficialDTO(to);
        }

        OfficialRole role = null;
        if (req.getOfficialRoleId() != null) {
            role = officialRoleRepository.findById(req.getOfficialRoleId())
                    .orElseThrow(() -> new EntityNotFoundException("Official Role not found"));
        }

        TournamentOfficial to = TournamentOfficial.builder()
                .tournament(tournament)
                .official(official)
                .officialRole(role)
                .isActive(true)
                .build();

        to = tournamentOfficialRepository.save(to);
        return toTournamentOfficialDTO(to);
    }

    @Override
    @Transactional
    public void removeOfficialFromTournament(UUID tournamentOfficialId) {
        TournamentOfficial to = tournamentOfficialRepository.findById(Objects.requireNonNull(tournamentOfficialId))
                .orElseThrow(() -> new EntityNotFoundException("Tournament official not found"));
        to.setActive(false);
        tournamentOfficialRepository.save(to);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TournamentOfficialDTO> getTournamentOfficials(UUID tournamentId) {
        return tournamentOfficialRepository.findByTournamentIdAndIsActiveTrue(tournamentId).stream()
                .map(this::toTournamentOfficialDTO)
                .collect(Collectors.toList());
    }

    // ─── DTO Mappers ────────────────────────────────────────────────────

    private OfficialRegistryDTO toRegistryDTO(OfficialRegistry o) {
        String firstName = null;
        String lastName = null;

        if (o.getPerson() != null) {
            firstName = o.getPerson().getFirstName();
            lastName = o.getPerson().getLastName();
        } else if (o.getUser() != null) {
            firstName = o.getUser().getFirstName();
            lastName = o.getUser().getLastName();
        }

        return OfficialRegistryDTO.builder()
                .id(o.getId())
                .userId(o.getUser() != null ? o.getUser().getId() : null)
                .personId(o.getPerson() != null ? o.getPerson().getId() : null)
                .firstName(firstName)
                .lastName(lastName)
                .accreditationLevel(o.getAccreditationLevel())
                .primaryRole(o.getPrimaryRole())
                .badgeNumber(o.getBadgeNumber())
                .isActive(o.isActive())
                .organisationId(o.getOrganisation() != null ? o.getOrganisation().getId() : null)
                .organisationName(o.getOrganisation() != null ? o.getOrganisation().getName() : null)
                .isWorldRugbyCertified(o.isWorldRugbyCertified())
                .build();
    }

    private MatchOfficialDTO toMatchOfficialDTO(MatchOfficial mo) {
        OfficialRegistry o = mo.getOfficial();
        String name = resolveName(o);

        return MatchOfficialDTO.builder()
                .id(mo.getId())
                .officialId(o.getId())
                .officialName(name)
                .assignedRole(mo.getAssignedRole())
                .officialRoleId(mo.getOfficialRole() != null ? mo.getOfficialRole().getId() : null)
                .officialRoleName(mo.getOfficialRole() != null ? mo.getOfficialRole().getName() : null)
                .isConfirmed(mo.isConfirmed())
                .build();
    }

    private TournamentOfficialDTO toTournamentOfficialDTO(TournamentOfficial to) {
        OfficialRegistry o = to.getOfficial();
        String name = resolveName(o);

        return TournamentOfficialDTO.builder()
                .id(to.getId())
                .officialId(o.getId())
                .officialName(name)
                .accreditationLevel(o.getAccreditationLevel())
                .badgeNumber(o.getBadgeNumber())
                .officialRoleId(to.getOfficialRole() != null ? to.getOfficialRole().getId() : null)
                .officialRoleName(to.getOfficialRole() != null ? to.getOfficialRole().getName() : null)
                .isActive(to.isActive())
                .build();
    }

    private String resolveName(OfficialRegistry o) {
        if (o.getPerson() != null) {
            return o.getPerson().getFirstName() + " " + o.getPerson().getLastName();
        } else if (o.getUser() != null) {
            return o.getUser().getFirstName() + " " + o.getUser().getLastName();
        }
        return "Unknown";
    }
}
