package com.athleticaos.backend.rules;

import com.athleticaos.backend.entities.TournamentFormatConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class KnockoutTieBreakResolverTest {

    @Test
    @DisplayName("Category setting overrides tournament setting")
    void categoryOverridesTournament() {
        TournamentFormatConfig cat = new TournamentFormatConfig();
        cat.setKnockoutTieBreaker("FIRST_TRY");
        cat.setExtraTimeMinutes(10);

        TournamentFormatConfig tourney = new TournamentFormatConfig();
        tourney.setKnockoutTieBreaker("EXTRA_TIME");
        tourney.setExtraTimeMinutes(5);

        assertThat(KnockoutTieBreakResolver.resolveTieBreaker(cat, tourney)).isEqualTo("FIRST_TRY");
        assertThat(KnockoutTieBreakResolver.resolveExtraTimeMinutes(cat, tourney, "SEVENS")).isEqualTo(10);
    }

    @Test
    @DisplayName("Tournament setting used when category setting is null")
    void tournamentUsedWhenCategoryNull() {
        TournamentFormatConfig cat = new TournamentFormatConfig();
        cat.setKnockoutTieBreaker(null);
        cat.setExtraTimeMinutes(null);

        TournamentFormatConfig tourney = new TournamentFormatConfig();
        tourney.setKnockoutTieBreaker("FIRST_TRY");
        tourney.setExtraTimeMinutes(8);

        assertThat(KnockoutTieBreakResolver.resolveTieBreaker(cat, tourney)).isEqualTo("FIRST_TRY");
        assertThat(KnockoutTieBreakResolver.resolveExtraTimeMinutes(cat, tourney, "SEVENS")).isEqualTo(8);
    }

    @Test
    @DisplayName("Default fallback is EXTRA_TIME with 15m for XV and 5m for others")
    void defaultsWhenBothNull() {
        assertThat(KnockoutTieBreakResolver.resolveTieBreaker(null, null)).isEqualTo("EXTRA_TIME");

        assertThat(KnockoutTieBreakResolver.resolveExtraTimeMinutes(null, null, "XV")).isEqualTo(15);
        assertThat(KnockoutTieBreakResolver.resolveExtraTimeMinutes(null, null, "RUGBY_XV")).isEqualTo(15);
        assertThat(KnockoutTieBreakResolver.resolveExtraTimeMinutes(null, null, "fifteens")).isEqualTo(15);
        assertThat(KnockoutTieBreakResolver.resolveExtraTimeMinutes(null, null, "15")).isEqualTo(15);

        assertThat(KnockoutTieBreakResolver.resolveExtraTimeMinutes(null, null, "SEVENS")).isEqualTo(5);
        assertThat(KnockoutTieBreakResolver.resolveExtraTimeMinutes(null, null, "TENS")).isEqualTo(5);
        assertThat(KnockoutTieBreakResolver.resolveExtraTimeMinutes(null, null, null)).isEqualTo(5);
    }
}
