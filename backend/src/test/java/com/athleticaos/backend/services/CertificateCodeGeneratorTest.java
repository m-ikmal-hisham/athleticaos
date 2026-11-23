package com.athleticaos.backend.services;

import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class CertificateCodeGeneratorTest {

    private final CertificateCodeGenerator generator = new CertificateCodeGenerator();

    @Test
    void generatedCodesMatchLengthAndUnambiguousAlphabet() {
        for (int i = 0; i < 500; i++) {
            String code = generator.generate();
            assertThat(code).hasSize(CertificateCodeGenerator.CODE_LENGTH);
            assertThat(generator.isValidNormalized(code)).isTrue();
            assertThat(code).doesNotContainAnyWhitespaces();
            // No look-alike characters: 0, O, 1, I, L
            assertThat(code).doesNotContain("0", "O", "1", "I", "L");
        }
    }

    @Test
    void generatedCodesAreUniqueAcrossLargeBatch() {
        int count = 10_000;
        Set<String> codes = new HashSet<>(count);
        for (int i = 0; i < count; i++) {
            codes.add(generator.generate());
        }
        assertThat(codes).hasSize(count);
    }

    @Test
    void formatAndNormalizeRoundTrip() {
        String raw = "K7Q2M9PX4D";
        String formatted = generator.format(raw);
        assertThat(formatted).isEqualTo("K7Q2-M9PX-4D");
        assertThat(generator.normalize(" k7q2-m9px-4d ")).isEqualTo(raw);
        assertThat(generator.isValidNormalized("K7Q2M9PX0D")).isFalse(); // contains 0
        assertThat(generator.isValidNormalized("SHORT")).isFalse();
    }
}
