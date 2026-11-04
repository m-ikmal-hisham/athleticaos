package com.athleticaos.backend.rules;

import com.athleticaos.backend.entities.Match;
import com.athleticaos.backend.entities.TournamentStage;
import com.athleticaos.backend.enums.TournamentStageType;

public final class MatchStageRules {

    private MatchStageRules() {
    }

    /**
     * Determines whether a match is a knockout match that must produce a winner if level.
     * Defined as:
     * - NOT a round robin (isRoundRobin false)
     * - NOT a group stage (isGroupStage false)
     * - AND (isKnockoutStage true OR stage type is not POOL OR the match has a next-match link)
     */
    public static boolean isKnockoutMatch(Match match) {
        if (match == null) {
            return false;
        }

        TournamentStage stage = match.getStage();
        boolean hasNextMatchLink = match.getNextMatchIdForWinner() != null
                || match.getNextMatchIdForLoser() != null;

        if (stage == null) {
            return hasNextMatchLink;
        }

        boolean isRoundRobin = Boolean.TRUE.equals(stage.getIsRoundRobin());
        boolean isGroupStage = Boolean.TRUE.equals(stage.getIsGroupStage());

        if (isRoundRobin || isGroupStage) {
            return false;
        }

        boolean isKnockoutStage = Boolean.TRUE.equals(stage.getIsKnockoutStage());
        boolean isNotPool = stage.getStageType() != null && stage.getStageType() != TournamentStageType.POOL;

        return isKnockoutStage || isNotPool || hasNextMatchLink;
    }
}

