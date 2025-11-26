package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.UserOrganisation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserOrganisationRepository
        extends JpaRepository<UserOrganisation, UserOrganisation.UserOrganisationId> {
}
