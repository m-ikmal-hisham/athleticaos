package com.athleticaos.backend.utils;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.*;

/**
 * Unit tests for {@link IdentificationUtil}.
 *
 * Covers:
 *  - normalize(): null safety, trimming, uppercasing, removal of non-alphanumerics
 *  - validateNewSubmission(): MALAYSIAN_IC rules (length, digits, DOB prefix, parity)
 *  - validateNewSubmission(): PASSPORT and OTHER bypass all Malaysian rules
 *  - validateNewSubmission(): null/blank normalised value is always a no-op
 */
class IdentificationUtilTest {

    // -----------------------------------------------------------------------
    // normalize()
    // -----------------------------------------------------------------------

    @Test
    void normalize_null_returns_null() {
        assertThat(IdentificationUtil.normalize(null)).isNull();
    }

    @Test
    void normalize_blank_returns_null() {
        assertThat(IdentificationUtil.normalize("   ")).isNull();
    }

    @Test
    void normalize_lowercaseAndDashes_produces_upperAlphanumeric() {
        assertThat(IdentificationUtil.normalize("abc-123 xyz")).isEqualTo("ABC123XYZ");
    }

    @Test
    void normalize_alreadyNormal_unchanged() {
        assertThat(IdentificationUtil.normalize("901231145551")).isEqualTo("901231145551");
    }

    @Test
    void normalize_whitespaceOnly_returns_null() {
        assertThat(IdentificationUtil.normalize("\t\n ")).isNull();
    }

    @Test
    void normalize_specialCharsOnly_returns_null() {
        assertThat(IdentificationUtil.normalize("---   ---")).isNull();
    }

    // -----------------------------------------------------------------------
    // validateNewSubmission(): null / blank are always no-ops
    // -----------------------------------------------------------------------

    @Test
    void validate_null_normalized_isNoOp() {
        // Must not throw regardless of type, dob, gender
        assertThatCode(() -> IdentificationUtil.validateNewSubmission(
                null, "MALAYSIAN_IC", LocalDate.of(1990, 1, 1), "MALE"))
                .doesNotThrowAnyException();
    }

    @Test
    void validate_blank_normalized_isNoOp() {
        assertThatCode(() -> IdentificationUtil.validateNewSubmission(
                "", "MALAYSIAN_IC", LocalDate.of(1990, 1, 1), "MALE"))
                .doesNotThrowAnyException();
    }

    // -----------------------------------------------------------------------
    // MALAYSIAN_IC — valid IC
    // -----------------------------------------------------------------------

    @Test
    void validate_malaysianIc_valid_male() {
        // DOB 1990-01-23, state 14 (Sarawak), seq 567, last digit 1 (odd = MALE)
        String ic = "900123" + "14" + "567" + "1";
        assertThatCode(() -> IdentificationUtil.validateNewSubmission(
                ic, "MALAYSIAN_IC", LocalDate.of(1990, 1, 23), "MALE"))
                .doesNotThrowAnyException();
    }

    @Test
    void validate_malaysianIc_valid_female() {
        // DOB 1995-06-10, state 10, seq 123, last digit 2 (even = FEMALE)
        String ic = "950610" + "10" + "123" + "2";
        assertThatCode(() -> IdentificationUtil.validateNewSubmission(
                ic, "MALAYSIAN_IC", LocalDate.of(1995, 6, 10), "FEMALE"))
                .doesNotThrowAnyException();
    }

    // -----------------------------------------------------------------------
    // MALAYSIAN_IC — invalid length
    // -----------------------------------------------------------------------

