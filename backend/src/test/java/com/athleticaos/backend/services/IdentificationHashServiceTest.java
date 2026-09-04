package com.athleticaos.backend.services;

import com.athleticaos.backend.services.impl.IdentificationHashServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class IdentificationHashServiceTest {

    private IdentificationHashServiceImpl hashService;
    // 32-byte secret key encoded in Base64
    private static final String TEST_SECRET = Base64.getEncoder().encodeToString(
            "01234567890123456789012345678901".getBytes(StandardCharsets.UTF_8)
    );

    @BeforeEach
    void setUp() {
        hashService = new IdentificationHashServiceImpl(TEST_SECRET, 1);
    }

    @Test
    void hash_validInput_returns64CharLowercaseHex() {
        String hash = hashService.hash("950520145551");

        assertThat(hash).isNotNull();
        assertThat(hash).hasSize(64);
        assertThat(hash).matches("^[0-9a-f]{64}$");
    }

    @Test
    void hash_nullOrEmptyInput_returnsNull() {
        assertThat(hashService.hash(null)).isNull();
        assertThat(hashService.hash("")).isNull();
        assertThat(hashService.hash("   ")).isNull();
    }

    @Test
    void hash_normalizationInvariance_producesSameHash() {
        // Hyphenated, spaced, and raw forms should hash identically
        String h1 = hashService.hash("950520-14-5551");
        String h2 = hashService.hash("950520145551");
        String h3 = hashService.hash("  950520-14-5551  ");

        assertThat(h1).isEqualTo(h2);
        assertThat(h2).isEqualTo(h3);
    }

    @Test
    void hash_withSpecificVersion_differentFromDifferentVersion() {
        String hV1 = hashService.hashWithVersion("950520145551", 1);
        String hV2 = hashService.hashWithVersion("950520145551", 2);

        assertThat(hV1).isNotNull();
        assertThat(hV2).isNotNull();
        assertThat(hV1).isNotEqualTo(hV2);
    }

    @Test
    void hash_deterministic_forSameInput() {
        String h1 = hashService.hash("A12345678");
        String h2 = hashService.hash("a12345678"); // normalised to uppercase

        assertThat(h1).isEqualTo(h2);
    }

    @Test
    void init_secretKeyUnder32Bytes_throwsIllegalStateException() {
        String shortKey = Base64.getEncoder().encodeToString("short-key-16b!!".getBytes(StandardCharsets.UTF_8));

        assertThatThrownBy(() -> new IdentificationHashServiceImpl(shortKey, 1))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("at least 32 bytes");
    }

    @Test
    void init_missingSecretKey_disablesService() {
        IdentificationHashServiceImpl unconfiguredService = new IdentificationHashServiceImpl("", 1);

        assertThat(unconfiguredService.isConfigured()).isFalse();
        assertThat(unconfiguredService.hash("950520145551")).isNull();
    }

    @Test
    void init_invalidBase64SecretKey_throwsIllegalStateException() {
        assertThatThrownBy(() -> new IdentificationHashServiceImpl("not-valid-base64!!!", 1))
                .isInstanceOf(IllegalStateException.class);
    }
}
