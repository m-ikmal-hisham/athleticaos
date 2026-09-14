package com.athleticaos.backend.enums;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class IdentityVerificationMethodTest {

    @Test
    @DisplayName("IdentityVerificationMethod has exactly two enum values")
    void enumHasExactlyTwoValues() {
        assertThat(IdentityVerificationMethod.values()).hasSize(2);
        assertThat(IdentityVerificationMethod.values()).containsExactly(
                IdentityVerificationMethod.PRE_REGISTRATION_RECORD,
                IdentityVerificationMethod.DOCUMENT_SIGHTED
        );
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "PRE_REGISTRATION_RECORD",
            "pre_registration_record",
            "  PRE_REGISTRATION_RECORD  ",
            "Pre_Registration_Record"
    })
    @DisplayName("from() accepts PRE_REGISTRATION_RECORD regardless of case or surrounding whitespace")
    void from_acceptsPreRegistrationRecord(String input) {
        assertThat(IdentityVerificationMethod.from(input))
                .isEqualTo(IdentityVerificationMethod.PRE_REGISTRATION_RECORD);
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "DOCUMENT_SIGHTED",
            "document_sighted",
            "  DOCUMENT_SIGHTED  ",
            "Document_Sighted"
    })
    @DisplayName("from() accepts DOCUMENT_SIGHTED regardless of case or surrounding whitespace")
    void from_acceptsDocumentSighted(String input) {
        assertThat(IdentityVerificationMethod.from(input))
                .isEqualTo(IdentityVerificationMethod.DOCUMENT_SIGHTED);
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "PRE_REGISTRATION_MATCH",
            "PHYSICAL_DOCUMENT_SIGHTED",
            "DIGITAL_DOCUMENT_SIGHTED"
    })
    @DisplayName("from() rejects invalid method names with fixed message that does not echo input")
    void from_rejectsInvalidMethodNamesWithoutEchoingInput(String invalidInput) {
        assertThatThrownBy(() -> IdentityVerificationMethod.from(invalidInput))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Invalid verification method. Allowed values are: PRE_REGISTRATION_RECORD, DOCUMENT_SIGHTED.")
                .satisfies(ex -> assertThat(ex.getMessage()).doesNotContain(invalidInput));
    }

    @Test
    @DisplayName("from() rejects null and blank inputs with generic message")
    void from_rejectsNullAndBlank() {
        assertThatThrownBy(() -> IdentityVerificationMethod.from(null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Verification method is required.");

        assertThatThrownBy(() -> IdentityVerificationMethod.from(""))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Verification method is required.");

        assertThatThrownBy(() -> IdentityVerificationMethod.from("   "))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Verification method is required.");
    }
}
