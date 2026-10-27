package com.athleticaos.backend.services.standings;

import com.athleticaos.backend.entities.Tournament;
import com.athleticaos.backend.entities.TournamentCategory;
import com.athleticaos.backend.entities.TournamentFormatConfig;
import com.athleticaos.backend.enums.MatchResultType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class MatchPointsCalculatorTest {

    private final UUID homeId = UUID.randomUUID();
    private final UUID awayId = UUID.randomUUID();

    @Test
    @DisplayName("Bonus off: standard 4/2/0 win/draw/loss scoring, no bonus points")
    void testBonusOff_SameAsToday() {
        ScoringRules rules = new ScoringRules(4, 2, 0, false, 1, 4, 1, 7);

        // Home wins 28-21 (diff 7, home 4 tries, away 3 tries)
        MatchPointsResult result = MatchPointsCalculator.calculate(
                rules, 28, 21, MatchResultType.NORMAL, null, homeId, awayId, 4, 3, true
        );

        assertThat(result.home().tablePoints()).isEqualTo(4);
        assertThat(result.home().basePoints()).isEqualTo(4);
        assertThat(result.home().bonusPoints()).isEqualTo(0);
        assertThat(result.home().tryBonusPoints()).isEqualTo(0);
        assertThat(result.home().losingBonusPoints()).isEqualTo(0);

        assertThat(result.away().tablePoints()).isEqualTo(0);
        assertThat(result.away().basePoints()).isEqualTo(0);
        assertThat(result.away().bonusPoints()).isEqualTo(0);
        assertThat(result.away().tryBonusPoints()).isEqualTo(0);
        assertThat(result.away().losingBonusPoints()).isEqualTo(0);
    }

    @Test
    @DisplayName("Try bonus: exactly at threshold (4) awards bonus, one below (3) does not")
    void testTryBonus_AtThresholdAndBelow() {
        ScoringRules rules = new ScoringRules(4, 2, 0, true, 1, 4, 1, 7);

        // Home scores 4 tries (wins 26-10), away scores 3 tries
        MatchPointsResult result = MatchPointsCalculator.calculate(
                rules, 26, 10, MatchResultType.NORMAL, null, homeId, awayId, 4, 3, true
        );

        // Home: 4 win + 1 try bonus = 5
        assertThat(result.home().tablePoints()).isEqualTo(5);
        assertThat(result.home().basePoints()).isEqualTo(4);
        assertThat(result.home().tryBonusPoints()).isEqualTo(1);
        assertThat(result.home().bonusPoints()).isEqualTo(1);

        // Away: 0 loss + 0 try bonus (3 < 4) + 0 loss bonus (margin 16 > 7) = 0
        assertThat(result.away().tablePoints()).isEqualTo(0);
        assertThat(result.away().basePoints()).isEqualTo(0);
        assertThat(result.away().tryBonusPoints()).isEqualTo(0);
        assertThat(result.away().bonusPoints()).isEqualTo(0);
    }

    @Test
    @DisplayName("Losing bonus: loss margin exactly at margin (7) awards bonus, one over (8) does not")
    void testLosingBonus_AtMarginAndOneOver() {
        ScoringRules rules = new ScoringRules(4, 2, 0, true, 1, 4, 1, 7);

        // Case 1: margin exactly 7 (24-17), away has 2 tries (< 4)
        MatchPointsResult atMargin = MatchPointsCalculator.calculate(
                rules, 24, 17, MatchResultType.NORMAL, null, homeId, awayId, 3, 2, true
        );
        assertThat(atMargin.away().basePoints()).isEqualTo(0);
        assertThat(atMargin.away().losingBonusPoints()).isEqualTo(1);
        assertThat(atMargin.away().tryBonusPoints()).isEqualTo(0);
        assertThat(atMargin.away().tablePoints()).isEqualTo(1);

        // Case 2: margin 8 (25-17), away has 2 tries (< 4)
        MatchPointsResult oneOver = MatchPointsCalculator.calculate(
                rules, 25, 17, MatchResultType.NORMAL, null, homeId, awayId, 3, 2, true
        );
        assertThat(oneOver.away().basePoints()).isEqualTo(0);
        assertThat(oneOver.away().losingBonusPoints()).isEqualTo(0);
        assertThat(oneOver.away().tryBonusPoints()).isEqualTo(0);
        assertThat(oneOver.away().tablePoints()).isEqualTo(0);
    }

    @Test
    @DisplayName("Both bonuses for a loser: 4+ tries and loss by <= 7")
    void testBothBonusesForLoser() {
        ScoringRules rules = new ScoringRules(4, 2, 0, true, 1, 4, 1, 7);

        // Home wins 31-26 (diff 5 <= 7). Home: 5 tries. Away: 4 tries.
        MatchPointsResult result = MatchPointsCalculator.calculate(
                rules, 31, 26, MatchResultType.NORMAL, null, homeId, awayId, 5, 4, true
        );

        // Home: 4 (win) + 1 (try bonus) = 5
        assertThat(result.home().tablePoints()).isEqualTo(5);
        assertThat(result.home().tryBonusPoints()).isEqualTo(1);
        assertThat(result.home().losingBonusPoints()).isEqualTo(0);

        // Away: 0 (loss) + 1 (try bonus) + 1 (losing bonus) = 2
        assertThat(result.away().tablePoints()).isEqualTo(2);
        assertThat(result.away().basePoints()).isEqualTo(0);
        assertThat(result.away().tryBonusPoints()).isEqualTo(1);
        assertThat(result.away().losingBonusPoints()).isEqualTo(1);
        assertThat(result.away().bonusPoints()).isEqualTo(2);
    }

    @Test
    @DisplayName("Draw with 4+ tries each: both teams earn draw points + try bonus")
    void testDrawWithFourPlusTriesEach() {
        ScoringRules rules = new ScoringRules(4, 2, 0, true, 1, 4, 1, 7);

        // 26-26 draw, 4 tries each
        MatchPointsResult result = MatchPointsCalculator.calculate(
                rules, 26, 26, MatchResultType.NORMAL, null, homeId, awayId, 4, 4, true
        );

        // Both: 2 (draw) + 1 (try bonus) = 3
        assertThat(result.home().tablePoints()).isEqualTo(3);
        assertThat(result.home().basePoints()).isEqualTo(2);
        assertThat(result.home().tryBonusPoints()).isEqualTo(1);
        assertThat(result.home().losingBonusPoints()).isEqualTo(0);

        assertThat(result.away().tablePoints()).isEqualTo(3);
        assertThat(result.away().basePoints()).isEqualTo(2);
        assertThat(result.away().tryBonusPoints()).isEqualTo(1);
        assertThat(result.away().losingBonusPoints()).isEqualTo(0);
    }

    @Test
    @DisplayName("Walkover: winner gets win points, loser gets loss points, no bonus points")
    void testWalkover_NoBonusPoints() {
        ScoringRules rules = new ScoringRules(4, 2, 0, true, 1, 4, 1, 7);

        // Walkover with home as winner, 28-0
        MatchPointsResult result = MatchPointsCalculator.calculate(
                rules, 28, 0, MatchResultType.WALKOVER, homeId, homeId, awayId, 0, 0, false
        );

        assertThat(result.home().tablePoints()).isEqualTo(4);
        assertThat(result.home().basePoints()).isEqualTo(4);
        assertThat(result.home().bonusPoints()).isEqualTo(0);

        assertThat(result.away().tablePoints()).isEqualTo(0);
        assertThat(result.away().basePoints()).isEqualTo(0);
        assertThat(result.away().bonusPoints()).isEqualTo(0);
    }

    @Test
    @DisplayName("Unknown tries: when tries are not known, no try bonus is awarded, but losing bonus can still apply")
    void testUnknownTries_NoTryBonus() {
        ScoringRules rules = new ScoringRules(4, 2, 0, true, 1, 4, 1, 7);

        // Match entered as score only (30-24, diff 6). Even if someone passed 5 tries, triesKnown is false
        MatchPointsResult result = MatchPointsCalculator.calculate(
                rules, 30, 24, MatchResultType.NORMAL, null, homeId, awayId, 5, 4, false
        );

        // Home: win 4, but no try bonus because tries are unknown -> 4 pts
        assertThat(result.home().tablePoints()).isEqualTo(4);
        assertThat(result.home().tryBonusPoints()).isEqualTo(0);
        assertThat(result.home().triesKnown()).isFalse();

        // Away: loss 0, no try bonus, but losing bonus applies (diff 6 <= 7) -> 1 pt
        assertThat(result.away().tablePoints()).isEqualTo(1);
        assertThat(result.away().basePoints()).isEqualTo(0);
        assertThat(result.away().tryBonusPoints()).isEqualTo(0);
        assertThat(result.away().losingBonusPoints()).isEqualTo(1);
        assertThat(result.away().triesKnown()).isFalse();
    }

    @Test
    @DisplayName("Per-category config overrides tournament global config")
    void testCategoryConfigOverridesTournamentConfig() {
        UUID categoryId = UUID.randomUUID();

        Tournament tournament = new Tournament();
        tournament.setId(UUID.randomUUID());

        // Global: bonus points off
        TournamentFormatConfig globalConfig = TournamentFormatConfig.builder()
                .tournament(tournament)
                .category(null)
                .pointsWin(4)
                .pointsDraw(2)
                .pointsLoss(0)
                .bonusPointsEnabled(false)
                .build();
        tournament.addFormatConfig(globalConfig);

        // Category specific: bonus points on, threshold 3, margin 5
        TournamentCategory cat = new TournamentCategory();
        cat.setId(categoryId);
        TournamentFormatConfig catConfig = TournamentFormatConfig.builder()
                .tournament(tournament)
                .category(cat)
                .pointsWin(5)
                .pointsDraw(3)
                .pointsLoss(1)
                .bonusPointsEnabled(true)
                .bonusTryThreshold(3)
                .bonusLosingMargin(5)
                .pointsBonusTry(2)
                .pointsBonusLoss(2)
                .build();
        tournament.addFormatConfig(catConfig);

        // Global resolution
        ScoringRules globalRules = ScoringRules.from(tournament.getFormatConfig(null));
        assertThat(globalRules.bonusPointsEnabled()).isFalse();
        assertThat(globalRules.pointsWin()).isEqualTo(4);

        // Category resolution
        ScoringRules categoryRules = ScoringRules.from(tournament.getFormatConfig(categoryId));
        assertThat(categoryRules.bonusPointsEnabled()).isTrue();
        assertThat(categoryRules.pointsWin()).isEqualTo(5);
        assertThat(categoryRules.bonusTryThreshold()).isEqualTo(3);
        assertThat(categoryRules.pointsBonusTry()).isEqualTo(2);

        // Category match: Home wins 20-16 (diff 4 <= 5), Home has 3 tries
        MatchPointsResult catResult = MatchPointsCalculator.calculate(
                categoryRules, 20, 16, MatchResultType.NORMAL, null, homeId, awayId, 3, 1, true
        );
        // Home: 5 (win) + 2 (try bonus) = 7
        assertThat(catResult.home().tablePoints()).isEqualTo(7);
        // Away: 1 (loss) + 2 (loss bonus) = 3
        assertThat(catResult.away().tablePoints()).isEqualTo(3);
    }
}
