package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.util.UrlSanitizer;

import com.athleticaos.backend.dtos.person.CreatePersonRequest;
import com.athleticaos.backend.dtos.person.PersonResponseDTO;
import com.athleticaos.backend.dtos.person.PersonUpdateRequest;
import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.entities.Person;
import com.athleticaos.backend.entities.OrganisationPerson;
import jakarta.persistence.EntityNotFoundException;
import com.athleticaos.backend.repositories.*;
import com.athleticaos.backend.entities.Player;
import com.athleticaos.backend.entities.OfficialRegistry;
import com.athleticaos.backend.services.AccessScopeService;
import com.athleticaos.backend.services.PersonService;
import com.athleticaos.backend.services.OrganisationService;
import com.athleticaos.backend.services.UserService;
import com.athleticaos.backend.enums.Gender;
import com.athleticaos.backend.exceptions.DuplicateEmailException;
import com.athleticaos.backend.exceptions.EmailRequiredException;
import com.athleticaos.backend.exceptions.PossibleDuplicatePersonException;
import com.athleticaos.backend.dtos.person.PossibleDuplicateCheck;
import com.athleticaos.backend.dtos.person.RecordVerificationSummary;
import com.athleticaos.backend.services.PersonDuplicateService;
import com.athleticaos.backend.utils.EmailUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Objects;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import com.athleticaos.backend.audit.AuditLogger;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import jakarta.servlet.http.HttpServletRequest;

@Slf4j
@Service
@RequiredArgsConstructor
public class PersonServiceImpl implements PersonService {

    private final PersonRepository personRepository;
    private final OrganisationPersonRepository organisationPersonRepository;
    private final PlayerRepository playerRepository;
    private final TeamStaffRepository teamStaffRepository;
    private final OfficialRegistryRepository officialRegistryRepository;
    private final TournamentPlayerRepository tournamentPlayerRepository;
    private final TournamentStaffRepository tournamentStaffRepository;
    private final TournamentOfficialRepository tournamentOfficialRepository;
    private final UserRepository userRepository;
    private final OrganisationRepository organisationRepository;
    private final OrganisationService organisationService;
    private final UserService userService;
    private final AuditLogger auditLogger;
    private final ObjectProvider<HttpServletRequest> requestProvider;
    private final PersonDuplicateService personDuplicateService;
    private final AccessScopeService accessScopeService;

