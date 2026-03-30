package com.athleticaos.backend.utils;

import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

public class URLUtils {
    public static String makeAbsolute(String path) {
        if (path == null || path.isEmpty()) {
            return path;
        }
        if (path.startsWith("http")) {
            return path;
        }
        
        try {
            return ServletUriComponentsBuilder.fromCurrentContextPath()
                    .path(path.startsWith("/") ? path : "/" + path)
                    .toUriString();
        } catch (Exception e) {
            return path;
        }
    }
}
