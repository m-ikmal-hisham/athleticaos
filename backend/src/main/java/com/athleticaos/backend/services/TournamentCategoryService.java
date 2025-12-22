package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.tournament.CreateCategoryRequest;
import com.athleticaos.backend.dtos.tournament.TournamentCategoryDTO;

import java.util.List;
import java.util.UUID;

public interface TournamentCategoryService {
    TournamentCategoryDTO createCategory(UUID tournamentId, CreateCategoryRequest request);

    List<TournamentCategoryDTO> getCategoriesByTournament(UUID tournamentId);

    void deleteCategory(UUID categoryId);

    TournamentCategoryDTO updateCategory(UUID categoryId, CreateCategoryRequest request);
}
