package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.person.PossibleDuplicateCheck;
import com.athleticaos.backend.dtos.person.PossibleDuplicateMatch;
import com.athleticaos.backend.entities.OrganisationPerson;
import com.athleticaos.backend.entities.Person;
import com.athleticaos.backend.repositories.OrganisationPersonRepository;
import com.athleticaos.backend.repositories.PersonRepository;
import com.athleticaos.backend.services.PersonDuplicateService;
import com.athleticaos.backend.services.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PersonDuplicateServiceImpl implements PersonDuplicateService {

    private final PersonRepository personRepository;
    private final OrganisationPersonRepository organisationPersonRepository;
    private final UserService userService;

    @Override
    @Transactional(readOnly = true)
    public PossibleDuplicateCheck check(String firstName, String lastName, LocalDate dob, String canonicalGender, UUID excludePersonId) {
        if (firstName == null || lastName == null || dob == null || canonicalGender == null) {
            return new PossibleDuplicateCheck(Collections.emptyList(), 0);
        }

        Pageable pageable = PageRequest.of(0, 20);
        List<Person> candidates;
        if (excludePersonId == null) {
            candidates = personRepository.findPossibleDuplicates(firstName.trim(), lastName.trim(), dob, canonicalGender, pageable);
        } else {
            candidates = personRepository.findPossibleDuplicatesExcludingId(firstName.trim(), lastName.trim(), dob, canonicalGender, excludePersonId, pageable);
        }

        if (candidates.isEmpty()) {
            return new PossibleDuplicateCheck(Collections.emptyList(), 0);
        }

        Set<UUID> accessibleOrgIds = userService.getAccessibleOrgIdsForCurrentUser();

        // Super admin: accessibleOrgIds is null -> all matches visible, at most 5 listed
        if (accessibleOrgIds == null) {
            List<PossibleDuplicateMatch> visible = new ArrayList<>();
            for (Person p : candidates) {
                if (visible.size() >= 5) break;
                if (p != null) {
                    visible.add(new PossibleDuplicateMatch(p.getRegistrationNo(), p.getFirstName(), p.getLastName()));
                }
            }
            return new PossibleDuplicateCheck(visible, 0);
        }

        // Non-super-admin: match is visible only if one of its OrganisationPerson rows is in accessible set.
        // Persons with no organisation link count as outside scope.
        Set<UUID> candidateIds = new HashSet<>();
        for (Person p : candidates) {
            if (p != null && p.getId() != null) {
                candidateIds.add(p.getId());
            }
        }
        List<OrganisationPerson> opList = organisationPersonRepository.findAllByPersonIdIn(candidateIds);

        Set<UUID> inScopePersonIds = new HashSet<>();
        for (OrganisationPerson op : opList) {
            if (op.getOrganisation() != null && op.getPerson() != null && accessibleOrgIds.contains(op.getOrganisation().getId())) {
                inScopePersonIds.add(op.getPerson().getId());
            }
        }

        List<PossibleDuplicateMatch> visibleMatches = new ArrayList<>();
        int otherOrganisationMatches = 0;

        for (Person p : candidates) {
            if (inScopePersonIds.contains(p.getId())) {
                if (visibleMatches.size() < 5) {
                    visibleMatches.add(new PossibleDuplicateMatch(p.getRegistrationNo(), p.getFirstName(), p.getLastName()));
                }
            } else {
                otherOrganisationMatches++;
            }
        }

        return new PossibleDuplicateCheck(visibleMatches, otherOrganisationMatches);
    }
}
