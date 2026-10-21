package com.athleticaos.backend.utils;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;

class PublicAgeGroupsTest {

    @ParameterizedTest(name = "age {0} -> {1}")
    @CsvSource({
            "5, Under 8",
            "7, Under 8",
            "8, Under 10",
            "13, Under 14",
            "14, Under 16",
            "15, Under 16",
            "16, Under 18",
            "17, Under 18",
            "18, ",
            "19, ",
            "25, ",
            "-1, "
    })
    @DisplayName("Calculates smallest even band above age from {8, 10, 12, 14, 16, 18} or null for 18+")
    void ageGroupFor_computesExpectedBands(int age, String expected) {
        String result = PublicAgeGroups.ageGroupFor(age);
        if (expected == null || expected.isBlank()) {
            assertThat(result).isNull();
        } else {
            assertThat(result).isEqualTo(expected);
        }
    }

    @Test
    @DisplayName("Direct assertions for required test cases: 5, 13, 14, 17, 18")
    void requiredTestCases() {
        assertThat(PublicAgeGroups.ageGroupFor(5)).isEqualTo("Under 8");
        assertThat(PublicAgeGroups.ageGroupFor(13)).isEqualTo("Under 14");
        assertThat(PublicAgeGroups.ageGroupFor(14)).isEqualTo("Under 16");
        assertThat(PublicAgeGroups.ageGroupFor(17)).isEqualTo("Under 18");
        assertThat(PublicAgeGroups.ageGroupFor(18)).isNull();
    }
}
