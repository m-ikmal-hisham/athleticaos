package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.audit.AuditLogger;
import com.athleticaos.backend.dtos.certificate.CertificateDownloadPayload;
import com.athleticaos.backend.dtos.certificate.CertificateIssueResponse;
import com.athleticaos.backend.dtos.certificate.CertificateRenderData;
import com.athleticaos.backend.dtos.certificate.CertificateRosterResponse;
import com.athleticaos.backend.dtos.certificate.CertificateSettingsResponse;
import com.athleticaos.backend.dtos.certificate.CertificateSettingsUpdateRequest;
import com.athleticaos.backend.dtos.certificate.PublicCertificateVerificationResponse;
import com.athleticaos.backend.entities.Certificate;
import com.athleticaos.backend.entities.CertificateSettings;
import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.entities.Person;
import com.athleticaos.backend.entities.Tournament;
import com.athleticaos.backend.entities.TournamentCategory;
import com.athleticaos.backend.entities.TournamentPlayer;
import com.athleticaos.backend.entities.TournamentTeam;
import com.athleticaos.backend.enums.CertificateDesign;
import com.athleticaos.backend.enums.CertificateLanguage;
import com.athleticaos.backend.repositories.CertificateRepository;
import com.athleticaos.backend.repositories.CertificateSettingsRepository;
import com.athleticaos.backend.repositories.TournamentPlayerRepository;
import com.athleticaos.backend.repositories.TournamentRepository;
import com.athleticaos.backend.repositories.TournamentTeamRepository;
import com.athleticaos.backend.services.CertificateCodeGenerator;
import com.athleticaos.backend.services.CertificateFileNameSanitizer;
import com.athleticaos.backend.services.CertificatePdfService;
import com.athleticaos.backend.services.CertificateService;
import com.athleticaos.backend.services.FileStorageService;
import jakarta.annotation.PostConstruct;
import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CertificateServiceImpl implements CertificateService {

    public static final long MAX_SIGNATURE_BYTES = 500L * 1024L; // 500 KB
    private static final int MAX_ACHIEVEMENT_LENGTH = 160;
    private static final int MAX_CODE_GENERATION_ATTEMPTS = 25;

    private final TournamentRepository tournamentRepository;
    private final TournamentTeamRepository tournamentTeamRepository;
    private final TournamentPlayerRepository tournamentPlayerRepository;
    private final CertificateSettingsRepository settingsRepository;
    private final CertificateRepository certificateRepository;
    private final CertificateCodeGenerator codeGenerator;
    private final CertificatePdfService pdfService;
    private final CertificateFileNameSanitizer fileNameSanitizer;
    private final FileStorageService fileStorageService;
    private final AuditLogger auditLogger;
    private final Environment environment;

    @Value("${app.certificates.public-base-url:}")
    private String configuredPublicBaseUrl;

    private String effectivePublicBaseUrl;
    private String verificationDisplayHost;

    @PostConstruct
    void initPublicBaseUrl() {
        String trimmed = configuredPublicBaseUrl != null ? configuredPublicBaseUrl.trim() : "";
        while (trimmed.endsWith("/")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }
        if (trimmed.isEmpty()) {
            boolean isDev = Arrays.asList(environment.getActiveProfiles()).contains("dev");
            if (!isDev) {
                log.error("app.certificates.public-base-url is not configured; QR codes and verification URLs will be hidden on certificates.");
            } else {
                log.warn("app.certificates.public-base-url is not configured in dev; QR codes and verification URLs will be hidden on certificates.");
            }
            this.effectivePublicBaseUrl = null;
            this.verificationDisplayHost = null;
            return;
        }
        this.effectivePublicBaseUrl = trimmed;
        this.verificationDisplayHost = extractDisplayHost(trimmed);
    }

    private String extractDisplayHost(String baseUrl) {
        try {
            URI uri = URI.create(baseUrl);
            String host = uri.getHost();
            if (host != null && !host.isBlank()) {
                String port = uri.getPort() > 0 ? ":" + uri.getPort() : "";
                return host + port + "/certificates";
            }
        } catch (Exception ignored) {
            // fall through
        }
        return baseUrl.replaceFirst("^https?://", "") + "/certificates";
    }

    @Override
    @Transactional(readOnly = true)
    public CertificateSettingsResponse getSettings(UUID tournamentId) {
        Tournament tournament = loadTournamentWithOrg(tournamentId);
        CertificateSettings settings = settingsRepository.findByTournamentId(tournamentId)
                .orElseGet(() -> defaultSettingsFor(tournament));
        return toSettingsResponse(tournament, settings);
    }

    @Override
    @Transactional
    public CertificateSettingsResponse updateSettings(UUID tournamentId, CertificateSettingsUpdateRequest request, HttpServletRequest httpRequest) {
        Tournament tournament = loadTournamentWithOrg(tournamentId);
        CertificateSettings settings = settingsRepository.findByTournamentId(tournamentId)
                .orElseGet(() -> defaultSettingsFor(tournament));

        settings.setDesign(request.getDesign() != null ? request.getDesign() : CertificateDesign.MODERN);
        settings.setTitle(trimToNull(request.getTitle()));
        settings.setLanguage(request.getLanguage() != null ? request.getLanguage() : CertificateLanguage.EN);
        settings.setRemark(trimToNull(request.getRemark()));
        settings.setIssueDate(request.getIssueDate());
        settings.setSignatory1Name(trimToNull(request.getSignatory1Name()));
        settings.setSignatory1Title(trimToNull(request.getSignatory1Title()));
        settings.setSignatory2Name(trimToNull(request.getSignatory2Name()));
        settings.setSignatory2Title(trimToNull(request.getSignatory2Title()));
        settings.setShowVerification(request.isShowVerification());

        Map<String, String> sanitizedAchievements = new LinkedHashMap<>();
        if (request.getTeamAchievements() != null) {
            for (Map.Entry<String, String> entry : request.getTeamAchievements().entrySet()) {
                if (entry.getKey() == null || entry.getKey().isBlank()) continue;
                try {
                    UUID.fromString(entry.getKey().trim());
                } catch (IllegalArgumentException e) {
                    throw new IllegalArgumentException("Invalid team ID in teamAchievements: " + entry.getKey());
                }
                String val = trimToNull(entry.getValue());
                if (val != null) {
                    if (val.length() > MAX_ACHIEVEMENT_LENGTH) {
                        throw new IllegalArgumentException("Achievement text must be at most " + MAX_ACHIEVEMENT_LENGTH + " characters");
                    }
                    sanitizedAchievements.put(entry.getKey().trim(), val);
                }
            }
        }
        settings.setTeamAchievements(sanitizedAchievements);

        CertificateSettings saved = settingsRepository.save(settings);
        auditLogger.logCertificateSettingsUpdated(tournament.getId(), tournament.getName(), saved.getDesign().name(), httpRequest);
        return toSettingsResponse(tournament, saved);
    }

    @Override
    @Transactional
    public CertificateSettingsResponse uploadSignature(UUID tournamentId, int slot, MultipartFile file, HttpServletRequest httpRequest) {
        validateSlot(slot);
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Signature image file is required");
        }
        if (file.getSize() > MAX_SIGNATURE_BYTES) {
            throw new IllegalArgumentException("Signature image must be 500 KB or smaller");
        }
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new IllegalArgumentException("Could not read uploaded signature file", e);
        }
        if (bytes.length > MAX_SIGNATURE_BYTES) {
            throw new IllegalArgumentException("Signature image must be 500 KB or smaller");
        }

        String detectedContentType = detectPngOrJpeg(bytes);
        if (detectedContentType == null) {
            throw new IllegalArgumentException("Signature image must be a valid PNG or JPEG file");
        }

        Tournament tournament = loadTournamentWithOrg(tournamentId);
        CertificateSettings settings = settingsRepository.findByTournamentId(tournamentId)
                .orElseGet(() -> defaultSettingsFor(tournament));

        if (slot == 1) {
            settings.setSignature1Image(bytes);
            settings.setSignature1ContentType(detectedContentType);
        } else {
            settings.setSignature2Image(bytes);
            settings.setSignature2ContentType(detectedContentType);
        }

        CertificateSettings saved = settingsRepository.save(settings);
        auditLogger.logCertificateSettingsUpdated(tournament.getId(), tournament.getName(), saved.getDesign().name(), httpRequest);
        return toSettingsResponse(tournament, saved);
    }

    @Override
    @Transactional
    public CertificateSettingsResponse deleteSignature(UUID tournamentId, int slot, HttpServletRequest httpRequest) {
        validateSlot(slot);
        Tournament tournament = loadTournamentWithOrg(tournamentId);
        CertificateSettings settings = settingsRepository.findByTournamentId(tournamentId)
                .orElseGet(() -> defaultSettingsFor(tournament));

        if (slot == 1) {
            settings.setSignature1Image(null);
            settings.setSignature1ContentType(null);
        } else {
            settings.setSignature2Image(null);
            settings.setSignature2ContentType(null);
        }

        CertificateSettings saved = settingsRepository.save(settings);
        auditLogger.logCertificateSettingsUpdated(tournament.getId(), tournament.getName(), saved.getDesign().name(), httpRequest);
        return toSettingsResponse(tournament, saved);
    }

    @Override
    @Transactional(readOnly = true)
    public SignatureBinary getSignature(UUID tournamentId, int slot) {
        validateSlot(slot);
        CertificateSettings settings = settingsRepository.findByTournamentId(tournamentId)
                .orElseThrow(() -> new EntityNotFoundException("Signature not found"));

        byte[] bytes = slot == 1 ? settings.getSignature1Image() : settings.getSignature2Image();
        String contentType = slot == 1 ? settings.getSignature1ContentType() : settings.getSignature2ContentType();
        if (bytes == null || bytes.length == 0 || contentType == null) {
            throw new EntityNotFoundException("Signature not found");
        }
        return new SignatureBinary(bytes, contentType);
    }

    @Override
    @Transactional(readOnly = true)
    public CertificateRosterResponse getRoster(UUID tournamentId) {
        Tournament tournament = loadTournamentWithOrg(tournamentId);
        CertificateSettings settings = settingsRepository.findByTournamentId(tournamentId)
                .orElseGet(() -> defaultSettingsFor(tournament));

        List<TournamentTeam> activeTeams = tournamentTeamRepository.findByTournamentIdWithTeamAndOrganisation(tournamentId);
        List<TournamentPlayer> activePlayers = tournamentPlayerRepository.findByTournamentIdAndIsActiveTrueWithPlayerAndPerson(tournamentId);
        List<Certificate> existingCertificates = certificateRepository.findByTournamentId(tournamentId);

        Map<String, Certificate> certByTeamPlayer = new HashMap<>();
        for (Certificate c : existingCertificates) {
            certByTeamPlayer.put(teamPlayerKey(c.getTeam().getId(), c.getPlayer().getId()), c);
        }

        Map<UUID, List<TournamentPlayer>> playersByTeamId = new HashMap<>();
        for (TournamentPlayer tp : activePlayers) {
            playersByTeamId.computeIfAbsent(tp.getTeam().getId(), k -> new ArrayList<>()).add(tp);
        }

        Map<String, String> achievements = settings.getTeamAchievements() != null ? settings.getTeamAchievements() : Map.of();

        // Group active teams by category (null category falls back to tournament ageGroupLabel / General / Umum)
        Map<String, CertificateRosterResponse.CategoryGroup> categoryMap = new LinkedHashMap<>();
        activeTeams.sort(Comparator
                .comparing((TournamentTeam tt) -> resolveCategoryName(tt.getCategory(), tournament, settings.getLanguage()), String.CASE_INSENSITIVE_ORDER)
                .thenComparing(tt -> tt.getTeam().getName(), String.CASE_INSENSITIVE_ORDER));

        int totalActive = 0;
        int totalIssued = 0;
        int totalRevoked = 0;

        for (TournamentTeam tt : activeTeams) {
            UUID catId = tt.getCategory() != null ? tt.getCategory().getId() : null;
            String catName = resolveCategoryName(tt.getCategory(), tournament, settings.getLanguage());
            String catKey = catId != null ? catId.toString() : "UNCATEGORISED";

            CertificateRosterResponse.CategoryGroup catGroup = categoryMap.computeIfAbsent(
                    catKey,
                    k -> CertificateRosterResponse.CategoryGroup.builder()
                            .categoryId(catId)
                            .categoryName(catName)
                            .teams(new ArrayList<>())
                            .build()
            );

            UUID teamId = tt.getTeam().getId();
            List<TournamentPlayer> teamPlayers = playersByTeamId.getOrDefault(teamId, List.of());
            teamPlayers = new ArrayList<>(teamPlayers);
            teamPlayers.sort(Comparator.comparing(tp -> buildFullName(tp.getPlayer().getPerson()), String.CASE_INSENSITIVE_ORDER));

            List<CertificateRosterResponse.PlayerCertificateItem> playerItems = new ArrayList<>();
            int teamIssued = 0;
            int teamRevoked = 0;

            for (TournamentPlayer tp : teamPlayers) {
                totalActive++;
                Certificate cert = certByTeamPlayer.get(teamPlayerKey(teamId, tp.getPlayer().getId()));
                String status = "NOT_ISSUED";
                if (cert != null) {
                    if (cert.isRevoked()) {
                        status = "REVOKED";
                        teamRevoked++;
                        totalRevoked++;
                    } else {
                        status = "VALID";
                        teamIssued++;
                        totalIssued++;
                    }
                }
                playerItems.add(CertificateRosterResponse.PlayerCertificateItem.builder()
                        .playerId(tp.getPlayer().getId())
                        .fullName(buildFullName(tp.getPlayer().getPerson()))
                        .certificateId(cert != null ? cert.getId() : null)
                        .code(cert != null ? codeGenerator.format(cert.getCode()) : null)
                        .status(status)
                        .issuedAt(cert != null ? cert.getIssuedAt() : null)
                        .revokedAt(cert != null ? cert.getRevokedAt() : null)
                        .build());
            }

            catGroup.getTeams().add(CertificateRosterResponse.TeamGroup.builder()
                    .teamId(teamId)
                    .teamName(tt.getTeam().getName())
                    .achievementText(achievements.get(teamId.toString()))
                    .activePlayerCount(playerItems.size())
                    .issuedCount(teamIssued)
                    .revokedCount(teamRevoked)
                    .players(playerItems)
                    .build());
        }

        return CertificateRosterResponse.builder()
                .tournamentId(tournamentId)
                .totalActivePlayers(totalActive)
                .totalIssued(totalIssued)
                .totalRevoked(totalRevoked)
                .categories(new ArrayList<>(categoryMap.values()))
                .build();
    }

    @Override
    @Transactional
    public CertificateIssueResponse issueCertificates(UUID tournamentId, UUID teamId, HttpServletRequest httpRequest) {
        Tournament tournament = loadTournamentWithOrg(tournamentId);
        CertificateSettings settings = settingsRepository.findByTournamentId(tournamentId)
                .orElseGet(() -> settingsRepository.save(defaultSettingsFor(tournament)));

        List<TournamentTeam> activeTeams = tournamentTeamRepository.findByTournamentIdWithTeamAndOrganisation(tournamentId);
        Map<UUID, TournamentTeam> activeTeamMap = new LinkedHashMap<>();
        for (TournamentTeam tt : activeTeams) {
            if (teamId == null || tt.getTeam().getId().equals(teamId)) {
                activeTeamMap.put(tt.getTeam().getId(), tt);
            }
        }
        if (teamId != null && activeTeamMap.isEmpty()) {
            throw new EntityNotFoundException("Team not found in this tournament");
        }

        List<TournamentPlayer> activePlayers = tournamentPlayerRepository.findByTournamentIdAndIsActiveTrueWithPlayerAndPerson(tournamentId);
        List<Certificate> existingList = (teamId == null)
                ? certificateRepository.findByTournamentId(tournamentId)
                : certificateRepository.findByTournamentIdAndTeamId(tournamentId, teamId);

        Map<String, Certificate> existingByKey = new HashMap<>();
        for (Certificate c : existingList) {
            existingByKey.put(teamPlayerKey(c.getTeam().getId(), c.getPlayer().getId()), c);
        }

        Map<String, String> achievements = settings.getTeamAchievements() != null ? settings.getTeamAchievements() : Map.of();
        Set<String> newlyGeneratedCodes = new HashSet<>();
        List<Certificate> toSave = new ArrayList<>();

        int created = 0;
        int updated = 0;
        int skippedRevoked = 0;
        int totalValid = 0;

        for (TournamentPlayer tp : activePlayers) {
            UUID tId = tp.getTeam().getId();
            TournamentTeam tt = activeTeamMap.get(tId);
            if (tt == null) {
                continue;
            }
            String fullName = buildFullName(tp.getPlayer().getPerson());
            String achievement = trimToNull(achievements.get(tId.toString()));
            String key = teamPlayerKey(tId, tp.getPlayer().getId());

            Certificate existing = existingByKey.get(key);
            if (existing == null) {
                String code = allocateUniqueCode(newlyGeneratedCodes);
                Certificate createdCert = Certificate.builder()
                        .code(code)
                        .tournament(tournament)
                        .category(tt.getCategory())
                        .team(tt.getTeam())
                        .player(tp.getPlayer())
                        .recipientName(fullName)
                        .achievementText(achievement)
                        .issuedAt(LocalDateTime.now())
                        .build();
                toSave.add(createdCert);
                created++;
                totalValid++;
            } else if (existing.isRevoked()) {
                // Never un-revoke
                skippedRevoked++;
            } else {
                boolean changed = false;
                if (!fullName.equals(existing.getRecipientName())) {
                    existing.setRecipientName(fullName);
                    changed = true;
                }
                if (!java.util.Objects.equals(achievement, existing.getAchievementText())) {
                    existing.setAchievementText(achievement);
                    changed = true;
                }
                UUID existingCatId = existing.getCategory() != null ? existing.getCategory().getId() : null;
                UUID newCatId = tt.getCategory() != null ? tt.getCategory().getId() : null;
                if (!java.util.Objects.equals(existingCatId, newCatId)) {
                    existing.setCategory(tt.getCategory());
                    changed = true;
                }
                if (changed) {
                    toSave.add(existing);
                    updated++;
                }
                totalValid++;
            }
        }

        if (!toSave.isEmpty()) {
            certificateRepository.saveAll(toSave);
        }

        auditLogger.logCertificatesIssued(tournament.getId(), tournament.getName(), created, updated, httpRequest);

        return CertificateIssueResponse.builder()
                .createdCount(created)
                .updatedCount(updated)
                .skippedRevokedCount(skippedRevoked)
                .totalValidCount(totalValid)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] renderPreviewPdf(UUID tournamentId, CertificateDesign designOverride) {
        Tournament tournament = loadTournamentWithOrg(tournamentId);
        CertificateSettings settings = settingsRepository.findByTournamentId(tournamentId)
                .orElseGet(() -> defaultSettingsFor(tournament));

        CertificateDesign effectiveDesign = designOverride != null
                ? designOverride
                : (settings.getDesign() != null ? settings.getDesign() : CertificateDesign.MODERN);

        List<TournamentTeam> activeTeams = tournamentTeamRepository.findByTournamentIdWithTeamAndOrganisation(tournamentId);
        List<TournamentPlayer> activePlayers = tournamentPlayerRepository.findByTournamentIdAndIsActiveTrueWithPlayerAndPerson(tournamentId);

        String sampleName = "Ahmad Faris bin Ismail";
        String sampleTeam = "Sample Barbarians RFC";
        String sampleCategory = resolveCategoryName(null, tournament, settings.getLanguage());
        String sampleAchievement = null;

        Map<UUID, TournamentTeam> teamLookup = new HashMap<>();
        for (TournamentTeam tt : activeTeams) {
            teamLookup.put(tt.getTeam().getId(), tt);
        }

        for (TournamentPlayer tp : activePlayers) {
            TournamentTeam tt = teamLookup.get(tp.getTeam().getId());
            if (tt != null) {
                sampleName = buildFullName(tp.getPlayer().getPerson());
                sampleTeam = tt.getTeam().getName();
                sampleCategory = resolveCategoryName(tt.getCategory(), tournament, settings.getLanguage());
                if (settings.getTeamAchievements() != null) {
                    sampleAchievement = trimToNull(settings.getTeamAchievements().get(tt.getTeam().getId().toString()));
                }
                break;
            }
        }
        if (sampleAchievement == null && settings.getTeamAchievements() != null) {
            sampleAchievement = settings.getTeamAchievements().values().stream()
                    .filter(v -> v != null && !v.isBlank())
                    .findFirst()
                    .orElse(null);
        }

        ImageAssets assets = loadImageAssets(tournament, settings);
        String previewCode = "DEMO-0000-00";
        String previewUrl = buildVerificationUrl(settings, "DEMO000000");

        CertificateRenderData renderData = buildRenderData(
                tournament, settings, effectiveDesign, assets,
                sampleName, sampleTeam, sampleCategory, sampleAchievement,
                previewCode, previewUrl);

        return pdfService.renderSingle(renderData);
    }

    @Override
    @Transactional(readOnly = true)
    public CertificateDownloadPayload prepareTournamentZipPayload(UUID tournamentId) {
        Tournament tournament = loadTournamentWithOrg(tournamentId);
        CertificateSettings settings = settingsRepository.findByTournamentId(tournamentId)
                .orElseGet(() -> defaultSettingsFor(tournament));

        List<Certificate> validCerts = certificateRepository.findValidByTournamentIdWithTeamAndCategory(tournamentId);
        if (validCerts.isEmpty()) {
            throw new IllegalStateException("No issued certificates found for this tournament. Issue certificates first.");
        }

        ImageAssets assets = loadImageAssets(tournament, settings);
        List<CertificateDownloadPayload.Entry> entries = buildDownloadEntries(tournament, settings, assets, validCerts);
        String fileBase = fileNameSanitizer.sanitizeSegment(tournament.getName(), "tournament");

        return CertificateDownloadPayload.builder()
                .downloadFileName(fileBase + "-certificates.zip")
                .auditScopeDescription("Tournament ZIP: " + tournament.getName())
                .entries(entries)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public CertificateDownloadPayload prepareTeamDownloadPayload(UUID tournamentId, UUID teamId) {
        Tournament tournament = loadTournamentWithOrg(tournamentId);
        CertificateSettings settings = settingsRepository.findByTournamentId(tournamentId)
                .orElseGet(() -> defaultSettingsFor(tournament));

        List<Certificate> validCerts = certificateRepository.findValidByTournamentIdAndTeamIdWithTeamAndCategory(tournamentId, teamId);
        if (validCerts.isEmpty()) {
            throw new IllegalStateException("No issued certificates found for this team. Issue certificates first.");
        }

        ImageAssets assets = loadImageAssets(tournament, settings);
        List<CertificateDownloadPayload.Entry> entries = buildDownloadEntries(tournament, settings, assets, validCerts);
        String teamName = validCerts.get(0).getTeam().getName();
        String fileBase = fileNameSanitizer.sanitizeSegment(tournament.getName(), "tournament")
                + "-" + fileNameSanitizer.sanitizeSegment(teamName, "team");

        return CertificateDownloadPayload.builder()
                .downloadFileName(fileBase + "-certificates")
                .auditScopeDescription("Team download: " + teamName + " (" + tournament.getName() + ")")
                .entries(entries)
                .build();
    }

    @Override
    @Transactional
    public CertificateIssueResponse.CertificateSummaryDto revokeCertificate(UUID tournamentId, UUID certificateId, HttpServletRequest httpRequest) {
        Certificate cert = certificateRepository.findByIdAndTournamentId(certificateId, tournamentId)
                .orElseThrow(() -> new EntityNotFoundException("Certificate not found"));

        if (!cert.isRevoked()) {
            cert.setRevokedAt(LocalDateTime.now());
            certificateRepository.save(cert);
            auditLogger.logCertificateRevoked(cert, httpRequest);
        }

        return CertificateIssueResponse.CertificateSummaryDto.builder()
                .id(cert.getId())
                .code(codeGenerator.format(cert.getCode()))
                .recipientName(cert.getRecipientName())
                .status(cert.isRevoked() ? "REVOKED" : "VALID")
                .issuedAt(cert.getIssuedAt())
                .revokedAt(cert.getRevokedAt())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public PublicCertificateVerificationResponse verifyPublic(String rawCode) {
        String normalized = codeGenerator.normalize(rawCode);
        if (!codeGenerator.isValidNormalized(normalized)) {
            throw new EntityNotFoundException("Certificate not found");
        }

        Certificate cert = certificateRepository.findByCodeWithDetails(normalized)
                .orElseThrow(() -> new EntityNotFoundException("Certificate not found"));

        Tournament tournament = cert.getTournament();
        CertificateSettings settings = settingsRepository.findByTournamentId(tournament.getId()).orElse(null);
        if (settings != null && !settings.isShowVerification()) {
            throw new EntityNotFoundException("Certificate not found");
        }

        CertificateLanguage lang = settings != null && settings.getLanguage() != null
                ? settings.getLanguage()
                : CertificateLanguage.EN;
        LocalDate effectiveIssueDate = resolveIssueDate(settings, tournament, cert);

        return PublicCertificateVerificationResponse.builder()
                .code(codeGenerator.format(cert.getCode()))
                .status(cert.isRevoked() ? "REVOKED" : "VALID")
                .recipientName(cert.getRecipientName())
                .teamName(cert.getTeam().getName())
                .categoryName(resolveCategoryName(cert.getCategory(), tournament, lang))
                .achievementText(cert.getAchievementText())
                .tournamentName(tournament.getName())
                .tournamentStartDate(tournament.getStartDate())
                .tournamentEndDate(tournament.getEndDate())
                .tournamentVenue(tournament.getVenue())
                .organiserName(tournament.getOrganiserOrg() != null ? tournament.getOrganiserOrg().getName() : null)
                .issueDate(effectiveIssueDate)
                .revokedAt(cert.getRevokedAt())
                .build();
    }

    // ==================== HELPERS ====================

    private record ImageAssets(
            String tournamentLogoDataUri,
            String organiserLogoDataUri,
            String signature1DataUri,
            String signature2DataUri
    ) {}

    private ImageAssets loadImageAssets(Tournament tournament, CertificateSettings settings) {
        String tournamentLogo = toDataUriFromUploadUrl(tournament.getLogoUrl());
        String organiserLogo = tournament.getOrganiserOrg() != null
                ? toDataUriFromUploadUrl(tournament.getOrganiserOrg().getLogoUrl())
                : null;
        String sig1 = toDataUri(settings.getSignature1Image(), settings.getSignature1ContentType());
        String sig2 = toDataUri(settings.getSignature2Image(), settings.getSignature2ContentType());
        return new ImageAssets(tournamentLogo, organiserLogo, sig1, sig2);
    }

    private List<CertificateDownloadPayload.Entry> buildDownloadEntries(
            Tournament tournament,
            CertificateSettings settings,
            ImageAssets assets,
            List<Certificate> certs) {

        CertificateDesign design = settings.getDesign() != null ? settings.getDesign() : CertificateDesign.MODERN;
        CertificateLanguage lang = settings.getLanguage() != null ? settings.getLanguage() : CertificateLanguage.EN;

        List<Certificate> sorted = new ArrayList<>(certs);
        sorted.sort(Comparator
                .comparing((Certificate c) -> resolveCategoryName(c.getCategory(), tournament, lang), String.CASE_INSENSITIVE_ORDER)
                .thenComparing(c -> c.getTeam().getName(), String.CASE_INSENSITIVE_ORDER)
                .thenComparing(Certificate::getRecipientName, String.CASE_INSENSITIVE_ORDER));

        List<CertificateDownloadPayload.Entry> entries = new ArrayList<>(sorted.size());
        for (Certificate cert : sorted) {
            String catName = resolveCategoryName(cert.getCategory(), tournament, lang);
            String teamName = cert.getTeam().getName();
            String formattedCode = codeGenerator.format(cert.getCode());
            String verificationUrl = buildVerificationUrl(settings, cert.getCode());

            CertificateRenderData renderData = buildRenderData(
                    tournament, settings, design, assets,
                    cert.getRecipientName(), teamName, catName, cert.getAchievementText(),
                    formattedCode, verificationUrl);

            entries.add(CertificateDownloadPayload.Entry.builder()
                    .categoryFolder(fileNameSanitizer.sanitizeSegment(catName, "General"))
                    .teamFolder(fileNameSanitizer.sanitizeSegment(teamName, "Team"))
                    .recipientName(cert.getRecipientName())
                    .renderData(renderData)
                    .build());
        }
        return entries;
    }

    private CertificateRenderData buildRenderData(
            Tournament tournament,
            CertificateSettings settings,
            CertificateDesign design,
            ImageAssets assets,
            String recipientName,
            String teamName,
            String categoryName,
            String achievementText,
            String formattedCode,
            String verificationUrl) {

        Organisation org = tournament.getOrganiserOrg();
        LocalDate effectiveIssueDate = settings.getIssueDate() != null
                ? settings.getIssueDate()
                : (tournament.getEndDate() != null ? tournament.getEndDate() : LocalDate.now());

        return CertificateRenderData.builder()
                .design(design)
                .language(settings.getLanguage() != null ? settings.getLanguage() : CertificateLanguage.EN)
                .customTitle(settings.getTitle())
                .recipientName(recipientName)
                .teamName(teamName)
                .categoryName(categoryName)
                .achievementText(achievementText)
                .tournamentName(tournament.getName())
                .tournamentStartDate(tournament.getStartDate())
                .tournamentEndDate(tournament.getEndDate())
                .tournamentVenue(tournament.getVenue())
                .organiserName(org != null ? org.getName() : null)
                .organiserPrimaryColor(org != null ? org.getPrimaryColor() : null)
                .organiserSecondaryColor(org != null ? org.getSecondaryColor() : null)
                .tournamentLogoDataUri(assets.tournamentLogoDataUri())
                .organiserLogoDataUri(assets.organiserLogoDataUri())
                .remark(settings.getRemark())
                .issueDate(effectiveIssueDate)
                .signatory1Name(settings.getSignatory1Name())
                .signatory1Title(settings.getSignatory1Title())
                .signatory1SignatureDataUri(assets.signature1DataUri())
                .signatory2Name(settings.getSignatory2Name())
                .signatory2Title(settings.getSignatory2Title())
                .signatory2SignatureDataUri(assets.signature2DataUri())
                .showVerification(settings.isShowVerification() && verificationUrl != null)
                .formattedCode(formattedCode)
                .verificationUrl(verificationUrl)
                .verificationDisplayHost(this.verificationDisplayHost)
                .build();
    }

    private String buildVerificationUrl(CertificateSettings settings, String rawCode) {
        if (!settings.isShowVerification() || effectivePublicBaseUrl == null || effectivePublicBaseUrl.isBlank()) {
            return null;
        }
        return effectivePublicBaseUrl + "/certificates/" + codeGenerator.format(rawCode);
    }

    private Tournament loadTournamentWithOrg(UUID tournamentId) {
        Tournament tournament = tournamentRepository.findById(tournamentId)
                .orElseThrow(() -> new EntityNotFoundException("Tournament not found"));
        if (tournament.getOrganiserOrg() != null) {
            // Initialize proxy within transaction
            tournament.getOrganiserOrg().getName();
        }
        return tournament;
    }

    private CertificateSettings defaultSettingsFor(Tournament tournament) {
        return CertificateSettings.builder()
                .tournament(tournament)
                .design(CertificateDesign.MODERN)
                .language(CertificateLanguage.EN)
                .issueDate(tournament.getEndDate())
                .showVerification(true)
                .teamAchievements(new HashMap<>())
                .build();
    }

    private CertificateSettingsResponse toSettingsResponse(Tournament tournament, CertificateSettings settings) {
        Organisation org = tournament.getOrganiserOrg();
        return CertificateSettingsResponse.builder()
                .tournamentId(tournament.getId())
                .design(settings.getDesign() != null ? settings.getDesign() : CertificateDesign.MODERN)
                .title(settings.getTitle())
                .language(settings.getLanguage() != null ? settings.getLanguage() : CertificateLanguage.EN)
                .remark(settings.getRemark())
                .issueDate(settings.getIssueDate())
                .signatory1Name(settings.getSignatory1Name())
                .signatory1Title(settings.getSignatory1Title())
                .hasSignature1(settings.getSignature1Image() != null && settings.getSignature1Image().length > 0)
                .signatory2Name(settings.getSignatory2Name())
                .signatory2Title(settings.getSignatory2Title())
                .hasSignature2(settings.getSignature2Image() != null && settings.getSignature2Image().length > 0)
                .showVerification(settings.isShowVerification())
                .verificationUrlConfigured(this.effectivePublicBaseUrl != null && !this.effectivePublicBaseUrl.isBlank())
                .teamAchievements(settings.getTeamAchievements() != null ? new LinkedHashMap<>(settings.getTeamAchievements()) : new LinkedHashMap<>())
                .tournamentName(tournament.getName())
                .tournamentLogoUrl(tournament.getLogoUrl())
                .organiserName(org != null ? org.getName() : null)
                .organiserLogoUrl(org != null ? org.getLogoUrl() : null)
                .organiserPrimaryColor(org != null ? org.getPrimaryColor() : null)
                .organiserSecondaryColor(org != null ? org.getSecondaryColor() : null)
                .build();
    }

    private String allocateUniqueCode(Set<String> batchCodes) {
        for (int attempt = 0; attempt < MAX_CODE_GENERATION_ATTEMPTS; attempt++) {
            String candidate = codeGenerator.generate();
            if (!batchCodes.contains(candidate) && !certificateRepository.existsByCode(candidate)) {
                batchCodes.add(candidate);
                return candidate;
            }
        }
        throw new IllegalStateException("Unable to allocate unique certificate code after " + MAX_CODE_GENERATION_ATTEMPTS + " attempts");
    }

    private String toDataUriFromUploadUrl(String url) {
        byte[] bytes = fileStorageService.loadUploadedBytesByUrl(url);
        if (bytes == null || bytes.length == 0) {
            return null;
        }
        String mime = detectImageMime(bytes);
        if (mime == null) {
            log.warn("Skipping non-image upload for certificate logo: {}", url);
            return null;
        }
        return toDataUri(bytes, mime);
    }

    private String toDataUri(byte[] bytes, String contentType) {
        if (bytes == null || bytes.length == 0 || contentType == null || contentType.isBlank()) {
            return null;
        }
        FittedImage fitted = fitForCertificate(bytes);
        if (fitted != null) {
            return "data:" + fitted.mime() + ";base64," + Base64.getEncoder().encodeToString(fitted.bytes());
        }
        return "data:" + contentType + ";base64," + Base64.getEncoder().encodeToString(bytes);
    }

    // Logos and signatures print at most about 30 mm wide, so 400 px is plenty at print quality.
    // Without this a 1024 px logo added ~550 KB to every certificate (and ~220 MB to a
    // 400-player tournament ZIP). Returns null to keep the original (already small, or a format
    // ImageIO cannot read such as WebP).
    private static final int CERTIFICATE_IMAGE_MAX_PX = 400;

    private record FittedImage(byte[] bytes, String mime) {}

    private FittedImage fitForCertificate(byte[] bytes) {
        try {
            java.awt.image.BufferedImage src = javax.imageio.ImageIO.read(new java.io.ByteArrayInputStream(bytes));
            if (src == null) {
                return null;
            }
            int w = src.getWidth();
            int h = src.getHeight();
            if (Math.max(w, h) <= CERTIFICATE_IMAGE_MAX_PX && bytes.length <= 120 * 1024) {
                return null;
            }
            double scale = Math.min(1.0, (double) CERTIFICATE_IMAGE_MAX_PX / Math.max(w, h));
            int nw = Math.max(1, (int) Math.round(w * scale));
            int nh = Math.max(1, (int) Math.round(h * scale));
            // Transparent logos stay PNG; opaque ones (photos, JPEG logos) become JPEG, which is
            // several times smaller for that kind of image.
            boolean alpha = src.getColorModel().hasAlpha();
            java.awt.image.BufferedImage out = new java.awt.image.BufferedImage(nw, nh,
                    alpha ? java.awt.image.BufferedImage.TYPE_INT_ARGB : java.awt.image.BufferedImage.TYPE_INT_RGB);
            java.awt.Graphics2D g = out.createGraphics();
            try {
                g.setRenderingHint(java.awt.RenderingHints.KEY_INTERPOLATION, java.awt.RenderingHints.VALUE_INTERPOLATION_BICUBIC);
                g.setRenderingHint(java.awt.RenderingHints.KEY_RENDERING, java.awt.RenderingHints.VALUE_RENDER_QUALITY);
                if (!alpha) {
                    g.setColor(java.awt.Color.WHITE);
                    g.fillRect(0, 0, nw, nh);
                }
                g.drawImage(src, 0, 0, nw, nh, null);
            } finally {
                g.dispose();
            }
            java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
            String mime;
            if (alpha) {
                javax.imageio.ImageIO.write(out, "png", baos);
                mime = "image/png";
            } else {
                javax.imageio.ImageWriter writer = javax.imageio.ImageIO.getImageWritersByFormatName("jpg").next();
                javax.imageio.ImageWriteParam param = writer.getDefaultWriteParam();
                param.setCompressionMode(javax.imageio.ImageWriteParam.MODE_EXPLICIT);
                param.setCompressionQuality(0.88f);
                try (javax.imageio.stream.ImageOutputStream ios = javax.imageio.ImageIO.createImageOutputStream(baos)) {
                    writer.setOutput(ios);
                    writer.write(null, new javax.imageio.IIOImage(out, null, null), param);
                } finally {
                    writer.dispose();
                }
                mime = "image/jpeg";
            }
            byte[] result = baos.toByteArray();
            return result.length < bytes.length ? new FittedImage(result, mime) : null;
        } catch (java.io.IOException | RuntimeException ex) {
            log.warn("Could not resize certificate image, using it as supplied: {}", ex.getMessage());
            return null;
        }
    }

    private LocalDate resolveIssueDate(CertificateSettings settings, Tournament tournament, Certificate cert) {
        if (settings != null && settings.getIssueDate() != null) {
            return settings.getIssueDate();
        }
        if (cert.getIssuedAt() != null) {
            return cert.getIssuedAt().toLocalDate();
        }
        return tournament.getEndDate();
    }

    private String resolveCategoryName(TournamentCategory category, Tournament tournament, CertificateLanguage lang) {
        if (category != null && category.getName() != null && !category.getName().isBlank()) {
            return category.getName().trim();
        }
        if (tournament.getAgeGroupLabel() != null && !tournament.getAgeGroupLabel().isBlank()) {
            return tournament.getAgeGroupLabel().trim();
        }
        return lang == CertificateLanguage.MS ? "Umum" : "General";
    }

    private String buildFullName(Person person) {
        if (person == null) {
            return "Participant";
        }
        String first = person.getFirstName() != null ? person.getFirstName().trim() : "";
        String last = person.getLastName() != null ? person.getLastName().trim() : "";
        String combined = (first + " " + last).replaceAll("\\s+", " ").trim();
        return combined.isEmpty() ? "Participant" : combined;
    }

    private String teamPlayerKey(UUID teamId, UUID playerId) {
        return teamId.toString() + ":" + playerId.toString();
    }

    private void validateSlot(int slot) {
        if (slot != 1 && slot != 2) {
            throw new IllegalArgumentException("Signature slot must be 1 or 2");
        }
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String t = value.trim();
        return t.isEmpty() ? null : t;
    }

    /**
     * Strictly checks PNG or JPEG magic bytes for private signature uploads.
     */
    static String detectPngOrJpeg(byte[] bytes) {
        if (bytes == null || bytes.length < 8) {
            return null;
        }
        // PNG: 89 50 4E 47 0D 0A 1A 0A
        if ((bytes[0] & 0xFF) == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47
                && bytes[4] == 0x0D && bytes[5] == 0x0A && bytes[6] == 0x1A && bytes[7] == 0x0A) {
            return "image/png";
        }
        // JPEG: FF D8 FF
        if ((bytes[0] & 0xFF) == 0xFF && (bytes[1] & 0xFF) == 0xD8 && (bytes[2] & 0xFF) == 0xFF) {
            return "image/jpeg";
        }
        return null;
    }

    /**
     * Checks PNG, JPEG, GIF, or WebP magic bytes for tournament/organiser logos.
     */
    static String detectImageMime(byte[] bytes) {
        String pngOrJpeg = detectPngOrJpeg(bytes);
        if (pngOrJpeg != null) {
            return pngOrJpeg;
        }
        if (bytes != null && bytes.length >= 12) {
            // GIF87a / GIF89a
            if (bytes[0] == 'G' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == '8') {
                return "image/gif";
            }
            // RIFF....WEBP
            if (bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F'
                    && bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P') {
                return "image/webp";
            }
        }
        return null;
    }
}
