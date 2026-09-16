package com.athleticaos.backend.enums;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RecordVerificationMethodTest {

    @Test
    @DisplayName("from('PRE_REGISTRATION_RECORD') returns PRE_REGISTRATION_RECORD")
    void from_preRegistrationRecord_returnsEnum() {
        assertThat(RecordVerificationMethod.from("PRE_REGISTRATION_RECORD"))
                .isEqualTo(RecordVerificationMethod.PRE_REGISTRATION_RECORD);
        assertThat(RecordVerificationMethod.from("pre_registration_record"))
                .isEqualTo(RecordVerificationMethod.PRE_REGISTRATION_RECORD);
    }

    @Test
    @DisplayName("from('DOCUMENT_SIGHTED') returns DOCUMENT_SIGHTED")
    void from_documentSighted_returnsEnum() {
        assertThat(RecordVerificationMethod.from("DOCUMENT_SIGHTED"))
                .isEqualTo(RecordVerificationMethod.DOCUMENT_SIGHTED);
        assertThat(RecordVerificationMethod.from("document_sighted"))
                .isEqualTo(RecordVerificationMethod.DOCUMENT_SIGHTED);
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "   "})
    @DisplayName("from with blank or null throws IllegalArgumentException with required message")
    void from_blankOrNull_throws(String raw) {
        assertThatThrownBy(() -> RecordVerificationMethod.from(raw))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Verification method is required.");

        assertThatThrownBy(() -> RecordVerificationMethod.from(null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Verification method is required.");
    }

    @Test
    @DisplayName("from with unknown value throws IllegalArgumentException with allowed values message")
    void from_unknownValue_throws() {
        assertThatThrownBy(() -> RecordVerificationMethod.from("UNKNOWN_METHOD"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Invalid verification method. Allowed values are: PRE_REGISTRATION_RECORD, DOCUMENT_SIGHTED.");
    }
}
