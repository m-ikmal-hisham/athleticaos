package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.audit.AuditLogger;
import com.athleticaos.backend.entities.Match;
import com.athleticaos.backend.entities.MatchOfficial;
import com.athleticaos.backend.entities.OfficialRegistry;
import com.athleticaos.backend.entities.User;
import com.athleticaos.backend.repositories.MatchOfficialRepository;
import com.athleticaos.backend.repositories.MatchRepository;
import com.athleticaos.backend.repositories.OfficialRegistryRepository;
import com.athleticaos.backend.repositories.UserRepository;
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

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class OfficialServiceImpl implements OfficialService {

    private final OfficialRegistryRepository officialRepository;
    private final MatchOfficialRepository matchOfficialRepository;
    private final UserRepository userRepository;
    private final MatchRepository matchRepository;
    private final AuditLogger auditLogger;
    private final HttpServletRequest request;

    @Override
    @Transactional
    public OfficialRegistry registerOfficial(UUID userId, String accreditationLevel, String primaryRole,
            String badgeNumber, LocalDateTime expiryDate) {
        User user = userRepository.findById(Objects.requireNonNull(userId))
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        if (officialRepository.findByUserId(Objects.requireNonNull(userId)).isPresent()) {
            throw new IllegalArgumentException("User is already registered as an official");
        }

        OfficialRegistry official = OfficialRegistry.builder()
                .user(user)
                .accreditationLevel(accreditationLevel)
                .primaryRole(primaryRole)
                .badgeNumber(badgeNumber)
                .accreditationExpiryDate(expiryDate)
                .build();

        // Ensure user has ROLE_OFFICIAL
        // Note: Ideally we should use userService.updateUserRoles, but for now we rely
        // on external admin actions or update implicitly if needed.
        // Implementing simple role addition check would be good here but assumes logic
        // exists in UserService.

        return officialRepository.save(official);
    }

    @Override
    @Transactional
    public OfficialRegistry updateOfficial(UUID officialId, String accreditationLevel, String primaryRole,
            LocalDateTime expiryDate) {
        OfficialRegistry official = officialRepository.findById(Objects.requireNonNull(officialId))
                .orElseThrow(() -> new EntityNotFoundException("Official not found"));

        official.setAccreditationLevel(accreditationLevel);
        official.setPrimaryRole(primaryRole);
        official.setAccreditationExpiryDate(expiryDate);

        return officialRepository.save(official);
    }

    @Override
    @Transactional(readOnly = true)
    public List<OfficialRegistry> getAllOfficials() {
        return officialRepository.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public OfficialRegistry getOfficialById(UUID officialId) {
        return officialRepository.findById(Objects.requireNonNull(officialId))
                .orElseThrow(() -> new EntityNotFoundException("Official not found"));
    }

    @Override
    @Transactional
    public MatchOfficial assignOfficialToMatch(UUID matchId, UUID officialId, String role) {
        Match match = matchRepository.findById(Objects.requireNonNull(matchId))
                .orElseThrow(() -> new EntityNotFoundException("Match not found"));
        OfficialRegistry official = officialRepository.findById(Objects.requireNonNull(officialId))
                .orElseThrow(() -> new EntityNotFoundException("Official not found"));

        MatchOfficial assignment = MatchOfficial.builder()
                .match(match)
                .official(official)
                .assignedRole(role)
                .isConfirmed(true) // Auto-confirm for now
                .build();

        MatchOfficial saved = matchOfficialRepository.save(assignment);
        auditLogger.logOfficialAssigned(saved, request);
        return saved;
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
    public List<MatchOfficial> getOfficialsForMatch(UUID matchId) {
        return matchOfficialRepository.findByMatchId(matchId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MatchOfficial> getOfficialHistory(UUID officialId) {
        return matchOfficialRepository.findByOfficialId(officialId);
    }
}
