package com.athleticaos.backend.dtos.public_api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicTeamSummary {
    private UUID id;
    private String name;
    private String slug;
    private String shortName;
    private String logoUrl;
    /** Category the team is registered under, so the public site can filter by it the
     *  same way matches, standings and stats already do. Null for uncategorised teams. */
    private UUID categoryId;
    private String categoryName;
}
