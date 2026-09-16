package com.athleticaos.backend.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

class IdentificationRemovalGuardTest {

    private static final List<String> FORBIDDEN_TOKENS = List.of(
            "icOrPassport",
            "ic_or_passport",
            "identificationHash",
            "identification_hash",
            "identificationType",
            "MALAYSIAN_IC",
            "IdentificationUtil",
            "identification-hmac",
            "identificationValue",
            "identification_value",
            "identity-verification",
            "DUPLICATE_IC",
            "IC/Passport"
    );

    @Test
    @DisplayName("backend/src/main/java contains zero forbidden identification tokens")
    void backendMainJavaHasNoIdentificationTokens() throws IOException {
        Path backendMain = Paths.get("src/main/java");
        if (!Files.exists(backendMain)) {
            // fallback if running from project root
            backendMain = Paths.get("backend/src/main/java");
        }
        assertThat(backendMain).exists();

        List<String> violations = new ArrayList<>();
        try (Stream<Path> paths = Files.walk(backendMain)) {
            paths.filter(Files::isRegularFile)
                    .filter(p -> p.toString().endsWith(".java"))
                    .forEach(p -> scanFile(p, violations));
        }

        assertThat(violations)
                .as("Found forbidden identification tokens in backend/src/main/java")
                .isEmpty();
    }

    @Test
    @DisplayName("frontend/src contains zero forbidden identification tokens")
    void frontendSrcHasNoIdentificationTokens() throws IOException {
        Path frontendSrc = Paths.get("../frontend/src");
        if (!Files.exists(frontendSrc)) {
            frontendSrc = Paths.get("frontend/src");
        }
        assertThat(frontendSrc).exists();

        List<String> violations = new ArrayList<>();
        try (Stream<Path> paths = Files.walk(frontendSrc)) {
            paths.filter(Files::isRegularFile)
                    .filter(p -> p.toString().endsWith(".ts") || p.toString().endsWith(".tsx") || p.toString().endsWith(".js") || p.toString().endsWith(".jsx"))
                    .forEach(p -> scanFile(p, violations));
        }

        assertThat(violations)
                .as("Found forbidden identification tokens in frontend/src")
                .isEmpty();
    }

    private void scanFile(Path file, List<String> violations) {
        try {
            List<String> lines = Files.readAllLines(file);
            for (int i = 0; i < lines.size(); i++) {
                String line = lines.get(i);
                for (String token : FORBIDDEN_TOKENS) {
                    if (line.contains(token)) {
                        violations.add(String.format("%s:%d -> %s", file, i + 1, token));
                    }
                }
            }
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }
}
