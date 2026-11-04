package com.athleticaos.backend.rules;

import com.athleticaos.backend.entities.Match;
import com.athleticaos.backend.entities.TournamentStage;
import com.athleticaos.backend.enums.TournamentStageType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class MatchStageRulesTest {

    @Test
    @DisplayName("Null match or non-stage match without link is not a knockout match")
    void nonStageMatch() {
        assertThat(MatchStageRules.isKnockoutMatch(null)).isFalse();

        Match match = new Match();
        assertThat(MatchStageRules.isKnockoutMatch(match)).isFalse();
    }

    @Test
    @DisplayName("Round robin or group stage matches are never knockout matches")
    void roundRobinOrGroupStage() {
        TournamentStage stage = new TournamentStage();
        stage.setIsRoundRobin(true);

        Match match = new Match();
        match.setStage(stage);
        match.setNextMatchIdForWinner(UUID.randomUUID());
        assertThat(MatchStageRules.isKnockoutMatch(match)).isFalse();

        TournamentStage groupStage = new TournamentStage();
        groupStage.setIsGroupStage(true);
        groupStage.setIsKnockoutStage(true);

        Match groupMatch = new Match();
        groupMatch.setStage(groupStage);
        assertThat(MatchStageRules.isKnockoutMatch(groupMatch)).isFalse();
    }

    @Test
    @DisplayName("Match with stage having non-POOL type is a knockout match")
    void stageTypeKnockout() {
        TournamentStage stage = new TournamentStage();
        stage.setStageType(TournamentStageType.QUARTER_FINAL);

        Match match = new Match();
        match.setStage(stage);
        assertThat(MatchStageRules.isKnockoutMatch(match)).isTrue();

        stage.setStageType(TournamentStageType.SEMI_FINAL);
        assertThat(MatchStageRules.isKnockoutMatch(match)).isTrue();
    }

    @Test
    @DisplayName("Pool stage match without next match link is not knockout")
    void poolStageNoLink() {
        TournamentStage stage = new TournamentStage();
        stage.setStageType(TournamentStageType.POOL);

        Match match = new Match();
        match.setStage(stage);
        assertThat(MatchStageRules.isKnockoutMatch(match)).isFalse();
    }

    @Test
    @DisplayName("Pool stage match with next match link is treated as knockout")
    void poolStageWithLink() {
        TournamentStage stage = new TournamentStage();
        stage.setStageType(TournamentStageType.POOL);

        Match match = new Match();
        match.setStage(stage);
        match.setNextMatchIdForWinner(UUID.randomUUID());
        assertThat(MatchStageRules.isKnockoutMatch(match)).isTrue();
    }

    @Test
    @DisplayName("Match with stage isKnockoutStage true is a knockout match")
    void isKnockoutStageFlag() {
        TournamentStage stage = new TournamentStage();
        stage.setStageType(TournamentStageType.POOL);
        stage.setIsKnockoutStage(true);

        Match match = new Match();
        match.setStage(stage);
        assertThat(MatchStageRules.isKnockoutMatch(match)).isTrue();
    }

    @Test
    @DisplayName("Match with nextMatchIdForWinner or nextMatchIdForLoser is a knockout match")
    void nextMatchIdLink() {
        Match match = new Match();
        match.setNextMatchIdForWinner(UUID.randomUUID());
        assertThat(MatchStageRules.isKnockoutMatch(match)).isTrue();

        Match match2 = new Match();
        match2.setNextMatchIdForLoser(UUID.randomUUID());
        assertThat(MatchStageRules.isKnockoutMatch(match2)).isTrue();
    }
}
