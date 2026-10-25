package com.athleticaos.backend.dtos.public_api;

import com.athleticaos.backend.enums.OrganisationLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PublicOrganisationTreeResponse {

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class OrganisationNode {
        private UUID id;
        private String slug;
        private String name;
        private OrganisationLevel level;
        private String state;
        private String logoUrl;
        private String primaryColor;
        private String secondaryColor;
        private UUID parentId;
        private int teamCount;
        private int childCount;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class TeamNode {
        private UUID id;
        private String slug;
        private String name;
        private UUID organisationId;
        private String category;
        private String ageGroup;
        private String division;
        private int playerCount;
        private String logoUrl;
    }

    private List<OrganisationNode> organisations;
    private List<TeamNode> teams;
}
