package com.athleticaos.backend.controllers;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.PropertySource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/system")
@PropertySource(value = "classpath:git.properties", ignoreResourceNotFound = true)
public class SystemInfoController {

    @Value("${git.commit.id.full:unknown}")
    private String commitId;

    @Value("${git.build.time:unknown}")
    private String buildTime;

    @Value("${spring.profiles.active:dev}")
    private String activeProfile;

    @GetMapping("/info")
    public ResponseEntity<Map<String, Object>> getSystemInfo() {
        Map<String, Object> info = new HashMap<>();
        info.put("commitId", commitId);
        info.put("buildTime", buildTime);
        info.put("env", activeProfile);
        info.put("version", "0.0.1-SNAPSHOT");
        return ResponseEntity.ok(info);
    }
}
