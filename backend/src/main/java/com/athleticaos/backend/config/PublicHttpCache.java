package com.athleticaos.backend.config;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;

/**
 * Short shared-cache policy for public, anonymous read endpoints (directories, tournament lists,
 * fixtures, standings). Data may be up to 30 s old, and a stale copy may be served for another
 * 2 minutes while the browser/CDN revalidates in the background.
 *
 * <p>Spring Security's default no-cache header is switched off for GET /api/public/** in
 * {@code SecurityConfig}, so this value reaches the client. Do not use on POST endpoints or on
 * anything that depends on the caller's identity.
 */
public final class PublicHttpCache {

    public static final String CACHE_CONTROL = "public, max-age=30, stale-while-revalidate=120";

    private PublicHttpCache() {
    }

    /** 200 OK with the public cache policy. */
    public static <T> ResponseEntity<T> ok(T body) {
        return ResponseEntity.ok().header(HttpHeaders.CACHE_CONTROL, CACHE_CONTROL).body(body);
    }
}
