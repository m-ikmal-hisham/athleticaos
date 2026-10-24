package com.athleticaos.backend.dtos.public_api;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class PublicMatchFeedItemResponse extends PublicMatchSummaryResponse {
    private UUID tournamentId;
    private String tournamentName;
    private String tournamentSlug;
    private String tournamentLogoUrl;
    private String tournamentStatus;
    private String categoryName;
    private String homeTeamSlug;
    private String awayTeamSlug;
    private String livestreamUrl;
    private LocalDateTime updatedAt;
}
