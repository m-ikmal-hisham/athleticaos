package com.athleticaos.backend.utils;

import jakarta.servlet.http.HttpServletRequest;

public final class ClientIpUtils {

    private ClientIpUtils() {
    }

    /**
     * Extracts the client IP address from the HTTP request.
     */
    public static String getClientIp(HttpServletRequest request) {
        if (request == null) {
            return null;
        }
        return request.getRemoteAddr();
    }
}
