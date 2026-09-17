package com.athleticaos.backend.utils;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class EmailUtilTest {

    @Test
    void normalizeEmail_null_returns_null() {
        assertThat(EmailUtil.normalizeEmail(null)).isNull();
    }

    @Test
    void normalizeEmail_emptyString_returns_null() {
        assertThat(EmailUtil.normalizeEmail("")).isNull();
    }

    @Test
    void normalizeEmail_whitespaceOnly_returns_null() {
        assertThat(EmailUtil.normalizeEmail("   ")).isNull();
    }

    @Test
    void normalizeEmail_mixedCaseAndWhitespace_returnsTrimmedLowercase() {
        assertThat(EmailUtil.normalizeEmail(" A@B.Test ")).isEqualTo("a@b.test");
    }

    @Test
    void normalizeEmail_complexAddress_normalizesCorrectly() {
        assertThat(EmailUtil.normalizeEmail("  USER.NAME+tag@DOMAIN.CO.UK  "))
                .isEqualTo("user.name+tag@domain.co.uk");
    }

    @Test
    void placeholderFor_derivesLowercaseAddressFromRegistrationNumber() {
        assertThat(EmailUtil.placeholderFor("AOS-000123")).isEqualTo("aos-000123@placeholder.invalid");
        assertThat(EmailUtil.placeholderFor("  AOS-001000  ")).isEqualTo("aos-001000@placeholder.invalid");
    }

    @Test
    void placeholderFor_withoutRegistrationNumber_returnsNull() {
        assertThat(EmailUtil.placeholderFor(null)).isNull();
        assertThat(EmailUtil.placeholderFor("   ")).isNull();
    }

    @Test
    void isPlaceholder_recognisesGeneratedAddressesOnly() {
        assertThat(EmailUtil.isPlaceholder("aos-000123@placeholder.invalid")).isTrue();
        assertThat(EmailUtil.isPlaceholder("  AOS-000123@PLACEHOLDER.INVALID ")).isTrue();
        assertThat(EmailUtil.isPlaceholder("real.person@example.invalid")).isFalse();
        assertThat(EmailUtil.isPlaceholder(null)).isFalse();
    }

    @Test
    void isMissingOrPlaceholder_coversAbsentBlankAndGenerated() {
        assertThat(EmailUtil.isMissingOrPlaceholder(null)).isTrue();
        assertThat(EmailUtil.isMissingOrPlaceholder("   ")).isTrue();
        assertThat(EmailUtil.isMissingOrPlaceholder("aos-000123@placeholder.invalid")).isTrue();
        assertThat(EmailUtil.isMissingOrPlaceholder("real@example.invalid")).isFalse();
    }
}
