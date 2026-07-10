package com.athleticaos.backend.utils;

import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
public class CookieUtils {

    public static final String COOKIE_NAME = "athos_auth";

    @org.springframework.beans.factory.annotation.Value("${application.security.cookie.secure:false}")
    private boolean isCookieSecure;

    @org.springframework.beans.factory.annotation.Value("${application.security.cookie.same-site:Strict}")
    private String sameSitePolicy;

    /**
     * Create a HttpOnly cookie for the JWT.
     * Max-Age is not set, making it a session cookie (clears on browser close).
     */
    public ResponseCookie createSessionCookie(@org.springframework.lang.NonNull String token) {
        return ResponseCookie.from(COOKIE_NAME, token)
                .httpOnly(true)
                .secure(isCookieSecure)
                .sameSite(sameSitePolicy)
                .path("/")
                .build();
    }

    /**
     * Create a cookie that clears the JWT (logout).
     */
    public ResponseCookie cleanSessionCookie() {
        return ResponseCookie.from(COOKIE_NAME, "")
                .httpOnly(true)
                .secure(isCookieSecure)
                .sameSite(sameSitePolicy)
                .path("/")
                .maxAge(0)
                .build();
    }
}
