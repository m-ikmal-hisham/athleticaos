package com.athleticaos.backend.controllers;

import com.athleticaos.backend.dtos.season.SeasonOverviewResponse;
import com.athleticaos.backend.entities.Season;
import com.athleticaos.backend.services.SeasonService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/seasons")
@RequiredArgsConstructor
public class SeasonController {

    private final SeasonService seasonService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Season>> getAllSeasons() {
        return ResponseEntity.ok(seasonService.getAllSeasons());
    }

    @GetMapping("/active")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Season>> getActiveSeasons() {
        return ResponseEntity.ok(seasonService.getActiveSeasons());
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Season> getSeasonById(@PathVariable UUID id) {
        return ResponseEntity.ok(seasonService.getSeasonById(id));
    }

    @GetMapping("/{id}/overview")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<SeasonOverviewResponse> getSeasonOverview(@PathVariable UUID id) {
        return ResponseEntity.ok(seasonService.getSeasonOverview(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('ORG_ADMIN')")
    public ResponseEntity<Season> createSeason(@RequestBody Season season) {
        return ResponseEntity.ok(seasonService.createSeason(season));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('ORG_ADMIN')")
    public ResponseEntity<Season> updateSeason(@PathVariable UUID id, @RequestBody Season season) {
        return ResponseEntity.ok(seasonService.updateSeason(id, season));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('ORG_ADMIN')")
    public ResponseEntity<Season> updateStatus(@PathVariable UUID id, @RequestParam String status) {
        return ResponseEntity.ok(seasonService.updateStatus(id, status));
    }
}
