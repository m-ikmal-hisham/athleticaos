package com.athleticaos.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;
import java.time.ZoneId;

@Configuration
public class DateTimeConfig {

    public static final ZoneId MALAYSIA_ZONE = ZoneId.of("Asia/Kuala_Lumpur");

    @Bean
    public Clock clock() {
        return Clock.system(MALAYSIA_ZONE);
    }
}
