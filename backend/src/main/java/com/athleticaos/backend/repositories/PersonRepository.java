package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.Person;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PersonRepository extends JpaRepository<Person, UUID> {

        // Server-side search across name, IC/passport, and email
        @Query("SELECT p FROM Person p WHERE " +
               "LOWER(p.firstName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
               "LOWER(p.lastName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
               "LOWER(p.icOrPassport) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
               "LOWER(p.email) LIKE LOWER(CONCAT('%', :search, '%'))")
        Page<Person> searchAllPersons(@Param("search") String search, Pageable pageable);
        Optional<Person> findByEmail(String email);

        boolean existsByEmail(String email);

        @Query("SELECT p FROM Person p WHERE TRIM(UPPER(p.icOrPassport)) = TRIM(UPPER(:icOrPassport))")
        List<Person> findAllByIcOrPassportNormalized(@Param("icOrPassport") String icOrPassport);

        // Strict check for duplicate IC/Passport (expects normalized input)
        @Query("SELECT CASE WHEN COUNT(p) > 0 THEN true ELSE false END FROM Person p WHERE REPLACE(REPLACE(UPPER(p.icOrPassport), '-', ''), ' ', '') = :icOrPassport")
        boolean existsByIcOrPassport(@Param("icOrPassport") String icOrPassport);

        // Strict check for duplicate IC/Passport excluding specific ID (for updates)
        @Query("SELECT CASE WHEN COUNT(p) > 0 THEN true ELSE false END FROM Person p WHERE REPLACE(REPLACE(UPPER(p.icOrPassport), '-', ''), ' ', '') = :icOrPassport AND p.id <> :id")
        boolean existsByIcOrPassportAndIdNot(@Param("icOrPassport") String icOrPassport, @Param("id") UUID id);

        boolean existsByUserId(UUID userId);
}
