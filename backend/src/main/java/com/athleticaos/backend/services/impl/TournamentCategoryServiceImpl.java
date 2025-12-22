package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.tournament.CreateCategoryRequest;
import com.athleticaos.backend.dtos.tournament.TournamentCategoryDTO;
import com.athleticaos.backend.entities.Tournament;
import com.athleticaos.backend.entities.TournamentCategory;
import com.athleticaos.backend.repositories.TournamentCategoryRepository;
import com.athleticaos.backend.repositories.TournamentRepository;
import com.athleticaos.backend.services.TournamentCategoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TournamentCategoryServiceImpl implements TournamentCategoryService {

    private final TournamentCategoryRepository categoryRepository;
    private final TournamentRepository tournamentRepository;

    @Override
    @Transactional
    @SuppressWarnings("null")
    public TournamentCategoryDTO createCategory(UUID tournamentId, CreateCategoryRequest request) {
        Tournament tournament = tournamentRepository.findById(tournamentId)
                .orElseThrow(() -> new RuntimeException("Tournament not found"));

        TournamentCategory category = TournamentCategory.builder()
                .tournament(tournament)
                .name(request.getName())
                .description(request.getDescription())
                .gender(request.getGender())
                .minAge(request.getMinAge())
                .maxAge(request.getMaxAge())
                .build();

        category = categoryRepository.save(category);
        return mapToDTO(category);
    }

    @Override
    public List<TournamentCategoryDTO> getCategoriesByTournament(UUID tournamentId) {
        return categoryRepository.findByTournamentId(tournamentId).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    @SuppressWarnings("null")
    public void deleteCategory(UUID categoryId) {
        categoryRepository.deleteById(categoryId);
    }

    @Override
    @Transactional
    @SuppressWarnings("null")
    public TournamentCategoryDTO updateCategory(UUID categoryId, CreateCategoryRequest request) {
        TournamentCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new RuntimeException("Category not found"));

        category.setName(request.getName());
        category.setDescription(request.getDescription());
        category.setGender(request.getGender());
        category.setMinAge(request.getMinAge());
        category.setMaxAge(request.getMaxAge());

        category = categoryRepository.save(category);
        return mapToDTO(category);
    }

    private TournamentCategoryDTO mapToDTO(TournamentCategory category) {
        return TournamentCategoryDTO.builder()
                .id(category.getId())
                .tournamentId(category.getTournament().getId())
                .name(category.getName())
                .description(category.getDescription())
                .gender(category.getGender())
                .minAge(category.getMinAge())
                .maxAge(category.getMaxAge())
                .build();
    }
}
