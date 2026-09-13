package com.athleticaos.backend.enums;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class GenderTest {

    @Test
    @DisplayName("from with exact canonical MALE returns MALE")
    void from_exactMale_returnsMale() {
        assertThat(Gender.from("MALE")).isEqualTo(Gender.MALE);
    }

    @Test
    @DisplayName("from with exact canonical FEMALE returns FEMALE")
    void from_exactFemale_returnsFemale() {
        assertThat(Gender.from("FEMALE")).isEqualTo(Gender.FEMALE);
    }

    @ParameterizedTest
    @ValueSource(strings = {"male", "Male", " mAlE ", "  FEMALE  ", "female", "Female"})
    @DisplayName("from trims and normalizes case-insensitively")
    void from_mixedCaseAndWhitespace_normalized(String raw) {
        Gender gender = Gender.from(raw);
        assertThat(gender.name()).isIn("MALE", "FEMALE");
    }

    @Test
    @DisplayName("from with null throws IllegalArgumentException with fixed message")
    void from_null_throws() {
        assertThatThrownBy(() -> Gender.from(null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Gender must be MALE or FEMALE.");
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "   ", "\t\n"})
    @DisplayName("from with blank throws IllegalArgumentException with fixed message")
    void from_blank_throws(String raw) {
        assertThatThrownBy(() -> Gender.from(raw))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Gender must be MALE or FEMALE.");
    }

    @ParameterizedTest
    @ValueSource(strings = {"OTHER", "Other", "NON_BINARY", "UNKNOWN", "12345", "X"})
    @DisplayName("from with non-MALE/FEMALE throws without echoing input")
    void from_otherValues_throwsWithoutEchoingInput(String raw) {
        assertThatThrownBy(() -> Gender.from(raw))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Gender must be MALE or FEMALE.");
    }
}
