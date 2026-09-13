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
@SuppressWarnings("deprecation")
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

    // =======================================================================
    // validateAndNormalizeNewSubmission() — step (a): null/empty/whitespace → null
    // =======================================================================

    @Test
    void vnns_null_returnsNull() {
        assertThat(IdentificationUtil.validateAndNormalizeNewSubmission(
                null, "PASSPORT", LocalDate.of(1990, 1, 1), "MALE")).isNull();
    }

    @Test
    void vnns_empty_returnsNull() {
        assertThat(IdentificationUtil.validateAndNormalizeNewSubmission(
                "", "PASSPORT", LocalDate.of(1990, 1, 1), "MALE")).isNull();
    }

    @Test
    void vnns_whitespace_returnsNull() {
        assertThat(IdentificationUtil.validateAndNormalizeNewSubmission(
                "   ", "PASSPORT", LocalDate.of(1990, 1, 1), "MALE")).isNull();
    }

    // =======================================================================
    // validateAndNormalizeNewSubmission() — step (b): mask characters * • ● #
    // =======================================================================

    @Test
    void vnns_passport_asteriskMask_throws() {
        assertThatThrownBy(() -> IdentificationUtil.validateAndNormalizeNewSubmission(
                "******9001", "PASSPORT", LocalDate.of(1990, 1, 1), "MALE"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("masked");
    }

    @Test
    void vnns_passport_bulletMask_throws() {
        assertThatThrownBy(() -> IdentificationUtil.validateAndNormalizeNewSubmission(
                "\u2022\u2022\u2022\u2022 9001", "PASSPORT", LocalDate.of(1990, 1, 1), "MALE"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("masked");
    }

    @Test
    void vnns_passport_circleMask_throws() {
        assertThatThrownBy(() -> IdentificationUtil.validateAndNormalizeNewSubmission(
                "\u25CF\u25CF\u25CF\u25CF1234", "PASSPORT", LocalDate.of(1990, 1, 1), "MALE"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("masked");
    }

    @Test
    void vnns_passport_hashMask_throws() {
        assertThatThrownBy(() -> IdentificationUtil.validateAndNormalizeNewSubmission(
                "#####1234", "PASSPORT", LocalDate.of(1990, 1, 1), "MALE"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("masked");
    }

    @Test
    void vnns_malaysianIc_asteriskMask_throws() {
        assertThatThrownBy(() -> IdentificationUtil.validateAndNormalizeNewSubmission(
                "******9001", "MALAYSIAN_IC", LocalDate.of(1990, 1, 1), "MALE"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("masked");
    }

    @Test
    void vnns_malaysianIc_xMaskWithDashes_throws() {
        assertThatThrownBy(() -> IdentificationUtil.validateAndNormalizeNewSubmission(
                "XXXXXX-XX-9001", "MALAYSIAN_IC", LocalDate.of(1990, 1, 1), "MALE"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("masked");
    }

    // =======================================================================
    // validateAndNormalizeNewSubmission() — step (c): X-mask pattern
    // =======================================================================

    @Test
    void vnns_passport_xMaskWithDashes_throws() {
        assertThatThrownBy(() -> IdentificationUtil.validateAndNormalizeNewSubmission(
                "XXXX-XXXX-9002", "PASSPORT", LocalDate.of(1990, 1, 1), "MALE"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("masked");
    }

    @Test
    void vnns_passport_lowercaseXMask_throws() {
        assertThatThrownBy(() -> IdentificationUtil.validateAndNormalizeNewSubmission(
                "xxxxxx1234", "PASSPORT", LocalDate.of(1990, 1, 1), "MALE"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("masked");
    }

    @Test
    void vnns_passport_allXMask_throws() {
        assertThatThrownBy(() -> IdentificationUtil.validateAndNormalizeNewSubmission(
                "XXXXXX", "PASSPORT", LocalDate.of(1990, 1, 1), "MALE"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("masked");
    }

    @Test
    void vnns_other_xMaskWithDashes_throws() {
        assertThatThrownBy(() -> IdentificationUtil.validateAndNormalizeNewSubmission(
                "XXXX-XXXX-9002", "OTHER", null, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("masked");
    }

    @Test
    void vnns_passport_singleLeadingX_succeeds() {
        // A single leading X (real passport) must NOT be treated as a mask
        String result = IdentificationUtil.validateAndNormalizeNewSubmission(
                "X1234567", "PASSPORT", LocalDate.of(1990, 1, 1), "MALE");
        assertThat(result).isEqualTo("X1234567");
    }

    // =======================================================================
    // validateAndNormalizeNewSubmission() — step (d): normalises to nothing
    // =======================================================================

    @Test
    void vnns_dashes_throws() {
        assertThatThrownBy(() -> IdentificationUtil.validateAndNormalizeNewSubmission(
                "---", "PASSPORT", LocalDate.of(1990, 1, 1), "MALE"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("letters or digits");
    }

    @Test
    void vnns_dots_throws() {
        assertThatThrownBy(() -> IdentificationUtil.validateAndNormalizeNewSubmission(
                "...", "PASSPORT", LocalDate.of(1990, 1, 1), "MALE"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("letters or digits");
    }

    @Test
    void vnns_slashSpace_throws() {
        assertThatThrownBy(() -> IdentificationUtil.validateAndNormalizeNewSubmission(
                "/ /", "PASSPORT", LocalDate.of(1990, 1, 1), "MALE"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("letters or digits");
    }

    // =======================================================================
    // validateAndNormalizeNewSubmission() — step (e): placeholder values
    // =======================================================================

    @Test
    void vnns_passport_present_throws() {
        assertThatThrownBy(() -> IdentificationUtil.validateAndNormalizeNewSubmission(
                "PRESENT", "PASSPORT", LocalDate.of(1990, 1, 1), "MALE"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("placeholder");
    }

    @Test
    void vnns_passport_presentLowercase_throws() {
        assertThatThrownBy(() -> IdentificationUtil.validateAndNormalizeNewSubmission(
                "present", "PASSPORT", LocalDate.of(1990, 1, 1), "MALE"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("placeholder");
    }

    @Test
    void vnns_passport_presentMixedCase_throws() {
        assertThatThrownBy(() -> IdentificationUtil.validateAndNormalizeNewSubmission(
                "Present", "PASSPORT", LocalDate.of(1990, 1, 1), "MALE"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("placeholder");
    }

    @Test
    void vnns_passport_na_throws() {
        // N/A normalises to NA → placeholder
        assertThatThrownBy(() -> IdentificationUtil.validateAndNormalizeNewSubmission(
                "N/A", "PASSPORT", LocalDate.of(1990, 1, 1), "MALE"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("placeholder");
    }

    @Test
    void vnns_passport_masked_throws() {
        assertThatThrownBy(() -> IdentificationUtil.validateAndNormalizeNewSubmission(
                "MASKED", "PASSPORT", LocalDate.of(1990, 1, 1), "MALE"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("placeholder");
    }

    @Test
    void vnns_other_present_throws() {
        assertThatThrownBy(() -> IdentificationUtil.validateAndNormalizeNewSubmission(
                "PRESENT", "OTHER", null, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("placeholder");
    }

    @Test
    void vnns_malaysianIc_present_throws() {
        assertThatThrownBy(() -> IdentificationUtil.validateAndNormalizeNewSubmission(
                "PRESENT", "MALAYSIAN_IC", LocalDate.of(1990, 1, 1), "MALE"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("placeholder");
    }

    // =======================================================================
    // validateAndNormalizeNewSubmission() — step (f): unknown type
    // =======================================================================

    @Test
    void vnns_unknownType_nric_throws() {
        assertThatThrownBy(() -> IdentificationUtil.validateAndNormalizeNewSubmission(
                "A12345678", "NRIC", LocalDate.of(1990, 1, 1), "MALE"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid identification type");
    }

    // =======================================================================
    // validateAndNormalizeNewSubmission() — step (g): PASSPORT rules
    // =======================================================================

    @Test
    void vnns_passport_valid_returnsNormalized() {
        String result = IdentificationUtil.validateAndNormalizeNewSubmission(
                "A12345678", "PASSPORT", LocalDate.of(1985, 3, 15), "FEMALE");
        assertThat(result).isEqualTo("A12345678");
    }

    @Test
    void vnns_passport_lowercaseNormalized_returnsUppercase() {
        String result = IdentificationUtil.validateAndNormalizeNewSubmission(
                "qa21p90003", "PASSPORT", LocalDate.of(1985, 3, 15), "MALE");
        assertThat(result).isEqualTo("QA21P90003");
    }

    @Test
    void vnns_passport_tooShort_throws() {
        assertThatThrownBy(() -> IdentificationUtil.validateAndNormalizeNewSubmission(
                "A1234", "PASSPORT", LocalDate.of(1990, 1, 1), "MALE"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("6 and 20");
    }

    @Test
    void vnns_passport_noDigit_throws() {
        assertThatThrownBy(() -> IdentificationUtil.validateAndNormalizeNewSubmission(
                "ABCDEFG", "PASSPORT", LocalDate.of(1990, 1, 1), "MALE"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("digit");
    }

    @Test
    void vnns_passport_tooLong_throws() {
        // 21 alphanumeric chars after normalisation
        assertThatThrownBy(() -> IdentificationUtil.validateAndNormalizeNewSubmission(
                "A12345678901234567890", "PASSPORT", LocalDate.of(1990, 1, 1), "MALE"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("6 and 20");
    }

    // =======================================================================
    // validateAndNormalizeNewSubmission() — step (g): OTHER rules
    // =======================================================================

    @Test
    void vnns_other_valid_short() {
        String result = IdentificationUtil.validateAndNormalizeNewSubmission(
                "AB12", "OTHER", null, null);
        assertThat(result).isEqualTo("AB12");
    }

    @Test
    void vnns_other_validWithDashes_normalized() {
        String result = IdentificationUtil.validateAndNormalizeNewSubmission(
                "ID-2024-000123", "OTHER", null, null);
        assertThat(result).isEqualTo("ID2024000123");
    }

    @Test
    void vnns_other_tooShort_throws() {
        assertThatThrownBy(() -> IdentificationUtil.validateAndNormalizeNewSubmission(
                "AB1", "OTHER", null, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("4 and 30");
    }

    @Test
    void vnns_other_noDigit_throws() {
        assertThatThrownBy(() -> IdentificationUtil.validateAndNormalizeNewSubmission(
                "ABCDEF", "OTHER", null, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("digit");
    }

    // =======================================================================
    // validateAndNormalizeNewSubmission() — step (g): MALAYSIAN_IC
    // =======================================================================

    @Test
    void vnns_malaysianIc_valid() {
        // DOB 2000-01-01, state 13, seq 900, last digit 1 (odd = MALE)
        String result = IdentificationUtil.validateAndNormalizeNewSubmission(
                "000101-13-9001", "MALAYSIAN_IC", LocalDate.of(2000, 1, 1), "MALE");
        assertThat(result).isEqualTo("000101139001");
    }

    @Test
    void vnns_malaysianIc_existingRejections_stillReject() {
        // Reconfirm existing rejection: DOB mismatch
        assertThatThrownBy(() -> IdentificationUtil.validateAndNormalizeNewSubmission(
                "900123-14-5671", "MALAYSIAN_IC", LocalDate.of(1991, 1, 23), "MALE"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("date of birth");
    }

    // =======================================================================
    // validateAndNormalizeNewSubmission() — error messages never leak input
    // =======================================================================

    @Test
    void vnns_errorMessages_neverContainSubmittedValue() {
        // Collect error messages from various rejection scenarios
        String[] testValues = {
                "PRESENT", "MASKED", "N/A",
                "ABCDEFG", "AB1", "A1234",
                "A12345678901234567890"
        };
        String[] types = {
                "PASSPORT", "PASSPORT", "PASSPORT",
                "PASSPORT", "OTHER", "PASSPORT",
                "PASSPORT"
        };

        for (int i = 0; i < testValues.length; i++) {
            String val = testValues[i];
            String type = types[i];
            try {
                IdentificationUtil.validateAndNormalizeNewSubmission(
                        val, type, LocalDate.of(1990, 1, 1), "MALE");
            } catch (IllegalArgumentException e) {
                String normalized = IdentificationUtil.normalize(val);
                String msg = e.getMessage();
                assertThat(msg)
                        .as("Error for value index %d should not contain the raw value", i)
                        .doesNotContain(val);
                if (normalized != null) {
                    assertThat(msg)
                            .as("Error for value index %d should not contain the normalized value", i)
                            .doesNotContain(normalized);
                }
            }
        }
    }

    // -----------------------------------------------------------------------
    // requiresIdentityReentry()
    // -----------------------------------------------------------------------

    @Test
    void requiresReentry_icHolder_dobChanged_returnsTrue() {
        assertThat(IdentificationUtil.requiresIdentityReentry(
                "MALAYSIAN_IC",
                LocalDate.of(1991, 6, 6),
                "MALE",
                LocalDate.of(1992, 7, 7),   // different DOB
                null                          // gender not in request
        )).isTrue();
    }

    @Test
    void requiresReentry_icHolder_genderChanged_returnsTrue() {
        assertThat(IdentificationUtil.requiresIdentityReentry(
                "MALAYSIAN_IC",
                LocalDate.of(1991, 6, 6),
                "MALE",
                null,                         // DOB not in request
                "FEMALE"                      // different gender
        )).isTrue();
    }

    @Test
    void requiresReentry_icHolder_bothUnchanged_returnsFalse() {
        assertThat(IdentificationUtil.requiresIdentityReentry(
                "MALAYSIAN_IC",
                LocalDate.of(1991, 6, 6),
                "MALE",
                LocalDate.of(1991, 6, 6),    // same DOB
                "MALE"                        // same gender
        )).isFalse();
    }

    @Test
    void requiresReentry_icHolder_genderMaleVsMixedCase_returnsFalse() {
        // DEF-06C: stored data has mixed casing ('Male' vs 'MALE'); must not count as a change.
        assertThat(IdentificationUtil.requiresIdentityReentry(
                "MALAYSIAN_IC",
                LocalDate.of(1991, 6, 6),
                "Male",                       // stored with mixed case
                null,
                "MALE"                        // request uppercase
        )).isFalse();
    }

    @Test
    void requiresReentry_icHolder_nullRequestDob_returnsFalse() {
        assertThat(IdentificationUtil.requiresIdentityReentry(
                "MALAYSIAN_IC",
                LocalDate.of(1991, 6, 6),
                "MALE",
                null,                          // null DOB = not changing
                null                           // null gender = not changing
        )).isFalse();
    }

    @Test
    void requiresReentry_icHolder_nullRequestGender_returnsFalse() {
        assertThat(IdentificationUtil.requiresIdentityReentry(
                "MALAYSIAN_IC",
                LocalDate.of(1991, 6, 6),
                "FEMALE",
                LocalDate.of(1991, 6, 6),      // same DOB
                null                            // null gender = not changing
        )).isFalse();
    }

    @Test
    void requiresReentry_passportHolder_dobChanged_returnsFalse() {
        assertThat(IdentificationUtil.requiresIdentityReentry(
                "PASSPORT",
                LocalDate.of(1991, 6, 6),
                "MALE",
                LocalDate.of(2000, 1, 1),
                "FEMALE"
        )).isFalse();
    }

    @Test
    void requiresReentry_otherHolder_dobChanged_returnsFalse() {
        assertThat(IdentificationUtil.requiresIdentityReentry(
                "OTHER",
                LocalDate.of(1991, 6, 6),
                "MALE",
                LocalDate.of(2000, 1, 1),
                null
        )).isFalse();
    }

    @Test
    void requiresReentry_nullType_dobChanged_returnsTrue() {
        assertThat(IdentificationUtil.requiresIdentityReentry(
                null,
                LocalDate.of(1991, 6, 6),
                "MALE",
                LocalDate.of(2000, 1, 1),
                null
        )).isTrue();
    }

    @Test
    void requiresReentry_nonCanonicalIcType_dobChanged_returnsTrue() {
        // Non-canonical type "IC" is not PASSPORT or OTHER — re-entry is required.
        assertThat(IdentificationUtil.requiresIdentityReentry(
                "IC",
                LocalDate.of(1991, 6, 6),
                "MALE",
                LocalDate.of(2000, 1, 1),
                null
        )).isTrue();
    }

    @Test
    void requiresReentry_blankType_dobChanged_returnsTrue() {
        assertThat(IdentificationUtil.requiresIdentityReentry(
                "   ",
                LocalDate.of(1991, 6, 6),
                "MALE",
                LocalDate.of(2000, 1, 1),
                null
        )).isTrue();
    }

    @Test
    void requiresReentry_spacedPassport_dobChanged_returnsFalse() {
        assertThat(IdentificationUtil.requiresIdentityReentry(
                " passport ",
                LocalDate.of(1991, 6, 6),
                "MALE",
                LocalDate.of(2000, 1, 1),
                null
        )).isFalse();
    }

    @Test
    void requiresReentry_spacedOther_dobChanged_returnsFalse() {
        assertThat(IdentificationUtil.requiresIdentityReentry(
                " other ",
                LocalDate.of(1991, 6, 6),
                "MALE",
                LocalDate.of(2000, 1, 1),
                null
        )).isFalse();
    }

    @Test
    void requiresReentry_storedOtherGender_requestMale_returnsTrue() {
        // Legacy stored gender OTHER changed to canonical MALE counts as changed.
        assertThat(IdentificationUtil.requiresIdentityReentry(
                "MALAYSIAN_IC",
                LocalDate.of(1991, 6, 6),
                "OTHER",
                null,
                "MALE"
        )).isTrue();
    }

    @Test
    void requiresReentry_spacedLowercaseType_dobChanged_returnsTrue() {
        // Type with whitespace/case variations must still match.
        assertThat(IdentificationUtil.requiresIdentityReentry(
                " malaysian_ic ",
                LocalDate.of(1991, 6, 6),
                "MALE",
                LocalDate.of(2000, 1, 1),
                null
        )).isTrue();
    }
}