    @Override
    @Transactional(readOnly = true)
    public Page<PersonResponseDTO> getAllPersons(Pageable pageable, String search) {
        return getAllPersons(pageable, search, false);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PersonResponseDTO> getAllPersons(Pageable pageable, String search, boolean missingEmail) {
        // Delegates to getPersonsByOrganisation which already handles Super Admin
        // (returns all persons when accessibleIds is null)
        return getPersonsByOrganisation(null, pageable, search, missingEmail);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PersonResponseDTO> getPersonsByOrganisation(UUID organisationId, Pageable pageable, String search) {
        return getPersonsByOrganisation(organisationId, pageable, search, false);
    }

    @Override
    @Transactional(readOnly = true)
    @SuppressWarnings("null")
    public Page<PersonResponseDTO> getPersonsByOrganisation(UUID organisationId, Pageable pageable, String search, boolean missingEmail) {
        Objects.requireNonNull(pageable);
        boolean hasSearch = search != null && !search.trim().isEmpty();
        String searchTerm = hasSearch ? search.trim() : null;
        log.info("Fetching hierarchical persons for organisation: {}, search: {}, missingEmail: {}", organisationId, searchTerm, missingEmail);

        Set<UUID> accessibleIds = userService.getAccessibleOrgIdsForCurrentUser();
        Page<Person> personsToMap;

        if (accessibleIds == null) {
            // Super Admin -> fetch everyone paginated, with optional search and missingEmail
            if (missingEmail) {
                if (hasSearch) {
                    personsToMap = personRepository.searchPersonsWithMissingEmail(searchTerm, pageable);
                } else {
                    personsToMap = personRepository.findPersonsWithMissingEmail(pageable);
                }
            } else if (hasSearch) {
                personsToMap = personRepository.searchAllPersons(searchTerm, pageable);
            } else {
                personsToMap = personRepository.findAll(pageable);
            }
        } else {
            // Normal Admin -> fetch their org hierarchy
            Set<UUID> orgIds = organisationService.getAllDescendantIds(organisationId);

            // Intersection with accessibleIds to ensure they don't jump out of their allowed scope
            if (!orgIds.isEmpty() && !accessibleIds.isEmpty()) {
                orgIds.retainAll(accessibleIds);
            }

            if (orgIds.isEmpty()) {
                return Page.empty(pageable);
            } else if (missingEmail) {
                if (hasSearch) {
                    personsToMap = organisationPersonRepository.searchPersonsWithMissingEmailByOrganisationIds(orgIds, searchTerm, pageable);
                } else {
                    personsToMap = organisationPersonRepository.findUniquePersonsWithMissingEmailByOrganisationIds(orgIds, pageable);
                }
            } else if (hasSearch) {
                personsToMap = organisationPersonRepository.searchPersonsByOrganisationIds(orgIds, searchTerm, pageable);
            } else {
                personsToMap = organisationPersonRepository.findUniquePersonsByOrganisationIds(orgIds, pageable);
            }
        }

        List<UUID> personIds = personsToMap.getContent().stream()
                .map(Person::getId)
                .collect(Collectors.toList());

        if (personIds.isEmpty()) {
             return new PageImpl<PersonResponseDTO>(Collections.emptyList(), pageable, personsToMap.getTotalElements());
        }

        // 1. Batch fetch National Logos to eliminate N+1
        Map<UUID, String> nationalLogos = prefetchNationalLogos(personIds);

        // 2. Batch fetch Roles for only the target persons to improve performance
        Set<UUID> playerPersonIds = playerRepository.findAllPersonIdsIn(personIds);
        Set<UUID> staffPersonIds = teamStaffRepository.findAllPersonIdsIn(personIds);
        Set<UUID> officialPersonIds = officialRegistryRepository.findAllPersonIdsIn(personIds);
        Set<UUID> wrStaffPersonIds = teamStaffRepository.findAllWorldRugbyCertifiedPersonIdsIn(personIds);
        Set<UUID> wrOfficialPersonIds = officialRegistryRepository.findAllWorldRugbyCertifiedPersonIdsIn(personIds);
        Set<UUID> tournamentStaffPersonIds = tournamentStaffRepository.findAllPersonIdsIn(personIds);

        List<PersonResponseDTO> content = personsToMap.getContent().stream()
                .map(p -> mapToResponseDTO(p, playerPersonIds, staffPersonIds, officialPersonIds, wrStaffPersonIds, wrOfficialPersonIds, nationalLogos, tournamentStaffPersonIds))
                .collect(Collectors.toList());

        return new PageImpl<PersonResponseDTO>(content, pageable, personsToMap.getTotalElements());
    }

    private Map<UUID, String> prefetchNationalLogos(List<UUID> personIds) {
        List<OrganisationPerson> mappings = organisationPersonRepository.findAllByPersonIdIn(personIds);
        Map<UUID, String> logos = new HashMap<>();
        
        for (OrganisationPerson op : mappings) {
            Organisation org = op.getOrganisation();
            if (org != null && org.getOrgLevel() != null && "COUNTRY".equals(org.getOrgLevel().name())) {
                logos.put(op.getPerson().getId(), UrlSanitizer.sanitize(org.getLogoUrl()));
            }
        }
        return logos;
    }

    @Override
    @Transactional(readOnly = true)
    @SuppressWarnings("null")
    public PersonResponseDTO getPersonById(UUID id) {
        Person person = personRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Person not found"));
        // For a single person, we can just use the batch method since it's cached/fast,
        // or just use the old determineRoles logic. We'll use the sets for simplicity.
        List<UUID> personId = java.util.Collections.singletonList(person.getId());
        return mapToResponseDTO(person, 
                playerRepository.findAllPersonIdsIn(personId), 
                teamStaffRepository.findAllPersonIdsIn(personId), 
                officialRegistryRepository.findAllPersonIdsIn(personId),
                teamStaffRepository.findAllWorldRugbyCertifiedPersonIdsIn(personId),
                officialRegistryRepository.findAllWorldRugbyCertifiedPersonIdsIn(personId),
                prefetchNationalLogos(personId),
                tournamentStaffRepository.findAllPersonIdsIn(personId));
    }

    @Override
    @Transactional(readOnly = true)
    @SuppressWarnings("null")
    public PersonResponseDTO getPersonByIdInScope(UUID id) {
        Person person = personRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Person not found"));
        if (!accessScopeService.isPersonInScope(person.getId())) {
            UUID currentUserId = accessScopeService.getCurrentUserId();
            log.warn("Access denied for person record outside accessible organisation scope: userId={}, personId={}",
                    currentUserId, person.getId());
            throw new EntityNotFoundException("Person not found");
        }
        List<UUID> personId = java.util.Collections.singletonList(person.getId());
        return mapToResponseDTO(person, 
                playerRepository.findAllPersonIdsIn(personId), 
                teamStaffRepository.findAllPersonIdsIn(personId), 
                officialRegistryRepository.findAllPersonIdsIn(personId),
                teamStaffRepository.findAllWorldRugbyCertifiedPersonIdsIn(personId),
                officialRegistryRepository.findAllWorldRugbyCertifiedPersonIdsIn(personId),
                prefetchNationalLogos(personId),
                tournamentStaffRepository.findAllPersonIdsIn(personId));
    }

    @Override
    @Transactional
    @SuppressWarnings("null")
    public PersonResponseDTO createPerson(UUID organisationId, CreatePersonRequest request) {
        Organisation org = organisationRepository.findById(organisationId)
                .orElseThrow(() -> new EntityNotFoundException("Organisation not found"));

        if (!accessScopeService.isOrganisationInScope(org.getId())) {
            UUID currentUserId = accessScopeService.getCurrentUserId();
            log.warn("Access denied for organisation outside accessible scope: userId={}, organisationId={}",
                    currentUserId, org.getId());
            throw new EntityNotFoundException("Organisation not found");
        }

        String canonicalGender = Gender.from(request.getGender()).name();

        Person person = new Person();
        person.setFirstName(request.getFirstName());
        person.setLastName(request.getLastName());
        person.setRecordVerificationStatus("UNVERIFIED");
        person.setDob(request.getDob());
        person.setGender(canonicalGender);
        person.setNationality(request.getNationality());
        String normalizedEmail = EmailUtil.normalizeEmail(request.getEmail());
        if (normalizedEmail == null) {
            throw new EmailRequiredException();
        }
        if (personRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new DuplicateEmailException();
        }
        person.setEmail(normalizedEmail);
        person.setPhone(request.getPhone());
        person.setNationalPlayerStatus(request.getNationalPlayerStatus());
        person.setIsStaff(Boolean.TRUE.equals(request.getIsStaff()));

        PossibleDuplicateCheck dupCheck = personDuplicateService.check(
                request.getFirstName(), request.getLastName(), request.getDob(), canonicalGender, null);
        if (dupCheck != null && dupCheck.hasMatches()) {
            if (!Boolean.TRUE.equals(request.getConfirmPossibleDuplicate())) {
                throw new PossibleDuplicatePersonException(dupCheck.visibleMatches(), dupCheck.otherOrganisationMatches());
            }
        }

        person = personRepository.saveAndFlush(person);

        if (dupCheck != null && dupCheck.hasMatches() && Boolean.TRUE.equals(request.getConfirmPossibleDuplicate())) {
            final Person personForAudit = person;
            final int matchCount = dupCheck.visibleMatches().size();
            final int otherOrgMatches = dupCheck.otherOrganisationMatches();
            final HttpServletRequest currentRequest = requestProvider.getIfAvailable();
            if (TransactionSynchronizationManager.isSynchronizationActive()) {
                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        auditLogger.logPersonPossibleDuplicateOverride(personForAudit, matchCount, otherOrgMatches, currentRequest);
                    }
                });
            } else {
                auditLogger.logPersonPossibleDuplicateOverride(personForAudit, matchCount, otherOrgMatches, currentRequest);
            }
        }

