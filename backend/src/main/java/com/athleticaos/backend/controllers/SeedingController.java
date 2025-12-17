package com.athleticaos.backend.controllers;

import com.athleticaos.backend.services.SeedingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/seed")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Seeding", description = "Administrative data seeding endpoints")
@SecurityRequirement(name = "bearerAuth")
public class SeedingController {

    private final SeedingService seedingService;

    @PostMapping("/pilot-data")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Seed Pilot Data", description = "Generates 16 State Union organisations, 1 Men's Open team each, and 40 players per team.")
    public ResponseEntity<String> seedPilotData() {
        log.info("Request to seed pilot data received.");
        seedingService.seedPilotData();
        return ResponseEntity.ok("Pilot data seeding initiated successfully.");
    }

    @PostMapping("/enrich-lineups")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Seed Jerseys & Positions", description = "Assigns jersey numbers (1-40) and XV positions to all players in teams.")
    public ResponseEntity<String> seedLineups() {
        log.info("Request to seed lineups received.");
        seedingService.seedLineups();
        return ResponseEntity.ok("Lineup seeding initiated successfully.");
    }
}
