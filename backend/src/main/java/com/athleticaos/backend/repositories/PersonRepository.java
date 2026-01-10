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

    @org.springframework.data.jpa.repository.Query("SELECT CASE WHEN COUNT(p) > 0 THEN true ELSE false END FROM Person p WHERE p.icOrPassport = :icOrPassport")
    boolean existsByIcOrPassport(@org.springframework.data.repository.query.Param("icOrPassport") String icOrPassport);

    @org.springframework.data.jpa.repository.Query("SELECT p FROM Person p WHERE p.icOrPassport = :icOrPassport")
    Optional<Person> findByIcOrPassport(
            @org.springframework.data.repository.query.Param("icOrPassport") String icOrPassport);
}
