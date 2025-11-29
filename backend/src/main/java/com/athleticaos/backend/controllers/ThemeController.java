package com.athleticaos.backend.controllers;

import com.athleticaos.backend.dtos.system.ThemeConfigResponse;
import com.athleticaos.backend.dtos.system.ThemeConfigUpdateRequest;
import com.athleticaos.backend.services.ThemeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/themes")
@RequiredArgsConstructor
public class ThemeController {

    private final ThemeService themeService;

    @GetMapping("/{orgId}")
    public ResponseEntity<ThemeConfigResponse> getTheme(@PathVariable UUID orgId) {
        return ResponseEntity.ok(themeService.getThemeByOrganisationId(orgId));
    }

    @PutMapping
    @PreAuthorize("hasAnyRole('CLUB_ADMIN', 'UNION_ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ThemeConfigResponse> updateTheme(@RequestBody @Valid ThemeConfigUpdateRequest request) {
        return ResponseEntity.ok(themeService.updateTheme(request));
    }
}
