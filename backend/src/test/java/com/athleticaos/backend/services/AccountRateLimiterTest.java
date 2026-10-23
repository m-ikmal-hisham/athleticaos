package com.athleticaos.backend.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class AccountRateLimiterTest {

    private static final Instant BASE_TIME = Instant.parse("2026-10-18T12:00:00Z");
    private MutableClock clock;
    private AccountRateLimiter rateLimiter;

    private static class MutableClock extends Clock {
        private Instant instant;
        private final ZoneId zone;

        MutableClock(Instant instant, ZoneId zone) {
            this.instant = instant;
            this.zone = zone;
        }

        void advance(Duration duration) {
            this.instant = this.instant.plus(duration);
        }

        @Override public ZoneId getZone() { return zone; }
        @Override public Clock withZone(ZoneId zone) { return new MutableClock(instant, zone); }
        @Override public Instant instant() { return instant; }
    }

    @BeforeEach
    void setUp() {
        clock = new MutableClock(BASE_TIME, ZoneId.of("UTC"));
        rateLimiter = new AccountRateLimiter(clock);
    }

    @Test
    @DisplayName("forgotPassword allows up to 3 attempts per email per hour")
    void forgotPasswordRateLimitPerEmail() {
        String email = "Player@Example.Com";
        String ip1 = "192.168.1.1";
        String ip2 = "192.168.1.2";
        String ip3 = "192.168.1.3";
        String ip4 = "192.168.1.4";

        assertThat(rateLimiter.tryAcquireForgotPassword(email, ip1)).isTrue();
        assertThat(rateLimiter.tryAcquireForgotPassword(email.toLowerCase(), ip2)).isTrue();
        assertThat(rateLimiter.tryAcquireForgotPassword(email, ip3)).isTrue();

        // 4th attempt for the same email in the same hour is blocked
        assertThat(rateLimiter.tryAcquireForgotPassword(email, ip4)).isFalse();

        // After 61 minutes, email limit resets
        clock.advance(Duration.ofMinutes(61));
        assertThat(rateLimiter.tryAcquireForgotPassword(email, ip4)).isTrue();
    }

    @Test
    @DisplayName("forgotPassword allows up to 10 attempts per IP per hour")
    void forgotPasswordRateLimitPerIp() {
        String ip = "203.0.113.195";

        for (int i = 0; i < 10; i++) {
            assertThat(rateLimiter.tryAcquireForgotPassword("user" + i + "@example.com", ip))
                    .as("Attempt " + (i + 1) + " should be allowed")
                    .isTrue();
        }

        // 11th attempt from same IP is blocked
        assertThat(rateLimiter.tryAcquireForgotPassword("another@example.com", ip)).isFalse();

        // Advance 1 hour -> resets
        clock.advance(Duration.ofMinutes(61));
        assertThat(rateLimiter.tryAcquireForgotPassword("another@example.com", ip)).isTrue();
    }

    @Test
    @DisplayName("resendInvite allows up to 5 attempts per user per hour")
    void resendInviteRateLimitPerUser() {
        UUID userId = UUID.randomUUID();

        for (int i = 0; i < 5; i++) {
            assertThat(rateLimiter.tryAcquireResendInvite(userId))
                    .as("Resend " + (i + 1) + " should be allowed")
                    .isTrue();
        }

        // 6th attempt is blocked
        assertThat(rateLimiter.tryAcquireResendInvite(userId)).isFalse();

        // Advance 61 minutes -> resets
        clock.advance(Duration.ofMinutes(61));
        assertThat(rateLimiter.tryAcquireResendInvite(userId)).isTrue();
    }
}
