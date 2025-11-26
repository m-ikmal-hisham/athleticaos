package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.system.ThemeConfigResponse;
import com.athleticaos.backend.dtos.system.ThemeConfigUpdateRequest;
import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.entities.ThemeConfig;
import com.athleticaos.backend.repositories.OrganisationRepository;
import com.athleticaos.backend.repositories.ThemeConfigRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ThemeService {

    private final ThemeConfigRepository themeConfigRepository;
    private final OrganisationRepository organisationRepository;

    public ThemeConfigResponse getThemeByOrganisationId(UUID orgId) {
        // Find existing or return default/null
        return themeConfigRepository.findAll().stream()
                .filter(t -> t.getOrganisation().getId().equals(orgId))
                .findFirst()
                .map(this::mapToResponse)
                .orElse(null);
    }

    @Transactional
    @SuppressWarnings("null")
    public ThemeConfigResponse updateTheme(ThemeConfigUpdateRequest request) {
        Organisation org = organisationRepository.findById(request.getOrganisationId())
                .orElseThrow(() -> new EntityNotFoundException("Organisation not found"));

        ThemeConfig theme = themeConfigRepository.findAll().stream()
                .filter(t -> t.getOrganisation().getId().equals(request.getOrganisationId()))
                .findFirst()
                .orElse(ThemeConfig.builder().organisation(org).build());

        theme.setPrimaryColor(request.getPrimaryColor());
        theme.setSecondaryColor(request.getSecondaryColor());
        theme.setLogoUrl(request.getLogoUrl());

        return mapToResponse(themeConfigRepository.save(theme));
    }

    private ThemeConfigResponse mapToResponse(ThemeConfig theme) {
        return ThemeConfigResponse.builder()
                .id(theme.getId())
                .organisationId(theme.getOrganisation().getId())
                .primaryColor(theme.getPrimaryColor())
                .secondaryColor(theme.getSecondaryColor())
                .logoUrl(theme.getLogoUrl())
                .build();
    }
}