    @Test
    void validate_malaysianIc_tooShort_throws() {
        assertThatThrownBy(() -> IdentificationUtil.validateNewSubmission(
                "9012311456", "MALAYSIAN_IC", LocalDate.of(1990, 12, 31), "MALE"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("12 digits");
    }

    @Test
    void validate_malaysianIc_tooLong_throws() {
        assertThatThrownBy(() -> IdentificationUtil.validateNewSubmission(
                "9012311456781", "MALAYSIAN_IC", LocalDate.of(1990, 12, 31), "MALE"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("12 digits");
    }

    // -----------------------------------------------------------------------
    // MALAYSIAN_IC — non-numeric
    // -----------------------------------------------------------------------

    @Test
    void validate_malaysianIc_containsLetters_throws() {
        assertThatThrownBy(() -> IdentificationUtil.validateNewSubmission(
                "90123114A551", "MALAYSIAN_IC", LocalDate.of(1990, 12, 31), "MALE"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("numeric");
    }

    // -----------------------------------------------------------------------
    // MALAYSIAN_IC — DOB prefix mismatch
    // -----------------------------------------------------------------------

    @Test
    void validate_malaysianIc_dobMismatch_throws() {
        // IC says 900123 but dob is 1991-01-23
        String ic = "900123" + "14" + "567" + "1";
        assertThatThrownBy(() -> IdentificationUtil.validateNewSubmission(
                ic, "MALAYSIAN_IC", LocalDate.of(1991, 1, 23), "MALE"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("date of birth");
    }

    @Test
    void validate_malaysianIc_nullDob_throws() {
        String ic = "900123" + "14" + "567" + "1";
        assertThatThrownBy(() -> IdentificationUtil.validateNewSubmission(
                ic, "MALAYSIAN_IC", null, "MALE"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Date of birth is required");
    }

    // -----------------------------------------------------------------------
    // MALAYSIAN_IC — gender parity
    // -----------------------------------------------------------------------

    @Test
    void validate_malaysianIc_wrongParityForMale_throws() {
        // Last digit 2 (even) but gender is MALE — should throw
        String ic = "900123" + "14" + "567" + "2";
        assertThatThrownBy(() -> IdentificationUtil.validateNewSubmission(
                ic, "MALAYSIAN_IC", LocalDate.of(1990, 1, 23), "MALE"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("odd");
    }

    @Test
    void validate_malaysianIc_wrongParityForFemale_throws() {
        // Last digit 1 (odd) but gender is FEMALE — should throw
        String ic = "950610" + "10" + "123" + "1";
        assertThatThrownBy(() -> IdentificationUtil.validateNewSubmission(
                ic, "MALAYSIAN_IC", LocalDate.of(1995, 6, 10), "FEMALE"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("even");
    }

    @Test
    void validate_malaysianIc_nullGender_throws() {
        String ic = "900123" + "14" + "567" + "1";
        assertThatThrownBy(() -> IdentificationUtil.validateNewSubmission(
                ic, "MALAYSIAN_IC", LocalDate.of(1990, 1, 23), null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Gender is required");
    }

    @Test
    void validate_malaysianIc_unknownGender_throws() {
        String ic = "900123" + "14" + "567" + "1";
        assertThatThrownBy(() -> IdentificationUtil.validateNewSubmission(
                ic, "MALAYSIAN_IC", LocalDate.of(1990, 1, 23), "OTHER"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("MALE or FEMALE");
    }

    @Test
    void validate_malaysianIc_caseInsensitiveGender_succeeds() {
        String ic = "900123" + "14" + "567" + "1";
        assertThatCode(() -> IdentificationUtil.validateNewSubmission(
                ic, "MALAYSIAN_IC", LocalDate.of(1990, 1, 23), "male"))
                .doesNotThrowAnyException();
    }

    // -----------------------------------------------------------------------
    // PASSPORT and OTHER — bypass all Malaysian IC rules
    // -----------------------------------------------------------------------

    @Test
    void validate_passport_arbitraryValue_doesNotThrow() {
        assertThatCode(() -> IdentificationUtil.validateNewSubmission(
                "A12345678", "PASSPORT", LocalDate.of(1985, 3, 15), "FEMALE"))
                .doesNotThrowAnyException();
    }

    @Test
    void validate_other_arbitraryValue_doesNotThrow() {
        assertThatCode(() -> IdentificationUtil.validateNewSubmission(
                "DIPLOMAT12345", "OTHER", null, null))
                .doesNotThrowAnyException();
    }

    // -----------------------------------------------------------------------
    // Type validation — mandatory & canonical
    // -----------------------------------------------------------------------

    @Test
    void validate_unknownType_throws() {
        assertThatThrownBy(() -> IdentificationUtil.validateNewSubmission(
                "IC1234567890", "LEGACY_IC", LocalDate.of(2000, 1, 1), "MALE"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid identification type: 'LEGACY_IC'");
    }

    @Test
    void validate_nullType_throws() {
        assertThatThrownBy(() -> IdentificationUtil.validateNewSubmission(
                "IC1234567890", null, null, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Identification type is required");
    }

    @Test
    void validate_blankType_throws() {
        assertThatThrownBy(() -> IdentificationUtil.validateNewSubmission(
                "IC1234567890", "   ", null, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Identification type is required");
    }

    @Test
    void validate_legacyAliasIc_rejectedOnBackend() {
        // Backend rejects legacy 'IC' on new submissions; frontend canonicalizes it prior to submission
        String ic = "900123" + "14" + "567" + "1";
        assertThatThrownBy(() -> IdentificationUtil.validateNewSubmission(
                ic, "IC", LocalDate.of(1990, 1, 23), "MALE"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid identification type: 'IC'");
    }
}
