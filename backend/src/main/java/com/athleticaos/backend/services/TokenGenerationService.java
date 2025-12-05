package com.athleticaos.backend.services;

import com.athleticaos.backend.entities.TokenGeneration;
import com.athleticaos.backend.repositories.TokenGenerationRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class TokenGenerationService {

    private final TokenGenerationRepository tokenGenerationRepository;
    private Long currentGeneration;

    @PostConstruct
    @Transactional
    public void incrementGenerationOnStartup() {
        log.info("Incrementing token generation on server startup...");

        TokenGeneration tokenGen = tokenGenerationRepository.findById(1L)
                .orElse(TokenGeneration.builder()
                        .id(1L)
                        .generation(0L)
                        .build());

        tokenGen.setGeneration(tokenGen.getGeneration() + 1);
        tokenGen = tokenGenerationRepository.save(tokenGen);

        currentGeneration = tokenGen.getGeneration();
        log.info("Token generation incremented to: {}", currentGeneration);
    }

    public Long getCurrentGeneration() {
        if (currentGeneration == null) {
            currentGeneration = tokenGenerationRepository.findById(1L)
                    .map(TokenGeneration::getGeneration)
                    .orElse(1L);
        }
        return currentGeneration;
    }
}
