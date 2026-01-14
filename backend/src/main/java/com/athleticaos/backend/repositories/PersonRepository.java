package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.Person;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PersonRepository extends JpaRepository<Person, UUID> {
        Optional<Person> findByEmail(String email);

        boolean existsByEmail(String email);

        @org.springframework.data.jpa.repository.Query("SELECT p FROM Person p WHERE TRIM(UPPER(p.icOrPassport)) = TRIM(UPPER(:icOrPassport))")
        java.util.List<Person> findAllByIcOrPassportNormalized(
                        @org.springframework.data.repository.query.Param("icOrPassport") String icOrPassport);

        // Strict check for duplicate IC/Passport (expects normalized input)
        // Uses REPLACE to handle legacy data that might contain hyphens or spaces
        @org.springframework.data.jpa.repository.Query("SELECT CASE WHEN COUNT(p) > 0 THEN true ELSE false END FROM Person p WHERE REPLACE(REPLACE(UPPER(p.icOrPassport), '-', ''), ' ', '') = :icOrPassport")
        boolean existsByIcOrPassport(
                        @org.springframework.data.repository.query.Param("icOrPassport") String icOrPassport);

        // Strict check for duplicate IC/Passport excluding specific ID (for updates)
        @org.springframework.data.jpa.repository.Query("SELECT CASE WHEN COUNT(p) > 0 THEN true ELSE false END FROM Person p WHERE REPLACE(REPLACE(UPPER(p.icOrPassport), '-', ''), ' ', '') = :icOrPassport AND p.id <> :id")
        boolean existsByIcOrPassportAndIdNot(
                        @org.springframework.data.repository.query.Param("icOrPassport") String icOrPassport,
                        @org.springframework.data.repository.query.Param("id") UUID id);
}
