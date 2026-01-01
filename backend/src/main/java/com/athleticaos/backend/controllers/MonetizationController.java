package com.athleticaos.backend.controllers;

import com.athleticaos.backend.entities.SponsorPackage;
import com.athleticaos.backend.entities.SubscriptionTier;
import com.athleticaos.backend.services.MonetizationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/monetization")
@RequiredArgsConstructor
@Tag(name = "Monetization", description = "Endpoints for managing financial sustainability features")
public class MonetizationController {

    private final MonetizationService monetizationService;

    // --- Sponsor Packages ---

    @GetMapping("/sponsor-packages")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN') or hasAuthority('ROLE_ORG_ADMIN')")
    @Operation(summary = "Get all sponsor packages")
    public ResponseEntity<List<SponsorPackage>> getSponsorPackages(
            @RequestParam(defaultValue = "true") boolean activeOnly) {
        return ResponseEntity.ok(monetizationService.getAllSponsorPackages(activeOnly));
    }

    @PostMapping("/sponsor-packages")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN') or hasAuthority('ROLE_ORG_ADMIN')")
    @Operation(summary = "Create a new sponsor package")
    public ResponseEntity<SponsorPackage> createSponsorPackage(@RequestBody SponsorPackage pkg) {
        return ResponseEntity.ok(monetizationService.createSponsorPackage(pkg));
    }

    @PutMapping("/sponsor-packages/{id}")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN') or hasAuthority('ROLE_ORG_ADMIN')")
    @Operation(summary = "Update a sponsor package")
    public ResponseEntity<SponsorPackage> updateSponsorPackage(@PathVariable UUID id, @RequestBody SponsorPackage pkg) {
        return ResponseEntity.ok(monetizationService.updateSponsorPackage(id, pkg));
    }

    @DeleteMapping("/sponsor-packages/{id}")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN') or hasAuthority('ROLE_ORG_ADMIN')")
    @Operation(summary = "Delete a sponsor package")
    public ResponseEntity<Void> deleteSponsorPackage(@PathVariable UUID id) {
        monetizationService.deleteSponsorPackage(id);
        return ResponseEntity.noContent().build();
    }

    // --- Subscription Tiers ---

    @GetMapping("/subscription-tiers")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN') or hasAuthority('ROLE_ORG_ADMIN')")
    @Operation(summary = "Get all subscription tiers")
    public ResponseEntity<List<SubscriptionTier>> getSubscriptionTiers(
            @RequestParam(defaultValue = "true") boolean activeOnly) {
        return ResponseEntity.ok(monetizationService.getAllSubscriptionTiers(activeOnly));
    }
}
