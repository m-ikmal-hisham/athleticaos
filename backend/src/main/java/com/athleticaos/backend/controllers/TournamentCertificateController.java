package com.athleticaos.backend.controllers;

import com.athleticaos.backend.audit.AuditLogger;
import com.athleticaos.backend.dtos.certificate.CertificateDownloadPayload;
import com.athleticaos.backend.dtos.certificate.CertificateIssueResponse;
import com.athleticaos.backend.dtos.certificate.CertificateRosterResponse;
import com.athleticaos.backend.dtos.certificate.CertificateSettingsResponse;
import com.athleticaos.backend.dtos.certificate.CertificateSettingsUpdateRequest;
import com.athleticaos.backend.entities.Tournament;
import com.athleticaos.backend.enums.CertificateDesign;
import com.athleticaos.backend.repositories.TournamentRepository;
import com.athleticaos.backend.services.AccessScopeService;
import com.athleticaos.backend.services.CertificateFileNameSanitizer;
import com.athleticaos.backend.services.CertificatePdfService;
import com.athleticaos.backend.services.CertificateService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Slf4j
@RestController
@RequestMapping("/api/v1/tournaments/{idOrSlug}/certificates")
@RequiredArgsConstructor
@PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_CLUB_ADMIN')")
public class TournamentCertificateController {

    private final TournamentRepository tournamentRepository;
    private final AccessScopeService accessScopeService;
    private final CertificateService certificateService;
    private final CertificatePdfService pdfService;
    private final CertificateFileNameSanitizer fileNameSanitizer;
    private final AuditLogger auditLogger;

    /** Allows only one tournament-wide ZIP export at a time on this server instance. */
    // One tournament-wide ZIP at a time (it renders every certificate on this server). Holds the
    // start time; a lock older than 15 minutes is treated as stale (e.g. a stream that never began)
    // so a lost download cannot block all later ones until a restart.
    private static final long ZIP_LOCK_STALE_MS = 15 * 60 * 1000L;
    private final java.util.concurrent.atomic.AtomicLong tournamentZipStartedAt = new java.util.concurrent.atomic.AtomicLong(0);

    private boolean tryLockTournamentZip() {
        long now = System.currentTimeMillis();
        long current = tournamentZipStartedAt.get();
        if (current != 0 && now - current < ZIP_LOCK_STALE_MS) {
            return false;
        }
        return tournamentZipStartedAt.compareAndSet(current, now);
    }

    private void unlockTournamentZip() {
        tournamentZipStartedAt.set(0);
    }

    @GetMapping("/settings")
    public ResponseEntity<CertificateSettingsResponse> getSettings(@PathVariable String idOrSlug) {
        UUID tournamentId = resolveTournamentInScope(idOrSlug);
        return ResponseEntity.ok(certificateService.getSettings(tournamentId));
    }

    @PutMapping("/settings")
    public ResponseEntity<CertificateSettingsResponse> updateSettings(
            @PathVariable String idOrSlug,
            @Valid @RequestBody CertificateSettingsUpdateRequest request,
            HttpServletRequest httpRequest) {
        UUID tournamentId = resolveTournamentInScope(idOrSlug);
        return ResponseEntity.ok(certificateService.updateSettings(tournamentId, request, httpRequest));
    }

    @PostMapping(value = "/signatures/{slot}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CertificateSettingsResponse> uploadSignature(
            @PathVariable String idOrSlug,
            @PathVariable int slot,
            @RequestParam("file") MultipartFile file,
            HttpServletRequest httpRequest) {
        UUID tournamentId = resolveTournamentInScope(idOrSlug);
        return ResponseEntity.ok(certificateService.uploadSignature(tournamentId, slot, file, httpRequest));
    }

    @DeleteMapping("/signatures/{slot}")
    public ResponseEntity<CertificateSettingsResponse> deleteSignature(
            @PathVariable String idOrSlug,
            @PathVariable int slot,
            HttpServletRequest httpRequest) {
        UUID tournamentId = resolveTournamentInScope(idOrSlug);
        return ResponseEntity.ok(certificateService.deleteSignature(tournamentId, slot, httpRequest));
    }

