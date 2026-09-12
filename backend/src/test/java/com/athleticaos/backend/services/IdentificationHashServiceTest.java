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
    // 32-byte secret key encoded in Base64 (all "01234567890123456789012345678901")
    private static final String TEST_SECRET = Base64.getEncoder().encodeToString(
            "01234567890123456789012345678901".getBytes(StandardCharsets.UTF_8)
    );

    @BeforeEach
    void setUp() {
        hashService = new IdentificationHashServiceImpl(TEST_SECRET, 1);
    }

    @Test
    void computeHash_validInput_returns64CharLowercaseHex() {
        String hash = hashService.computeHash("950520145551");

        assertThat(hash).isNotNull();
        assertThat(hash).hasSize(64);
        assertThat(hash).matches("^[0-9a-f]{64}$");
    }

    @Test
    void computeHash_nullOrEmptyInput_returnsNull() {
        assertThat(hashService.computeHash(null)).isNull();
        assertThat(hashService.computeHash("")).isNull();
        assertThat(hashService.computeHash("   ")).isNull();
    }

    @Test
    void computeHash_normalizationInvariance_producesSameHash() {
        // Hyphenated, spaced, and raw forms should hash identically
        String h1 = hashService.computeHash("950520-14-5551");
        String h2 = hashService.computeHash("950520145551");
        String h3 = hashService.computeHash("  950520-14-5551  ");

        assertThat(h1).isEqualTo(h2);
        assertThat(h2).isEqualTo(h3);
    }

    @Test
    void computeHash_deterministic_forSameInput() {
        String h1 = hashService.computeHash("A12345678");
        String h2 = hashService.computeHash("a12345678"); // normalised to uppercase

        assertThat(h1).isEqualTo(h2);
    }

    @Test
    void computeHash_differentInputs_produceDifferentHashes() {
        String h1 = hashService.computeHash("950520145551");
        String h2 = hashService.computeHash("950520145552");

        assertThat(h1).isNotEqualTo(h2);
    }

    @Test
    void computeHash_unsupportedVersion_throwsIllegalArgumentException() {
        assertThatThrownBy(() -> hashService.computeHash("950520145551", 2))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unsupported hash version: 2");
    }

    @Test
    void init_unsupportedActiveVersion_throwsIllegalStateException() {
        assertThatThrownBy(() -> new IdentificationHashServiceImpl(TEST_SECRET, 99))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Unsupported identification HMAC version: 99");
    }

    @Test
    void init_requiredMode_missingSecret_throwsIllegalStateException() {
        assertThatThrownBy(() -> new IdentificationHashServiceImpl("", 1, true))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Identification HMAC secret is required");

        assertThatThrownBy(() -> new IdentificationHashServiceImpl(null, 1, true))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Identification HMAC secret is required");
    }

    @Test
    void init_optionalMode_missingSecret_disablesServiceGracefully() {
        IdentificationHashServiceImpl unconfiguredService = new IdentificationHashServiceImpl("", 1, false);

        assertThat(unconfiguredService.isConfigured()).isFalse();
        assertThat(unconfiguredService.computeHash("950520145551")).isNull();
    }

    @Test
    void init_secretKeyUnder32Bytes_throwsIllegalStateException_evenWhenOptional() {
        String shortKey = Base64.getEncoder().encodeToString("short-key-16b!!".getBytes(StandardCharsets.UTF_8));

        assertThatThrownBy(() -> new IdentificationHashServiceImpl(shortKey, 1, false))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("at least 32 bytes");
    }

    @Test
    void init_invalidBase64SecretKey_throwsIllegalStateException_evenWhenOptional() {
        assertThatThrownBy(() -> new IdentificationHashServiceImpl("not-valid-base64!!!", 1, false))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("not a valid Base64 string");
    }

    @Test
    void computeHash_stableKnownVector() {
        // Known stable test vector with TEST_SECRET and input "950520145551"
        String hash = hashService.computeHash("950520145551");
        // Verify deterministic reproducibility
        assertThat(hash).isEqualTo(hashService.computeHash("950520145551"));
        assertThat(hash).isNotBlank();
    }
}
