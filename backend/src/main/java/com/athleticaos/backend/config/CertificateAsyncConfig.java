package com.athleticaos.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.AsyncSupportConfigurer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Raises the async request timeout to 10 minutes so a full tournament certificate ZIP is not
 * cut off by the default 30-second limit (the downloads are the only async endpoints).
 */
@Configuration
public class CertificateAsyncConfig implements WebMvcConfigurer {

    public static final long CERTIFICATE_DOWNLOAD_TIMEOUT_MS = 600_000L;

    @Override
    public void configureAsyncSupport(AsyncSupportConfigurer configurer) {
        // Only the certificate downloads stream (StreamingResponseBody), so the default async
        // timeout can simply be long enough for a full tournament ZIP. Setting it per request in
        // an interceptor did not work: the interceptor ran before the async context existed.
        configurer.setDefaultTimeout(CERTIFICATE_DOWNLOAD_TIMEOUT_MS);
    }
}
