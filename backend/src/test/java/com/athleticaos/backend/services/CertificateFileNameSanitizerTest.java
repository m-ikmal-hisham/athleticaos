package com.athleticaos.backend.services;

import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class CertificateFileNameSanitizerTest {

    private final CertificateFileNameSanitizer sanitizer = new CertificateFileNameSanitizer();

    @Test
    void stripsSpecialAndTraversalCharacters() {
        assertThat(sanitizer.sanitizeSegment("Men's Open / U-19: Finals*", "General"))
                .isEqualTo("Men's Open U-19 Finals");
        assertThat(sanitizer.sanitizeSegment("../../etc/passwd", "General"))
                .isEqualTo("etc passwd");
        assertThat(sanitizer.sanitizeSegment("...Team\\Name<>|?\"...", "Team"))
                .isEqualTo("Team Name");
        assertThat(sanitizer.sanitizeSegment("   \t\n  ", "Fallback"))
                .isEqualTo("Fallback");
    }

    @Test
    void preservesBahasaMelayuAndUnicodeNames() {
        assertThat(sanitizer.sanitizeSegment("Muhammad Alif bin Abdul Rahman", "Participant"))
                .isEqualTo("Muhammad Alif bin Abdul Rahman");
        assertThat(sanitizer.sanitizeSegment("Sekolah Menengah Kebangsaan (SMK) Seri Puteri", "Team"))
                .isEqualTo("Sekolah Menengah Kebangsaan (SMK) Seri Puteri");
    }

    @Test
    void deduplicatesIdenticalPlayerNamesWithinTeam() {
        Set<String> used = new HashSet<>();
        assertThat(sanitizer.uniquePdfFileName("Ahmad Ali", used)).isEqualTo("Ahmad Ali.pdf");
        assertThat(sanitizer.uniquePdfFileName("Ahmad Ali", used)).isEqualTo("Ahmad Ali (2).pdf");
        assertThat(sanitizer.uniquePdfFileName("ahmad ali", used)).isEqualTo("ahmad ali (3).pdf");
        assertThat(sanitizer.uniquePdfFileName("Siti Aminah", used)).isEqualTo("Siti Aminah.pdf");
    }
}
