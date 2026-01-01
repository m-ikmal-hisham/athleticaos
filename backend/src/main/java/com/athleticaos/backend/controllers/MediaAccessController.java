package com.athleticaos.backend.controllers;

// Entity import
import com.athleticaos.backend.entities.MediaAsset;
import com.athleticaos.backend.services.MediaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/external/matches")
@RequiredArgsConstructor
@Tag(name = "External Media API", description = "Secure endpoints for media partners")
public class MediaAccessController {

    private final MediaService mediaService;

    @GetMapping("/{matchId}/media")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_MEDIA_PARTNER')")
    @Operation(summary = "Get media assets for a match")
    public ResponseEntity<List<MediaAsset>> getMatchMedia(@PathVariable UUID matchId) {
        return ResponseEntity.ok(mediaService.getAssetsForMatch(matchId));
    }

    @PostMapping("/{matchId}/media")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN') or hasAuthority('ROLE_ORG_ADMIN')")
    @Operation(summary = "Upload media asset (Admin only)")
    public ResponseEntity<MediaAsset> uploadMedia(
            @PathVariable UUID matchId,
            @RequestParam String url,
            @RequestParam String type,
            @RequestParam(required = false) String description) {
        return ResponseEntity.ok(mediaService.uploadAsset(matchId, url, type, description));
    }
}
