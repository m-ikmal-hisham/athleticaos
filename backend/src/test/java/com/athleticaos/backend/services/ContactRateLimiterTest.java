package com.athleticaos.backend.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;

class ContactRateLimiterTest {

    private MutableClock clock;
    private ContactRateLimiter rateLimiter;

    @BeforeEach
    void setUp() {
        clock = new MutableClock(Instant.parse("2026-10-06T10:00:00Z"));
        rateLimiter = new ContactRateLimiter(clock);
    }

    @Test
    @DisplayName("Allows up to 5 submissions within 1 rolling hour, blocks 6th")
    void allowsMax5SubmissionsPerRollingHour() {
        String ip = "192.168.1.10";

        for (int i = 1; i <= 5; i++) {
            assertThat(rateLimiter.tryAcquire(ip))
                    .as("Submission %d should be allowed", i)
                    .isTrue();
        }

        assertThat(rateLimiter.tryAcquire(ip))
                .as("6th submission within the hour should be blocked")
                .isFalse();
        assertThat(rateLimiter.isRateLimited(ip)).isTrue();
    }

    @Test
    @DisplayName("Allows submissions again after rolling hour has elapsed")
    void resetsAfterRollingHour() {
        String ip = "192.168.1.20";

        // 5 submissions at 10:00
        for (int i = 0; i < 5; i++) {
            assertThat(rateLimiter.tryAcquire(ip)).isTrue();
        }
        assertThat(rateLimiter.tryAcquire(ip)).isFalse();

        // Advance clock by 61 minutes (past 1 rolling hour window)
        clock.advance(Duration.ofMinutes(61));

        assertThat(rateLimiter.isRateLimited(ip)).isFalse();
        assertThat(rateLimiter.tryAcquire(ip))
                .as("Should be allowed after rolling hour window expired")
                .isTrue();
    }

    @Test
    @DisplayName("Different IP addresses are rate-limited independently")
    void differentIpsAreIndependent() {
        String ipA = "10.0.0.1";
        String ipB = "10.0.0.2";

        for (int i = 0; i < 5; i++) {
            assertThat(rateLimiter.tryAcquire(ipA)).isTrue();
        }
        assertThat(rateLimiter.tryAcquire(ipA)).isFalse();

        // ipB should still have all 5 attempts available
        for (int i = 0; i < 5; i++) {
            assertThat(rateLimiter.tryAcquire(ipB)).isTrue();
        }
        assertThat(rateLimiter.tryAcquire(ipB)).isFalse();
    }

    @Test
    @DisplayName("Null or blank IP does not block and does not fail")
    void nullOrBlankIpHandledGracefully() {
        assertThat(rateLimiter.tryAcquire(null)).isTrue();
        assertThat(rateLimiter.tryAcquire("")).isTrue();
        assertThat(rateLimiter.tryAcquire("   ")).isTrue();
        assertThat(rateLimiter.isRateLimited(null)).isFalse();
    }

    private static class MutableClock extends Clock {
        private Instant instant;
        private final ZoneId zoneId = ZoneId.of("UTC");

        MutableClock(Instant initial) {
            this.instant = initial;
        }

        void advance(Duration duration) {
            this.instant = this.instant.plus(duration);
        }

        @Override
        public ZoneId getZone() {
            return zoneId;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return instant;
        }
    }
}
