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
import com.athleticaos.backend.services.PersonService;
import com.athleticaos.backend.services.OrganisationService;
import com.athleticaos.backend.services.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

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

    @Override
    @Transactional(readOnly = true)
    public List<PersonResponseDTO> getPersonsByOrganisation(UUID organisationId) {
        log.info("Fetching hierarchical persons for organisation: {}", organisationId);

        Set<UUID> accessibleIds = userService.getAccessibleOrgIdsForCurrentUser();
        List<Person> personsToMap;

        if (accessibleIds == null) {
            // Super Admin -> fetch everyone
            personsToMap = personRepository.findAll();
        } else {
            // Normal Admin -> fetch their org hierarchy
            Set<UUID> orgIds = organisationService.getAllDescendantIds(organisationId);

            // Retain only IDs they have access to
            if (!orgIds.isEmpty() && !accessibleIds.isEmpty()) {
                orgIds.retainAll(accessibleIds);
            }

            if (orgIds.isEmpty()) {
                personsToMap = new ArrayList<>();
            } else {
                personsToMap = organisationPersonRepository.findAllByOrganisationIdIn(orgIds).stream()
                        .map(OrganisationPerson::getPerson)
                        .distinct()
                        .collect(Collectors.toList());
            }
        }

        if (personsToMap.isEmpty()) {
            return new ArrayList<>();
        }

        List<UUID> personIds = personsToMap.stream().map(Person::getId).collect(Collectors.toList());

        // 1. Batch fetch National Logos to eliminate N+1
        Map<UUID, String> nationalLogos = prefetchNationalLogos(personIds);

        // 2. Batch fetch Roles for only the target persons to improve performance
        Set<UUID> playerPersonIds = playerRepository.findAllPersonIdsIn(personIds);
        Set<UUID> staffPersonIds = teamStaffRepository.findAllPersonIdsIn(personIds);
        Set<UUID> officialPersonIds = officialRegistryRepository.findAllPersonIdsIn(personIds);
        Set<UUID> wrStaffPersonIds = teamStaffRepository.findAllWorldRugbyCertifiedPersonIdsIn(personIds);
        Set<UUID> wrOfficialPersonIds = officialRegistryRepository.findAllWorldRugbyCertifiedPersonIdsIn(personIds);
        Set<UUID> tournamentStaffPersonIds = tournamentStaffRepository.findAllPersonIdsIn(personIds);

        return personsToMap.stream()
                .map(p -> mapToResponseDTO(p, playerPersonIds, staffPersonIds, officialPersonIds, wrStaffPersonIds, wrOfficialPersonIds, nationalLogos, tournamentStaffPersonIds))
                .collect(Collectors.toList());
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
    @Transactional
    @SuppressWarnings("null")
    public PersonResponseDTO createPerson(UUID organisationId, CreatePersonRequest request) {
        Organisation org = organisationRepository.findById(organisationId)
                .orElseThrow(() -> new EntityNotFoundException("Organisation not found"));

        if (request.getIcOrPassport() != null && !request.getIcOrPassport().trim().isEmpty()) {
            String normalizedIc = request.getIcOrPassport().trim().toUpperCase().replaceAll("[^A-Z0-9]", "");
            if (personRepository.existsByIcOrPassport(normalizedIc)) {
                throw new IllegalArgumentException("IC or Passport already exists in the system.");
            }
        }

        Person person = new Person();
        person.setFirstName(request.getFirstName());
        person.setLastName(request.getLastName());
        person.setIcOrPassport(request.getIcOrPassport() != null ? request.getIcOrPassport().trim().toUpperCase().replaceAll("[^A-Z0-9]", "") : null);
        person.setDob(request.getDob());
        person.setGender(request.getGender());
        person.setNationality(request.getNationality());
        person.setEmail(request.getEmail());
        person.setPhone(request.getPhone());
        person.setNationalPlayerStatus(request.getNationalPlayerStatus());
        person.setIsStaff(Boolean.TRUE.equals(request.getIsStaff()));

        person = personRepository.save(person);

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

        String normalizedIc = null;
        if (request.getIcOrPassport() != null) {
            normalizedIc = request.getIcOrPassport().trim().toUpperCase().replaceAll("[^A-Z0-9]", "");
            if (!normalizedIc.equals(person.getIcOrPassport()) && personRepository.existsByIcOrPassport(normalizedIc)) {
                throw new IllegalArgumentException("IC or Passport already exists in the system.");
            }
        }

        person.setFirstName(request.getFirstName());
        person.setLastName(request.getLastName());
        person.setIcOrPassport(normalizedIc);
        person.setDob(request.getDob());
        person.setGender(request.getGender());
        person.setNationality(request.getNationality());
        person.setEmail(request.getEmail());
        person.setPhone(request.getPhone());
        person.setNationalPlayerStatus(request.getNationalPlayerStatus());
        
        if (request.getIsStaff() != null) {
            person.setIsStaff(request.getIsStaff());
        }

        person = personRepository.save(person);

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

        return getPersonById(id);
    }

    @Override
    @Transactional
    @SuppressWarnings("null")
    public void deletePerson(UUID id) {
        Person person = personRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Person not found"));

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

        return PersonResponseDTO.builder()
                .id(pid.toString())
                .firstName(p.getFirstName())
                .lastName(p.getLastName())
                .icOrPassport(p.getIcOrPassport())
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
                .build();
    }


    @Override
    @Transactional(readOnly = true)
    public List<com.athleticaos.backend.dtos.user.UserResponse> getUnlinkedUsers(UUID organisationId) {
        List<com.athleticaos.backend.entities.User> orgUsers = userRepository.findByOrganisationId(organisationId);
        
        List<UUID> linkedUserIds = personRepository.findAll().stream()
                .map(Person::getUserId)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toList());

        return orgUsers.stream()
                .filter(u -> !linkedUserIds.contains(u.getId()))
                .map(this::mapToUserResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public PersonResponseDTO linkToUser(UUID personId, UUID userId) {
        if (personId == null || userId == null) {
            throw new IllegalArgumentException("Person ID and User ID must not be null");
        }
        Person person = personRepository.findById(personId)
                .orElseThrow(() -> new EntityNotFoundException("Person not found"));
        
        com.athleticaos.backend.entities.User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

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
