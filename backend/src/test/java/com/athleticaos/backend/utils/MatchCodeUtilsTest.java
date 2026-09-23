package com.athleticaos.backend.utils;

import com.athleticaos.backend.entities.TournamentCategory;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class MatchCodeUtilsTest {

    private static TournamentCategory cat(String name) {
        TournamentCategory c = new TournamentCategory();
        c.setName(name);
        return c;
    }

    @Test
    @DisplayName("Age groups stay distinct so knockout codes cannot collide across categories")
    void ageGroupsProduceDistinctAbbreviations() {
        assertThat(MatchCodeUtils.categoryAbbr(cat("Boys U11"))).isEqualTo("BU11");
        assertThat(MatchCodeUtils.categoryAbbr(cat("Boys U14"))).isEqualTo("BU14");
        assertThat(MatchCodeUtils.categoryAbbr(cat("Boys U16"))).isEqualTo("BU16");
        assertThat(MatchCodeUtils.categoryAbbr(cat("Girls U16"))).isEqualTo("GU16");

        assertThat(List.of("Boys U11", "Boys U14", "Boys U16", "Girls U16").stream()
                .map(n -> MatchCodeUtils.categoryAbbr(cat(n)))
                .distinct()
                .count()).isEqualTo(4);
    }

    @Test
    @DisplayName("Both spellings of an age group converge on the same abbreviation")
    void spellingVariantsConverge() {
        assertThat(MatchCodeUtils.categoryAbbr(cat("Boys Under 16")))
                .isEqualTo(MatchCodeUtils.categoryAbbr(cat("Boys U16")));
        assertThat(MatchCodeUtils.categoryAbbr(cat("boys-u16"))).isEqualTo("BU16");
    }

    @Test
    @DisplayName("Digits survive the initials cap, so long names still separate by age")
    void digitsAreNeverTruncated() {
        String a = MatchCodeUtils.categoryAbbr(cat("Mixed Touch Development Regional Squad Under 14"));
        String b = MatchCodeUtils.categoryAbbr(cat("Mixed Touch Development Regional Squad Under 16"));
        assertThat(a).endsWith("14");
        assertThat(b).endsWith("16");
        assertThat(a).isNotEqualTo(b);
    }

    @Test
    @DisplayName("A missing or blank category abbreviates to an empty string")
    void blankCategoryYieldsEmpty() {
        assertThat(MatchCodeUtils.categoryAbbr(null)).isEmpty();
        assertThat(MatchCodeUtils.categoryAbbr(cat("   "))).isEmpty();
        assertThat(MatchCodeUtils.categoryAbbr(new TournamentCategory())).isEmpty();
    }

    @Test
    @DisplayName("A category with no age group is unchanged in shape")
    void categoryWithoutAgeGroup() {
        assertThat(MatchCodeUtils.categoryAbbr(cat("Men's Open"))).isEqualTo("MO");
        assertThat(MatchCodeUtils.categoryAbbr(cat("Women's Open"))).isEqualTo("WO");
    }
}
