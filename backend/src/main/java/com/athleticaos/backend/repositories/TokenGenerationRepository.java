package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.TokenGeneration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TokenGenerationRepository extends JpaRepository<TokenGeneration, Long> {
}
