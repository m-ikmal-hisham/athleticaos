package com.athleticaos.backend.config;

import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.enums.OrganisationLevel;
import com.athleticaos.backend.repositories.OrganisationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.CommandLineRunner;

import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class OrganisationSeedConfigTest {

    @Mock
    private OrganisationRepository organisationRepository;

    @InjectMocks
    private OrganisationSeedConfig organisationSeedConfig;

    @Test
    void seedOrganisations_buildsOrganisationsWithNonNullUniqueSlugs() throws Exception {
        when(organisationRepository.findByOrgLevel(OrganisationLevel.COUNTRY)).thenReturn(Collections.emptyList());
        when(organisationRepository.save(any(Organisation.class))).thenAnswer(inv -> {
            Organisation org = inv.getArgument(0);
            if (org.getId() == null) {
                org.setId(UUID.randomUUID());
            }
            return org;
        });

        CommandLineRunner runner = organisationSeedConfig.seedOrganisations();
        runner.run();

        ArgumentCaptor<Organisation> captor = ArgumentCaptor.forClass(Organisation.class);
        verify(organisationRepository, atLeast(21)).save(captor.capture());

        List<Organisation> savedOrgs = captor.getAllValues();
        assertThat(savedOrgs).isNotEmpty();

        Set<String> seenSlugs = new HashSet<>();
        for (Organisation org : savedOrgs) {
            assertThat(org.getSlug())
                    .as("Slug for %s must not be null or blank", org.getName())
                    .isNotNull()
                    .isNotBlank();

            assertThat(seenSlugs.add(org.getSlug()))
                    .as("Slug '%s' for %s must be unique among seeded organisations", org.getSlug(), org.getName())
                    .isTrue();
        }

        // Specifically check known organisations
        assertThat(seenSlugs).contains(
                "malaysia",
                "sarawak",
                "mukah-division",
                "mukah-district",
                "mukah-rugby-club",
                "smk-mukah-rugby"
        );
    }

    @Test
    void generateUniqueSlug_whenNameIsSymbolsOnly_fallsBackToOrgAndIdPrefix() {
        Set<String> usedSlugs = new HashSet<>();
        UUID orgId = UUID.fromString("98765432-aaaa-bbbb-cccc-ddddeeeeffff");

        // 1. With ID and not yet in repository or set
        when(organisationRepository.findBySlug("org-98765432")).thenReturn(Optional.empty());
        String slug1 = organisationSeedConfig.generateUniqueSlug("$$$%%%", orgId, usedSlugs);
        assertThat(slug1).isEqualTo("org-98765432");
        assertThat(usedSlugs).contains("org-98765432");

        // 2. With ID but slug already used in set -> gets counter suffix
        String slug2 = organisationSeedConfig.generateUniqueSlug("$$$%%%", orgId, usedSlugs);
        assertThat(slug2).isEqualTo("org-98765432-1");
        assertThat(usedSlugs).contains("org-98765432-1");

        // 3. Without ID and not in set
        when(organisationRepository.findBySlug("org")).thenReturn(Optional.empty());
        String slug3 = organisationSeedConfig.generateUniqueSlug("***", null, usedSlugs);
        assertThat(slug3).isEqualTo("org");
        assertThat(usedSlugs).contains("org");

        // 4. Without ID and already in set -> gets counter suffix
        String slug4 = organisationSeedConfig.generateUniqueSlug("***", null, usedSlugs);
        assertThat(slug4).isEqualTo("org-1");
        assertThat(usedSlugs).contains("org-1");
    }
}
