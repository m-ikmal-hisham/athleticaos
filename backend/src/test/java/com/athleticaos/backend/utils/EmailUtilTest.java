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
}