        OrganisationPerson op = new OrganisationPerson();
        op.setOrganisation(org);
        op.setPerson(person);
        organisationPersonRepository.save(op);

        if (Boolean.TRUE.equals(request.getIsPlayer())) {
            Player player = Player.builder()
                    .person(person)
                    .status("ACTIVE")
                    .deleted(false)
                    .build();
            playerRepository.save(player);
        }

        if (Boolean.TRUE.equals(request.getIsOfficial())) {
            OfficialRegistry official = OfficialRegistry.builder()
                    .person(person)
                    .organisation(org)
                    .accreditationLevel("PENDING")
                    .primaryRole("TBA")
                    .badgeNumber("TBA")
                    .isActive(true)
                    .isWorldRugbyCertified(false)
                    .build();
            officialRegistryRepository.save(official);
        }

        return getPersonById(person.getId());
    }

    @Override
    @Transactional
    @SuppressWarnings("null")
    public PersonResponseDTO updatePerson(UUID id, PersonUpdateRequest request) {
        Person person = personRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Person not found"));

        if (!accessScopeService.isPersonInScope(person.getId())) {
            UUID currentUserId = accessScopeService.getCurrentUserId();
            log.warn("Access denied for person record outside accessible organisation scope: userId={}, personId={}",
                    currentUserId, person.getId());
            throw new EntityNotFoundException("Person not found");
        }

        String canonicalGender = request.getGender() != null ? Gender.from(request.getGender()).name() : null;

        boolean nameChanged = (request.getFirstName() != null && !request.getFirstName().trim().equals(person.getFirstName()))
                || (request.getLastName() != null && !request.getLastName().trim().equals(person.getLastName()));
        boolean dobChanged = request.getDob() != null && !request.getDob().equals(person.getDob());
        boolean genderChanged = canonicalGender != null && !canonicalGender.equals(person.getGender());

        boolean verificationReset = false;
        if ("VERIFIED".equals(person.getRecordVerificationStatus())
                && (nameChanged || dobChanged || genderChanged)) {
            person.clearRecordVerification("UNVERIFIED");
            verificationReset = true;
        }

        // Effective email rule (CR-4): a real address may not be removed, but a record that has
        // none — or only a machine-generated placeholder — can still be edited and saved.
        if (request.getEmail() != null) {
            String normalizedEmail = EmailUtil.normalizeEmail(request.getEmail());
            if (normalizedEmail == null) {
                if (!EmailUtil.isMissingOrPlaceholder(person.getEmail())) {
                    throw new EmailRequiredException("An existing email address cannot be removed.");
                }
                person.setEmail(null);
            } else {
                if (personRepository.existsByEmailIgnoreCaseAndIdNot(normalizedEmail, person.getId())) {
                    throw new DuplicateEmailException();
                }
                person.setEmail(normalizedEmail);
            }
        }

        // Possible duplicate check on changed identity fields
        String origFirst = person.getFirstName() != null ? person.getFirstName().trim().toLowerCase() : "";
        String origLast = person.getLastName() != null ? person.getLastName().trim().toLowerCase() : "";
        LocalDate origDob = person.getDob();
        String origGender = person.getGender();

        String newFirst = request.getFirstName() != null ? request.getFirstName().trim().toLowerCase() : origFirst;
        String newLast = request.getLastName() != null ? request.getLastName().trim().toLowerCase() : origLast;
        LocalDate newDob = request.getDob() != null ? request.getDob() : origDob;
        String newGender = canonicalGender != null ? canonicalGender : origGender;

        boolean identityFieldsChanged = !newFirst.equals(origFirst) || !newLast.equals(origLast)
                || !Objects.equals(newDob, origDob) || !Objects.equals(newGender, origGender);

        PossibleDuplicateCheck dupCheck = null;
        if (identityFieldsChanged) {
            dupCheck = personDuplicateService.check(
                    request.getFirstName() != null ? request.getFirstName() : person.getFirstName(),
                    request.getLastName() != null ? request.getLastName() : person.getLastName(),
                    newDob, newGender, person.getId());
            if (dupCheck != null && dupCheck.hasMatches()) {
                if (!Boolean.TRUE.equals(request.getConfirmPossibleDuplicate())) {
                    throw new PossibleDuplicatePersonException(dupCheck.visibleMatches(), dupCheck.otherOrganisationMatches());
                }
            }
        }

        // Null-safe updates for all other PII fields
        if (request.getFirstName() != null) person.setFirstName(request.getFirstName());
        if (request.getLastName() != null) person.setLastName(request.getLastName());
        if (request.getDob() != null) person.setDob(request.getDob());
        if (canonicalGender != null) person.setGender(canonicalGender);
        if (request.getNationality() != null) person.setNationality(request.getNationality());
        if (request.getPhone() != null) person.setPhone(request.getPhone());
        if (request.getNationalPlayerStatus() != null) person.setNationalPlayerStatus(request.getNationalPlayerStatus());

        if (request.getIsStaff() != null) {
            person.setIsStaff(request.getIsStaff());
        }

        person = personRepository.save(person);

        if (dupCheck != null && dupCheck.hasMatches() && Boolean.TRUE.equals(request.getConfirmPossibleDuplicate())) {
            final Person personForAudit = person;
            final int matchCount = dupCheck.visibleMatches().size();
            final int otherOrgMatches = dupCheck.otherOrganisationMatches();
            final HttpServletRequest currentRequest = requestProvider.getIfAvailable();
            if (TransactionSynchronizationManager.isSynchronizationActive()) {
                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        auditLogger.logPersonPossibleDuplicateOverride(personForAudit, matchCount, otherOrgMatches, currentRequest);
                    }
                });
            } else {
                auditLogger.logPersonPossibleDuplicateOverride(personForAudit, matchCount, otherOrgMatches, currentRequest);
            }
        }

        // Handle Player Toggle
        if (request.getIsPlayer() != null) {
            Optional<Player> existingPlayer = playerRepository.findByPersonId(person.getId());
            if (request.getIsPlayer() && (existingPlayer.isEmpty() || Boolean.TRUE.equals(existingPlayer.get().getDeleted()))) {
                if (existingPlayer.isEmpty()) {
                    playerRepository.save(Player.builder()
                            .person(person)
                            .status("ACTIVE")
                            .deleted(false)
                            .build());
                } else {
                    Player p = existingPlayer.get();
                    p.setDeleted(false);
                    p.setDeletedAt(null);
                    playerRepository.save(p);
                }
            } else if (!request.getIsPlayer() && existingPlayer.isPresent()) {
                Player p = existingPlayer.get();
                p.setDeleted(true);
                p.setDeletedAt(java.time.LocalDateTime.now());
                playerRepository.save(p);
            }
        }

        // Handle Official Toggle
        if (request.getIsOfficial() != null) {
            Optional<OfficialRegistry> existingOfficial = officialRegistryRepository.findByPersonId(person.getId());
            if (request.getIsOfficial() && existingOfficial.isEmpty()) {
                Organisation personOrg = organisationPersonRepository.findByPersonId(person.getId()).stream()
                        .map(OrganisationPerson::getOrganisation)
                        .findFirst()
                        .orElse(null);
                officialRegistryRepository.save(OfficialRegistry.builder()
                        .person(person)
                        .organisation(personOrg)
                        .accreditationLevel("PENDING")
                        .primaryRole("TBA")
                        .badgeNumber("TBA")
                        .isActive(true)
                        .build());
            } else if (!request.getIsOfficial() && existingOfficial.isPresent()) {
                OfficialRegistry o = existingOfficial.get();
                o.setActive(false);
                officialRegistryRepository.save(o);
            } else if (request.getIsOfficial() && existingOfficial.isPresent() && !existingOfficial.get().isActive()) {
                OfficialRegistry o = existingOfficial.get();
                o.setActive(true);
                officialRegistryRepository.save(o);
            }
        }

        if (verificationReset) {
            final Person personForAudit = person;
            final HttpServletRequest currentRequest = requestProvider.getIfAvailable();
            if (TransactionSynchronizationManager.isSynchronizationActive()) {
                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        auditLogger.logRecordVerificationReset(personForAudit, currentRequest);
                    }
                });
            } else {
                auditLogger.logRecordVerificationReset(personForAudit, currentRequest);
            }
        }

        return getPersonById(id);
    }

    @Override
    @Transactional
    @SuppressWarnings("null")
    public void deletePerson(UUID id) {
        Person person = personRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Person not found"));

        if (!accessScopeService.isPersonInScope(person.getId())) {
            UUID currentUserId = accessScopeService.getCurrentUserId();
            log.warn("Access denied for person record outside accessible organisation scope: userId={}, personId={}",
                    currentUserId, person.getId());
            throw new EntityNotFoundException("Person not found");
        }

        // Check if assigned to any active/past tournaments
        if (tournamentPlayerRepository.existsByPlayerPersonId(id) ||
            tournamentStaffRepository.existsByPersonId(id) ||
            tournamentOfficialRepository.existsByOfficialPersonId(id)) {
            throw new IllegalArgumentException("Cannot delete person because they are assigned to one or more tournaments. Please remove their tournament assignments first.");
        }

        // Validate preventing deletion if heavily linked (fallback logic)
        if (!playerRepository.findByPersonId(id).isEmpty() ||
            !teamStaffRepository.findByPersonId(id).isEmpty() ||
            officialRegistryRepository.findByPersonId(id).isPresent()) {
            throw new IllegalArgumentException("Cannot delete person because they are actively associated with a Player, Staff, or Official record. Please remove their roles first.");
        }

        List<OrganisationPerson> ops = organisationPersonRepository.findByPersonId(person.getId());
        organisationPersonRepository.deleteAll(ops);

        personRepository.delete(person);
    }

    private PersonResponseDTO mapToResponseDTO(Person p, Set<UUID> playerIds, Set<UUID> staffIds, Set<UUID> officialIds, Set<UUID> wrStaffIds, Set<UUID> wrOfficialIds, Map<UUID, String> nationalLogos, Set<UUID> tournamentStaffIds) {
        List<String> roles = new ArrayList<>();
        UUID pid = p.getId();
        
        // A person is a player if they exist in the Player registry OR have an active National Player Status
        boolean isPlayer = playerIds.contains(pid) || (p.getNationalPlayerStatus() != null && !"NONE".equalsIgnoreCase(p.getNationalPlayerStatus()));
        
        // A person is staff if they have the isStaff flag OR exist in TeamStaff or TournamentStaff registries
        boolean isStaff = Boolean.TRUE.equals(p.getIsStaff()) || staffIds.contains(pid) || tournamentStaffIds.contains(pid);
        
        // A person is an official if they exist in the OfficialRegistry
        boolean isOfficial = officialIds.contains(pid);
        
        if (isPlayer) roles.add("Player");
        if (isStaff) roles.add("Staff");
        if (isOfficial) roles.add("Official");

        boolean isWR = wrStaffIds.contains(pid) || wrOfficialIds.contains(pid);

        RecordVerificationSummary recordVerification = p.getRecordVerificationStatus() != null
                ? new RecordVerificationSummary(
                        p.getRecordVerificationStatus(),
                        p.getRecordVerifiedAt(),
                        p.getRecordVerifiedByName(),
                        p.getRecordVerificationMethod())
                : null;

        return PersonResponseDTO.builder()
                .id(pid.toString())
                .registrationNo(p.getRegistrationNo())
                .firstName(p.getFirstName())
                .lastName(p.getLastName())
                .dob(p.getDob())
                .gender(p.getGender())
                .nationality(p.getNationality())
                .email(p.getEmail())
                .phone(p.getPhone())
                .registeredAt(p.getCreatedAt() != null ? p.getCreatedAt().toString() : null)
                .nationalPlayerStatus(p.getNationalPlayerStatus())
                .nationalOrganisationLogoUrl(nationalLogos.get(pid))
                .roles(roles)
                .userId(p.getUserId() != null ? p.getUserId().toString() : null)
                .isPlayer(isPlayer)
                .isStaff(isStaff)
                .isOfficial(isOfficial)
                .isWorldRugbyCertified(isWR)
                .recordVerification(recordVerification)
                .build();
    }


    @Override
    @Transactional(readOnly = true)
    public List<com.athleticaos.backend.dtos.user.UserResponse> getUnlinkedUsers(UUID organisationId) {
        List<com.athleticaos.backend.entities.User> orgUsers = userRepository.findByOrganisationId(organisationId);
        
        List<UUID> linkedUserIds = personRepository.findAll().stream()
                .map(p -> p.getUserId())
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toList());

        return orgUsers.stream()
                .filter(u -> !linkedUserIds.contains(u.getId()))
                .map(this::mapToUserResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<com.athleticaos.backend.dtos.user.UserResponse> getUnlinkedUsersInScope(UUID organisationId) {
        if (!accessScopeService.isOrganisationInScope(organisationId)) {
            UUID currentUserId = accessScopeService.getCurrentUserId();
            log.warn("Access denied for unlinked users outside accessible organisation scope: userId={}, organisationId={}",
                    currentUserId, organisationId);
            return Collections.emptyList();
        }
        return getUnlinkedUsers(organisationId);
    }

    @Override
    @Transactional
    public PersonResponseDTO linkToUser(UUID personId, UUID userId) {
        if (personId == null || userId == null) {
            throw new IllegalArgumentException("Person ID and User ID must not be null");
        }
        Person person = personRepository.findById(personId)
                .orElseThrow(() -> new EntityNotFoundException("Person not found"));

        if (!accessScopeService.isPersonInScope(person.getId())) {
            UUID currentUserId = accessScopeService.getCurrentUserId();
            log.warn("Access denied for person record outside accessible organisation scope: userId={}, personId={}",
                    currentUserId, person.getId());
            throw new EntityNotFoundException("Person not found");
        }
        
        com.athleticaos.backend.entities.User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        if (!accessScopeService.isUserInScope(user)) {
            UUID currentUserId = accessScopeService.getCurrentUserId();
            log.warn("Access denied for user record outside accessible organisation scope: currentUserId={}, targetUserId={}",
                    currentUserId, user.getId());
            throw new EntityNotFoundException("User not found");
        }

        if (personRepository.existsByUserId(user.getId())) {
             throw new IllegalArgumentException("This user is already linked to another person record.");
        }

        person.setUserId(userId);
        person = personRepository.save(person);
        return getPersonById(person.getId());
    }

    private com.athleticaos.backend.dtos.user.UserResponse mapToUserResponse(com.athleticaos.backend.entities.User u) {
        return com.athleticaos.backend.dtos.user.UserResponse.builder()
                .id(u.getId())
                .firstName(u.getFirstName())
                .lastName(u.getLastName())
                .email(u.getEmail())
                .build();
    }
}
