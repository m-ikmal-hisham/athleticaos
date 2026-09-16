package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.person.PossibleDuplicateCheck;

import java.time.LocalDate;
import java.util.UUID;

public interface PersonDuplicateService {

    PossibleDuplicateCheck check(String firstName, String lastName, LocalDate dob, String canonicalGender, UUID excludePersonId);
}