    @GetMapping("/signatures/{slot}")
    public ResponseEntity<byte[]> getSignature(
            @PathVariable String idOrSlug,
            @PathVariable int slot) {
        UUID tournamentId = resolveTournamentInScope(idOrSlug);
        CertificateService.SignatureBinary sig = certificateService.getSignature(tournamentId, slot);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(sig.contentType()))
                .cacheControl(CacheControl.noStore().cachePrivate())
                .body(sig.bytes());
    }

    @GetMapping("/roster")
    public ResponseEntity<CertificateRosterResponse> getRoster(@PathVariable String idOrSlug) {
        UUID tournamentId = resolveTournamentInScope(idOrSlug);
        return ResponseEntity.ok(certificateService.getRoster(tournamentId));
    }

    @PostMapping("/issue")
    public ResponseEntity<CertificateIssueResponse> issueCertificates(
            @PathVariable String idOrSlug,
            @RequestParam(required = false) UUID teamId,
            HttpServletRequest httpRequest) {
        UUID tournamentId = resolveTournamentInScope(idOrSlug);
        return ResponseEntity.ok(certificateService.issueCertificates(tournamentId, teamId, httpRequest));
    }

    @GetMapping("/preview")
    public ResponseEntity<byte[]> previewCertificate(
            @PathVariable String idOrSlug,
            @RequestParam(required = false) CertificateDesign design) {
        UUID tournamentId = resolveTournamentInScope(idOrSlug);
        byte[] pdf = certificateService.renderPreviewPdf(tournamentId, design);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"certificate-preview.pdf\"")
                .cacheControl(CacheControl.noStore())
                .body(pdf);
    }

    @GetMapping("/download/zip")
    public ResponseEntity<StreamingResponseBody> downloadTournamentZip(
            @PathVariable String idOrSlug,
            HttpServletRequest httpRequest) {
        UUID tournamentId = resolveTournamentInScope(idOrSlug);

        // The return type must stay ResponseEntity<StreamingResponseBody>: with a wildcard body
        // Spring does not stream it. The busy case is therefore an exception, not a JSON body.
        if (!tryLockTournamentZip()) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Another certificate download is running, try again in a minute");
        }

        CertificateDownloadPayload payload;
        try {
            payload = certificateService.prepareTournamentZipPayload(tournamentId);
            auditLogger.logCertificatesDownloaded(
                    tournamentId,
                    payload.getAuditScopeDescription(),
                    payload.getEntries().size(),
                    httpRequest);
        } catch (RuntimeException ex) {
            unlockTournamentZip();
            throw ex;
        }

        StreamingResponseBody stream = outputStream -> {
            try (ZipOutputStream zos = new ZipOutputStream(outputStream)) {
                Map<String, Set<String>> usedNamesByFolder = new HashMap<>();
                for (CertificateDownloadPayload.Entry entry : payload.getEntries()) {
                    String folder = entry.getCategoryFolder() + "/" + entry.getTeamFolder();
                    Set<String> used = usedNamesByFolder.computeIfAbsent(folder, k -> new HashSet<>());
                    String pdfName = fileNameSanitizer.uniquePdfFileName(entry.getRecipientName(), used);
                    String entryPath = folder + "/" + pdfName;

                    byte[] pdfBytes = pdfService.renderSingle(entry.getRenderData());
                    zos.putNextEntry(new ZipEntry(entryPath));
                    zos.write(pdfBytes);
                    zos.closeEntry();
                }
                zos.finish();
            } finally {
                unlockTournamentZip();
            }
        };

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/zip"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + payload.getDownloadFileName() + "\"")
                .body(stream);
    }

    @GetMapping("/teams/{teamId}/download/zip")
    public ResponseEntity<StreamingResponseBody> downloadTeamZip(
            @PathVariable String idOrSlug,
            @PathVariable UUID teamId,
            HttpServletRequest httpRequest) {
        UUID tournamentId = resolveTournamentInScope(idOrSlug);
        CertificateDownloadPayload payload = certificateService.prepareTeamDownloadPayload(tournamentId, teamId);
        auditLogger.logCertificatesDownloaded(
                tournamentId,
                payload.getAuditScopeDescription(),
                payload.getEntries().size(),
                httpRequest);

        StreamingResponseBody stream = outputStream -> {
            try (ZipOutputStream zos = new ZipOutputStream(outputStream)) {
                Set<String> used = new HashSet<>();
                for (CertificateDownloadPayload.Entry entry : payload.getEntries()) {
                    String pdfName = fileNameSanitizer.uniquePdfFileName(entry.getRecipientName(), used);
                    byte[] pdfBytes = pdfService.renderSingle(entry.getRenderData());
                    zos.putNextEntry(new ZipEntry(pdfName));
                    zos.write(pdfBytes);
                    zos.closeEntry();
                }
                zos.finish();
            }
        };

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/zip"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + payload.getDownloadFileName() + ".zip\"")
                .body(stream);
    }

    @GetMapping("/teams/{teamId}/download/pdf")
    public ResponseEntity<byte[]> downloadTeamCombinedPdf(
            @PathVariable String idOrSlug,
            @PathVariable UUID teamId,
            HttpServletRequest httpRequest) {
        UUID tournamentId = resolveTournamentInScope(idOrSlug);
        CertificateDownloadPayload payload = certificateService.prepareTeamDownloadPayload(tournamentId, teamId);
        auditLogger.logCertificatesDownloaded(
                tournamentId,
                payload.getAuditScopeDescription() + " (combined PDF)",
                payload.getEntries().size(),
                httpRequest);

        List<com.athleticaos.backend.dtos.certificate.CertificateRenderData> items = payload.getEntries().stream()
                .map(CertificateDownloadPayload.Entry::getRenderData)
                .toList();
        byte[] combinedPdf = pdfService.renderBatch(items);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + payload.getDownloadFileName() + ".pdf\"")
                .body(combinedPdf);
    }

    @PostMapping("/{certificateId}/revoke")
    public ResponseEntity<CertificateIssueResponse.CertificateSummaryDto> revokeCertificate(
            @PathVariable String idOrSlug,
            @PathVariable UUID certificateId,
            HttpServletRequest httpRequest) {
        UUID tournamentId = resolveTournamentInScope(idOrSlug);
        return ResponseEntity.ok(certificateService.revokeCertificate(tournamentId, certificateId, httpRequest));
    }

    private UUID resolveTournamentInScope(String idOrSlug) {
        Tournament tournament;
        try {
            UUID id = UUID.fromString(idOrSlug);
            tournament = tournamentRepository.findById(id)
                    .orElseThrow(() -> new EntityNotFoundException("Tournament not found"));
        } catch (IllegalArgumentException e) {
            tournament = tournamentRepository.findBySlug(idOrSlug)
                    .orElseThrow(() -> new EntityNotFoundException("Tournament not found"));
        }

        if (!accessScopeService.isTournamentInScope(tournament.getId())) {
            UUID currentUserId = accessScopeService.getCurrentUserId();
            log.warn("Certificate access denied outside organiser scope: userId={}, tournamentId={}",
                    currentUserId, tournament.getId());
            throw new EntityNotFoundException("Tournament not found");
        }
        return tournament.getId();
    }
}
