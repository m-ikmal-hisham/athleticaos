package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.services.IdentificationHashService;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import java.util.HexFormat;

@Slf4j
@Service
public class IdentificationHashServiceImpl implements IdentificationHashService {

    private static final String HMAC_SHA256 = "HmacSHA256";
    private static final int MIN_KEY_BYTES = 32;

    @Value("${athleticaos.security.identification-hmac-secret:}")
    private String hmacSecretBase64;

    @Value("${athleticaos.security.identification-hmac-version:1}")
    private int activeVersion;

    private byte[] secretKeyBytes;
    private boolean configured;

    public IdentificationHashServiceImpl() {
    }

    public IdentificationHashServiceImpl(String hmacSecretBase64, int activeVersion) {
        this.hmacSecretBase64 = hmacSecretBase64;
        this.activeVersion = activeVersion;
        init();
    }

    @PostConstruct
    public void init() {
        if (hmacSecretBase64 == null || hmacSecretBase64.trim().isEmpty()) {
            log.warn("Identification HMAC secret is not configured. Identification hashing is disabled.");
            this.configured = false;
            return;
        }

        try {
            byte[] decoded = Base64.getDecoder().decode(hmacSecretBase64.trim());
            if (decoded.length < MIN_KEY_BYTES) {
                throw new IllegalStateException("Identification HMAC secret must be at least 32 bytes (256 bits). Decoded length was: " + decoded.length);
            }
            this.secretKeyBytes = decoded;
            this.configured = true;
            log.info("IdentificationHashService initialized successfully (active version: {})", activeVersion);
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException("Identification HMAC secret is not a valid Base64 string", e);
        }
    }

    @Override
    public String computeHash(String normalizedIdentification) {
        return computeHash(normalizedIdentification, activeVersion);
    }

    @Override
    public String computeHash(String normalizedIdentification, int version) {
        if (normalizedIdentification == null || normalizedIdentification.trim().isEmpty()) {
            return null;
        }
        if (!configured) {
            log.debug("Identification HMAC service is not configured; skipping hash computation.");
            return null;
        }

        String normalized = com.athleticaos.backend.utils.IdentificationUtil.normalize(normalizedIdentification);
        if (normalized == null || normalized.isEmpty()) {
            return null;
        }

        String message = "athleticaos:identification:v" + version + ":" + normalized;
        try {
            Mac mac = Mac.getInstance(HMAC_SHA256);
            SecretKeySpec secretKey = new SecretKeySpec(secretKeyBytes, HMAC_SHA256);
            mac.init(secretKey);
            byte[] rawHmac = mac.doFinal(message.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(rawHmac).toLowerCase();
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new IllegalStateException("Failed to compute HMAC-SHA256 for identification", e);
        }
    }

    @Override
    public int getActiveVersion() {
        return activeVersion;
    }

    @Override
    public boolean isConfigured() {
        return configured;
    }
}
