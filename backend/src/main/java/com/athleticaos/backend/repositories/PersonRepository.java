package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.Person;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PersonRepository extends JpaRepository<Person, UUID> {

        // Phase 1: IC/passport substring search removed to prevent PII exposure in search logs/results.
        // Search covers name and email only. IC duplicate-checking uses normalised exact-match methods below.
        @Query("SELECT p FROM Person p WHERE " +
               "LOWER(p.firstName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
               "LOWER(p.lastName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
               "LOWER(p.email) LIKE LOWER(CONCAT('%', :search, '%'))")
        Page<Person> searchAllPersons(@Param("search") String search, Pageable pageable);
        Optional<Person> findByEmail(String email);

        boolean existsByEmail(String email);


        // Strict check for duplicate IC/Passport (expects normalized input)
        // Low-1: Extended REPLACE chain matches IdentificationUtil.normalize() stripping
        // of all non-alphanumeric characters (hyphens, spaces, dots, slashes, underscores, parens, tabs).
        @Query("SELECT CASE WHEN COUNT(p) > 0 THEN true ELSE false END FROM Person p WHERE " +
               "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(" +
               "UPPER(p.icOrPassport), '-', ''), ' ', ''), '.', ''), '/', ''), '_', ''), '(', ''), ')', ''), '\t', '') = :icOrPassport")
        boolean existsByIcOrPassport(@Param("icOrPassport") String icOrPassport);

        // Strict check for duplicate IC/Passport excluding specific ID (for updates)
        @Query("SELECT CASE WHEN COUNT(p) > 0 THEN true ELSE false END FROM Person p WHERE " +
               "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(" +
               "UPPER(p.icOrPassport), '-', ''), ' ', ''), '.', ''), '/', ''), '_', ''), '(', ''), ')', ''), '\t', '') = :icOrPassport AND p.id <> :id")
        boolean existsByIcOrPassportAndIdNot(@Param("icOrPassport") String icOrPassport, @Param("id") UUID id);

        // Phase 2: HMAC identification hash methods
        Optional<Person> findByIdentificationHash(String identificationHash);

        boolean existsByIdentificationHash(String identificationHash);

        boolean existsByIdentificationHashAndIdNot(String identificationHash, UUID id);

        // Phase 2.1: Backfill queries — include records with either primary or secondary source
        @Query("SELECT p FROM Person p WHERE p.identificationHash IS NULL " +
               "AND (p.icOrPassport IS NOT NULL OR p.identificationValue IS NOT NULL) " +
               "ORDER BY p.id ASC")
        Page<Person> findUnhashedWithIdentificationOrderByIdAsc(Pageable pageable);

        @Query("SELECT p FROM Person p WHERE p.identificationHash IS NULL " +
               "AND (p.icOrPassport IS NOT NULL OR p.identificationValue IS NOT NULL) " +
               "AND p.id > :id ORDER BY p.id ASC")
        Page<Person> findUnhashedWithIdentificationAndIdGreaterThanOrderByIdAsc(@Param("id") UUID id, Pageable pageable);

        @Query("SELECT COUNT(p) FROM Person p WHERE p.identificationHash IS NOT NULL")
        long countWithIdentificationHash();

        @Query("SELECT COUNT(p) FROM Person p WHERE p.identificationHash IS NULL " +
               "AND (p.icOrPassport IS NOT NULL OR p.identificationValue IS NOT NULL)")
        long countUnprocessedWithIdentification();

        boolean existsByUserId(UUID userId);
}
