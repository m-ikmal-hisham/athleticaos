package com.athleticaos.backend.services;

import com.athleticaos.backend.entities.AccountToken;
import com.athleticaos.backend.entities.User;
import com.athleticaos.backend.enums.AccountTokenPurpose;
import com.athleticaos.backend.repositories.AccountTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;

@Slf4j
@Service
@RequiredArgsConstructor
public class AccountTokenService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final AccountTokenRepository accountTokenRepository;

    @Value("${app.accounts.invite-ttl-hours:72}")
    private long inviteTtlHours = 72;

    @Value("${app.accounts.reset-ttl-minutes:60}")
    private long resetTtlMinutes = 60;

    /**
     * Generates a single-use 32-byte cryptographically secure token, invalidates prior unused tokens of the
     * same purpose for the user, stores the SHA-256 hash, and returns the raw token to the caller once.
     */
    @Transactional
    public String createToken(User user, AccountTokenPurpose purpose, User createdBy, String requestIp) {
        LocalDateTime now = LocalDateTime.now();

        // Invalidating earlier unused tokens by setting used_at to now ensures only the latest token is active
        accountTokenRepository.invalidateUnusedTokens(user, purpose, now);

        byte[] randomBytes = new byte[32];
        SECURE_RANDOM.nextBytes(randomBytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

        String tokenHash = sha256Hex(rawToken);

        LocalDateTime expiresAt = (purpose == AccountTokenPurpose.INVITE)
                ? now.plusHours(inviteTtlHours)
                : now.plusMinutes(resetTtlMinutes);

        AccountToken accountToken = AccountToken.builder()
                .user(user)
                .purpose(purpose)
                .tokenHash(tokenHash)
                .expiresAt(expiresAt)
                .createdBy(createdBy)
                .requestIp(requestIp)
                .createdAt(now)
                .build();

        accountTokenRepository.save(accountToken);
        return rawToken;
    }

    /**
     * Finds and validates a token without consuming it.
     * Throws a generic message on any failure to avoid leaking account or token state.
     */
    @Transactional(readOnly = true)
    public AccountToken findValidToken(String rawToken, AccountTokenPurpose purpose) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new IllegalArgumentException("This link is invalid or has expired.");
        }

        String hash = sha256Hex(rawToken.trim());
        AccountToken token = accountTokenRepository.findByTokenHashAndPurpose(hash, purpose)
                .orElseThrow(() -> new IllegalArgumentException("This link is invalid or has expired."));

        validateTokenState(token);
        return token;
    }

    /**
     * Consumes a previously validated token by setting used_at = now().
     */
    @Transactional
    public User consumeToken(AccountToken token) {
        validateTokenState(token);
        token.setUsedAt(LocalDateTime.now());
        accountTokenRepository.save(token);
        return token.getUser();
    }

    /**
     * Finds, validates, and consumes a token in a single call.
     */
    @Transactional
    public User consumeToken(String rawToken, AccountTokenPurpose purpose) {
        AccountToken token = findValidToken(rawToken, purpose);
        return consumeToken(token);
    }

    /**
     * Invalidates unused tokens for a user and purpose (setting used_at = now).
     */
    @Transactional
    public void invalidateUnusedTokens(User user, AccountTokenPurpose purpose) {
        // Invalidating earlier unused tokens by setting used_at to now ensures only the latest token is active
        accountTokenRepository.invalidateUnusedTokens(user, purpose, LocalDateTime.now());
    }

    /**
     * Invalidates all unused tokens for a user across all purposes.
     */
    @Transactional
    public void invalidateAllUnusedTokens(User user) {
        // Invalidating earlier unused tokens by setting used_at to now ensures only the latest token is active
        accountTokenRepository.invalidateAllUnusedTokens(user, LocalDateTime.now());
    }

    private void validateTokenState(AccountToken token) {
        LocalDateTime now = LocalDateTime.now();
        if (token.getUsedAt() != null) {
            throw new IllegalArgumentException("This link is invalid or has expired.");
        }
        if (token.getExpiresAt().isBefore(now)) {
            throw new IllegalArgumentException("This link is invalid or has expired.");
        }
        if (token.getUser() == null || !token.getUser().isActive()) {
            throw new IllegalArgumentException("This link is invalid or has expired.");
        }
    }

    public static String sha256Hex(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }
}
