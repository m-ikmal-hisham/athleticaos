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

        // Search covers name, email, and registration number.
        @Query("SELECT p FROM Person p WHERE " +
               "LOWER(p.firstName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
               "LOWER(p.lastName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
               "LOWER(p.email) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
               "LOWER(p.registrationNo) LIKE LOWER(CONCAT(:search, '%'))")
        Page<Person> searchAllPersons(@Param("search") String search, Pageable pageable);

        @Query("SELECT p FROM Person p WHERE (p.email IS NULL OR TRIM(p.email) = '' OR LOWER(p.email) LIKE '%@placeholder.invalid')")
        Page<Person> findPersonsWithMissingEmail(Pageable pageable);

        @Query("SELECT p FROM Person p WHERE (p.email IS NULL OR TRIM(p.email) = '' OR LOWER(p.email) LIKE '%@placeholder.invalid') AND (" +
               "LOWER(p.firstName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
               "LOWER(p.lastName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
               "LOWER(p.registrationNo) LIKE LOWER(CONCAT(:search, '%')))")
        Page<Person> searchPersonsWithMissingEmail(@Param("search") String search, Pageable pageable);

        @Query("SELECT p FROM Person p WHERE " +
               "LOWER(TRIM(p.firstName)) = LOWER(TRIM(:firstName)) AND " +
               "LOWER(TRIM(p.lastName)) = LOWER(TRIM(:lastName)) AND " +
               "p.dob = :dob AND " +
               "p.gender = :gender")
        java.util.List<Person> findPossibleDuplicates(
                @Param("firstName") String firstName,
                @Param("lastName") String lastName,
                @Param("dob") java.time.LocalDate dob,
                @Param("gender") String gender,
                Pageable pageable);

        @Query("SELECT p FROM Person p WHERE " +
               "LOWER(TRIM(p.firstName)) = LOWER(TRIM(:firstName)) AND " +
               "LOWER(TRIM(p.lastName)) = LOWER(TRIM(:lastName)) AND " +
               "p.dob = :dob AND " +
               "p.gender = :gender AND " +
               "p.id <> :excludePersonId")
        java.util.List<Person> findPossibleDuplicatesExcludingId(
                @Param("firstName") String firstName,
                @Param("lastName") String lastName,
                @Param("dob") java.time.LocalDate dob,
                @Param("gender") String gender,
                @Param("excludePersonId") UUID excludePersonId,
                Pageable pageable);
        @Query("SELECT p FROM Person p WHERE (p.email IS NULL OR TRIM(p.email) = '') " +
               "AND p.registrationNo IS NOT NULL ORDER BY p.id ASC")
        Page<Person> findPersonsNeedingPlaceholderEmail(Pageable pageable);

        @Query("SELECT COUNT(p) FROM Person p WHERE (p.email IS NULL OR TRIM(p.email) = '') " +
               "AND p.registrationNo IS NOT NULL")
        long countPersonsNeedingPlaceholderEmail();

        Optional<Person> findByEmail(String email);

        boolean existsByEmail(String email);
        boolean existsByEmailIgnoreCase(String email);

        boolean existsByEmailAndIdNot(String email, UUID id);
        boolean existsByEmailIgnoreCaseAndIdNot(String email, UUID id);

        boolean existsByUserId(UUID userId);
}
