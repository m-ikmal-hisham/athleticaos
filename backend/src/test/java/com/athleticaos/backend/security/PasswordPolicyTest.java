package com.athleticaos.backend.security;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PasswordPolicyTest {

    private final PasswordPolicy policy = new PasswordPolicy();

    @Test
    void acceptsLongUncommonPassword() {
        assertThatCode(() -> policy.validate("Violet-Kettle-Harbour-58", "jane.doe@example.com"))
                .doesNotThrowAnyException();
    }

    @Test
    void rejectsNullAndBlank() {
        assertThatThrownBy(() -> policy.validate(null, "a@example.com")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> policy.validate("   ", "a@example.com")).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsShortPassword() {
        assertThatThrownBy(() -> policy.validate("Short-9x", "a@example.com"))
                .hasMessageContaining("at least 12");
    }

    @Test
    void rejectsOverBcryptByteLimit() {
        assertThatThrownBy(() -> policy.validate("é".repeat(37) + "Zq7", "a@example.com"))
                .hasMessageContaining("72 bytes");
    }

    @Test
    void rejectsCommonAndProductWords() {
        assertThatThrownBy(() -> policy.validate("MyPassword-Is-Long-77", "a@example.com"))
                .hasMessageContaining("common words");
        assertThatThrownBy(() -> policy.validate("AthleticaOS-Rocks-2026", "a@example.com"))
                .hasMessageContaining("common words");
    }

    @Test
    void rejectsEmailLocalPart() {
        assertThatThrownBy(() -> policy.validate("jane.doe-Harbour-58", "jane.doe@example.com"))
                .hasMessageContaining("email");
    }

    @Test
    void rejectsRepetitivePassword() {
        assertThatThrownBy(() -> policy.validate("abababababababab", "a@example.com"))
                .hasMessageContaining("repetitive");
    }
}
