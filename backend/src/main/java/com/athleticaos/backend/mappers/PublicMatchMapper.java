package com.athleticaos.backend.mappers;

import com.athleticaos.backend.dtos.match.MatchResponse;
import com.athleticaos.backend.dtos.public_api.PublicMatchFeedItemResponse;
import com.athleticaos.backend.dtos.public_api.PublicMatchSummaryResponse;
import com.athleticaos.backend.entities.Match;
import com.athleticaos.backend.entities.TournamentStage;
import com.athleticaos.backend.utils.URLUtils;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;

@Component
public class PublicMatchMapper {

    /**
     * Maps a MatchResponse to PublicMatchSummaryResponse for tournament-specific endpoints.
     * Retains exact backwards compatibility byte-for-byte with existing responses.
     */
    public PublicMatchSummaryResponse mapToPublicMatchSummary(
            MatchResponse m,
            Map<UUID, TournamentStage> stageMap) {
        String stageName = m.getPhase(); // Default to phase (legacy)
        Integer stageDisplayOrder = null;
        if (m.getStage() != null && m.getStage().getName() != null) {
            stageName = m.getStage().getName();
            try {
                UUID stageId = UUID.fromString(m.getStage().getId());
                TournamentStage stageEntity = stageMap != null ? stageMap.get(stageId) : null;
                if (stageEntity != null) {
                    stageDisplayOrder = stageEntity.getDisplayOrder();
                }
            } catch (Exception ignored) {
                // If stage ID is not valid, skip display order
            }
        }

        return PublicMatchSummaryResponse.builder()
                .id(m.getId())
                .code(m.getMatchCode())
                .homeTeamName(m.getHomeTeamName())
                .awayTeamName(m.getAwayTeamName())
                .homeTeamLogoUrl(URLUtils.makeAbsolute(m.getHomeTeamLogoUrl()))
                .awayTeamLogoUrl(URLUtils.makeAbsolute(m.getAwayTeamLogoUrl()))
                .homeTeamShortName(m.getHomeTeamShortName())
                .awayTeamShortName(m.getAwayTeamShortName())
                .homeScore(m.getHomeScore())
                .awayScore(m.getAwayScore())
                .matchDate(m.getMatchDate())
                .matchTime(m.getKickOffTime())
                .venueId(m.getVenueId())
                .venueName(m.getVenueName())
                .venue(m.getVenue())
                .status(m.getStatus())
                .resultType(m.getResultType())
                .stage(stageName)
                .stageType(m.getStage() != null ? m.getStage().getStageType() : null)
                .stageDisplayOrder(stageDisplayOrder)
                .matchNumber(m.getMatchNumber())
                .build();
    }

    /**
     * Maps a Match entity directly to a PublicMatchFeedItemResponse for the public matches feed.
     * Implements feed-only defaults (e.g. placeholder fallback to "TBD", tournament branding, slugs).
     */
    public PublicMatchFeedItemResponse toFeedItem(Match m) {
        String homeTeamName = null;
        String homeTeamSlug = null;
        String homeTeamShortName = null;
        String homeTeamLogo = null;
        if (m.getHomeTeam() != null) {
            homeTeamName = m.getHomeTeam().getName();
            homeTeamSlug = m.getHomeTeam().getSlug();
            homeTeamShortName = m.getHomeTeam().getShortName();
            homeTeamLogo = m.getHomeTeam().getLogoUrl();
            if (homeTeamLogo == null && m.getHomeTeam().getOrganisation() != null) {
                homeTeamLogo = m.getHomeTeam().getOrganisation().getLogoUrl();
            }
        } else {
            homeTeamName = m.getHomeTeamPlaceholder() != null && !m.getHomeTeamPlaceholder().isBlank()
                    ? m.getHomeTeamPlaceholder()
                    : "TBD";
        }

        String awayTeamName = null;
        String awayTeamSlug = null;
        String awayTeamShortName = null;
        String awayTeamLogo = null;
        if (m.getAwayTeam() != null) {
            awayTeamName = m.getAwayTeam().getName();
            awayTeamSlug = m.getAwayTeam().getSlug();
            awayTeamShortName = m.getAwayTeam().getShortName();
            awayTeamLogo = m.getAwayTeam().getLogoUrl();
            if (awayTeamLogo == null && m.getAwayTeam().getOrganisation() != null) {
                awayTeamLogo = m.getAwayTeam().getOrganisation().getLogoUrl();
            }
        } else {
            awayTeamName = m.getAwayTeamPlaceholder() != null && !m.getAwayTeamPlaceholder().isBlank()
                    ? m.getAwayTeamPlaceholder()
                    : "TBD";
        }

        String stageName = m.getStage() != null ? m.getStage().getName() : m.getPhase();
        String stageType = m.getStage() != null && m.getStage().getStageType() != null
                ? m.getStage().getStageType().name()
                : null;
        Integer stageDisplayOrder = m.getStage() != null ? m.getStage().getDisplayOrder() : null;

        String categoryName = null;
        if (m.getCategory() != null) {
            categoryName = m.getCategory().getName();
        } else if (m.getStage() != null && m.getStage().getCategory() != null) {
            categoryName = m.getStage().getCategory().getName();
        }

        UUID tournamentId = null;
        String tournamentName = null;
        String tournamentSlug = null;
        String tournamentLogoUrl = null;
        String tournamentStatus = null;
        String livestreamUrl = m.getLivestreamUrl();

        if (m.getTournament() != null) {
            tournamentId = m.getTournament().getId();
            tournamentName = m.getTournament().getName();
            tournamentSlug = m.getTournament().getSlug();
            tournamentLogoUrl = URLUtils.makeAbsolute(m.getTournament().getLogoUrl());
            if (m.getTournament().getStatus() != null) {
                tournamentStatus = m.getTournament().getStatus().name();
            }
            if ((livestreamUrl == null || livestreamUrl.isBlank()) && m.getTournament().firstLivestreamUrl() != null) {
                livestreamUrl = m.getTournament().firstLivestreamUrl();
            }
        }

        return PublicMatchFeedItemResponse.builder()
                .id(m.getId())
                .code(m.getMatchCode())
                .homeTeamName(homeTeamName)
                .awayTeamName(awayTeamName)
                .homeTeamLogoUrl(URLUtils.makeAbsolute(homeTeamLogo))
                .awayTeamLogoUrl(URLUtils.makeAbsolute(awayTeamLogo))
                .homeTeamShortName(homeTeamShortName)
                .awayTeamShortName(awayTeamShortName)
                .homeScore(m.getHomeScore())
                .awayScore(m.getAwayScore())
                .matchDate(m.getMatchDate())
                .matchTime(m.getKickOffTime())
                .venueId(m.getVenueId())
                .venueName(m.getVenueName())
                .venue(m.getVenue())
                .status(m.getStatus() != null ? m.getStatus().name() : null)
                .resultType(m.getResultType() != null ? m.getResultType().name() : null)
                .stage(stageName)
                .stageType(stageType)
                .stageDisplayOrder(stageDisplayOrder)
                .matchNumber(m.getMatchNumber())
                .tournamentId(tournamentId)
                .tournamentName(tournamentName)
                .tournamentSlug(tournamentSlug)
                .tournamentLogoUrl(tournamentLogoUrl)
                .tournamentStatus(tournamentStatus)
                .categoryName(categoryName)
                .homeTeamSlug(homeTeamSlug)
                .awayTeamSlug(awayTeamSlug)
                .livestreamUrl(livestreamUrl)
                .updatedAt(m.getUpdatedAt())
                .build();
    }
}
