package com.athleticaos.backend.dtos.public_api;

import com.athleticaos.backend.enums.OrganisationLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PublicOrganisationDetailResponse {
    private UUID id;
    private String slug;
    private String name;
    private OrganisationLevel level;
    private String state;
    private String logoUrl;
    private String coverImageUrl;
    private String primaryColor;
    private String secondaryColor;
    private String accentColor;

    private List<PublicOrganisationRef> parentChain;
    private List<ChildOrganisation> children;
    private List<PublicOrganisationTreeResponse.TeamNode> teams;
    private List<TournamentItem> tournaments;
    private Counts counts;

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class ChildOrganisation {
        private UUID id;
        private String slug;
        private String name;
        private OrganisationLevel level;
        private String logoUrl;
        private String primaryColor;
        private String secondaryColor;
        private int teamCount;
        private int childCount;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class TournamentItem {
        private UUID id;
        private String slug;
        private String name;
        private String status;
        private LocalDate startDate;
        private LocalDate endDate;
        private String logoUrl;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Counts {
        private int affiliatedOrganisations;
        private int teams;
        private int players;
        private int tournaments;
    }
}
