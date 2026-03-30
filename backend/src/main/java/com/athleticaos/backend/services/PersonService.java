package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.person.PersonResponseDTO;
import com.athleticaos.backend.dtos.person.PersonUpdateRequest;

import java.util.List;
import java.util.UUID;

public interface PersonService {
    List<PersonResponseDTO> getPersonsByOrganisation(UUID organisationId);
    PersonResponseDTO getPersonById(UUID id);
    PersonResponseDTO createPerson(UUID organisationId, com.athleticaos.backend.dtos.person.CreatePersonRequest request);
    PersonResponseDTO updatePerson(UUID id, PersonUpdateRequest request);
    void deletePerson(UUID id);
    List<com.athleticaos.backend.dtos.user.UserResponse> getUnlinkedUsers(UUID organisationId);
    PersonResponseDTO linkToUser(UUID personId, UUID userId);
}
