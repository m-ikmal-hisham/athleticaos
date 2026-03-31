package com.athleticaos.backend.util;

import lombok.extern.slf4j.Slf4j;

@Slf4j
public class UrlSanitizer {

    private static final String HTTP_PREFIX = "http://";
    private static final String HTTPS_PREFIX = "https://";
    private static final String STAGING_DOMAIN = "staging-api.athleticaos.com";

    /**
     * Sanitizes a URL by ensuring that internal URLs use HTTPS to avoid Mixed Content warnings.
     * This specifically targets the staging environment where the backend is served via 
     * CloudFront and Nginx with SSL, but generated URLs might still use the insecure prefix.
     * 
     * @param url The URL to sanitize (can be null, relative, or absolute).
     * @return The sanitized URL.
     */
    public static String sanitize(String url) {
        if (url == null || url.isEmpty()) {
            return url;
        }

        // Only upgrade if it's an internal URL starting with http://
        if (url.startsWith(HTTP_PREFIX) && url.contains(STAGING_DOMAIN)) {
            // Strip the port :8080 if present and upgrade to https
            String sanitized = url.replaceFirst(HTTP_PREFIX, HTTPS_PREFIX)
                                  .replaceFirst(":8080", "");
            log.debug("Sanitized insecure internal URL: {} -> {}", url, sanitized);
            return sanitized;
        }

        return url;
    }
    
    /**
     * Convenient plural version for list processing.
     */
    public static String sanitizeNullable(String url) {
        return sanitize(url);
    }
}
