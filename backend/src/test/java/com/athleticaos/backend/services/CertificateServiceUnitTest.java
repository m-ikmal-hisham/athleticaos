package com.athleticaos.backend.services;

import com.athleticaos.backend.audit.AuditLogger;
import com.athleticaos.backend.dtos.certificate.CertificateRenderData;
import com.athleticaos.backend.dtos.certificate.CertificateSettingsUpdateRequest;
import com.athleticaos.backend.dtos.certificate.PublicCertificateVerificationResponse;
import com.athleticaos.backend.entities.Certificate;
import com.athleticaos.backend.entities.CertificateSettings;
import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.entities.Team;
import com.athleticaos.backend.entities.Tournament;
import com.athleticaos.backend.entities.TournamentCategory;
import com.athleticaos.backend.enums.CertificateDesign;
import com.athleticaos.backend.enums.CertificateLanguage;
import com.athleticaos.backend.repositories.CertificateRepository;
import com.athleticaos.backend.repositories.CertificateSettingsRepository;
import com.athleticaos.backend.repositories.TournamentPlayerRepository;
import com.athleticaos.backend.repositories.TournamentRepository;
import com.athleticaos.backend.repositories.TournamentTeamRepository;
import com.athleticaos.backend.services.impl.CertificateServiceImpl;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.env.Environment;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CertificateServiceUnitTest {

    @Mock private TournamentRepository tournamentRepository;
    @Mock private TournamentTeamRepository tournamentTeamRepository;
    @Mock private TournamentPlayerRepository tournamentPlayerRepository;
    @Mock private CertificateSettingsRepository settingsRepository;
    @Mock private CertificateRepository certificateRepository;
    @Mock private FileStorageService fileStorageService;
    @Mock private AuditLogger auditLogger;
    @Mock private Environment environment;

    private CertificateCodeGenerator codeGenerator;
    private CertificatePdfService pdfService;
    private CertificateFileNameSanitizer sanitizer;
    private CertificateServiceImpl service;

    @BeforeEach
    void setUp() {
        codeGenerator = new CertificateCodeGenerator();
        pdfService = new CertificatePdfService();
        pdfService.init();
        sanitizer = new CertificateFileNameSanitizer();

        service = new CertificateServiceImpl(
                tournamentRepository,
                tournamentTeamRepository,
                tournamentPlayerRepository,
                settingsRepository,
                certificateRepository,
                codeGenerator,
                pdfService,
                sanitizer,
                fileStorageService,
                auditLogger,
                environment
        );
        ReflectionTestUtils.setField(service, "configuredPublicBaseUrl", "https://www.athleticaos.com");
    }

    @Test
    void teamDownloadFilenameIncludesSanitizedTournamentAndTeamNames() {
        UUID tournamentId = UUID.randomUUID();
        UUID teamId = UUID.randomUUID();
        Tournament tournament = Tournament.builder().id(tournamentId)
                .name("Example Cup 2026 / Finals").build();
        Team team = Team.builder().id(teamId).name("Falcons: U15").build();
        Certificate certificate = Certificate.builder().tournament(tournament).team(team)
                .recipientName("Alex Example").code("ABCD123456").build();
        when(tournamentRepository.findById(tournamentId)).thenReturn(Optional.of(tournament));
        when(settingsRepository.findByTournamentId(tournamentId)).thenReturn(Optional.empty());
        when(certificateRepository.findValidByTournamentIdAndTeamIdWithTeamAndCategory(tournamentId, teamId))
                .thenReturn(List.of(certificate));

        assertThat(service.prepareTeamDownloadPayload(tournamentId, teamId).getDownloadFileName())
                .isEqualTo("Example Cup 2026 Finals-Falcons U15-certificates");

        tournament.setName("Another Cup 2026");
        assertThat(service.prepareTeamDownloadPayload(tournamentId, teamId).getDownloadFileName())
                .isEqualTo("Another Cup 2026-Falcons U15-certificates");
    }

    @Test
    void settingsValidationRejectsInvalidTeamIdAndOverlongAchievement() {
        UUID tournamentId = UUID.randomUUID();
        Tournament tournament = Tournament.builder()
                .id(tournamentId)
                .name("National 7s")
                .organiserOrg(Organisation.builder().id(UUID.randomUUID()).name("Malaysia Rugby").build())
                .build();
        when(tournamentRepository.findById(tournamentId)).thenReturn(Optional.of(tournament));
        when(settingsRepository.findByTournamentId(tournamentId)).thenReturn(Optional.empty());

        CertificateSettingsUpdateRequest badTeamId = CertificateSettingsUpdateRequest.builder()
                .design(CertificateDesign.MODERN)
                .language(CertificateLanguage.EN)
                .teamAchievements(Map.of("not-a-uuid", "Champions"))
                .build();
        assertThatThrownBy(() -> service.updateSettings(tournamentId, badTeamId, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid team ID");

        CertificateSettingsUpdateRequest longAchievement = CertificateSettingsUpdateRequest.builder()
                .design(CertificateDesign.MODERN)
                .language(CertificateLanguage.EN)
                .teamAchievements(Map.of(UUID.randomUUID().toString(), "A".repeat(161)))
                .build();
        assertThatThrownBy(() -> service.updateSettings(tournamentId, longAchievement, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("160");
    }

    @Test
    void signatureUploadValidatesSlotSizeAndMagicBytes() {
        UUID tournamentId = UUID.randomUUID();
        MockMultipartFile oversized = new MockMultipartFile("file", "sig.png", "image/png", new byte[500 * 1024 + 1]);
        assertThatThrownBy(() -> service.uploadSignature(tournamentId, 1, oversized, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("500 KB");

        MockMultipartFile fakePng = new MockMultipartFile("file", "sig.png", "image/png", "not-a-png-file".getBytes());
        assertThatThrownBy(() -> service.uploadSignature(tournamentId, 1, fakePng, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("PNG or JPEG");

        assertThatThrownBy(() -> service.uploadSignature(tournamentId, 3, fakePng, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("slot");
    }

    @Test
    void verifyPublicReturnsRevokedStatusAndHonoursShowVerificationSwitch() {
        UUID tournamentId = UUID.randomUUID();
        Tournament tournament = Tournament.builder()
                .id(tournamentId)
                .name("2026 National 7s")
                .startDate(LocalDate.of(2026, 11, 13))
                .endDate(LocalDate.of(2026, 11, 15))
                .venue("Johor Stadium")
                .organiserOrg(Organisation.builder().id(UUID.randomUUID()).name("Johor Rugby Union").build())
                .build();
        Certificate cert = Certificate.builder()
                .id(UUID.randomUUID())
                .code("K7Q2M9PX4D")
                .tournament(tournament)
                .category(TournamentCategory.builder().id(UUID.randomUUID()).name("Men Open").build())
                .team(Team.builder().id(UUID.randomUUID()).name("Barbarians RFC").build())
                .recipientName("Ahmad Faris bin Ismail")
                .achievementText("Cup Champions")
                .issuedAt(LocalDateTime.of(2026, 11, 16, 10, 0))
                .revokedAt(LocalDateTime.of(2026, 11, 17, 12, 0))
                .build();

        when(certificateRepository.findByCodeWithDetails("K7Q2M9PX4D")).thenReturn(Optional.of(cert));
        when(settingsRepository.findByTournamentId(tournamentId))
                .thenReturn(Optional.of(CertificateSettings.builder().showVerification(true).language(CertificateLanguage.EN).build()));

        PublicCertificateVerificationResponse res = service.verifyPublic("k7q2-m9px-4d");
        assertThat(res.getStatus()).isEqualTo("REVOKED");
        assertThat(res.getCode()).isEqualTo("K7Q2-M9PX-4D");
        assertThat(res.getRecipientName()).isEqualTo("Ahmad Faris bin Ismail");
        assertThat(res.getRevokedAt()).isNotNull();

        // When verification is switched off for the tournament, public lookup returns 404
        when(settingsRepository.findByTournamentId(tournamentId))
                .thenReturn(Optional.of(CertificateSettings.builder().showVerification(false).build()));
        assertThatThrownBy(() -> service.verifyPublic("K7Q2-M9PX-4D"))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void tournamentHeadingIsProminentBetweenLogosAcrossEveryDesign() throws Exception {
        String tournamentName = "Example International Schools Rugby Championship 2026";
        String logo = squarePngDataUri(400);
        for (CertificateDesign design : CertificateDesign.values()) {
            CertificateRenderData sample = sampleRenderData(design, CertificateLanguage.BOTH,
                    "Alex Morgan").toBuilder().tournamentName(tournamentName)
                    .tournamentLogoDataUri(logo).organiserLogoDataUri(logo).build();
            byte[] pdf = pdfService.renderSingle(sample);
            try (org.apache.pdfbox.pdmodel.PDDocument doc = org.apache.pdfbox.Loader.loadPDF(pdf)) {
                assertThat(doc.getNumberOfPages()).as("pages for %s", design).isEqualTo(1);
                List<org.apache.pdfbox.text.TextPosition> heading = new ArrayList<>();
                org.apache.pdfbox.text.PDFTextStripper stripper = new org.apache.pdfbox.text.PDFTextStripper() {
                    @Override
                    protected void writeString(String text, List<org.apache.pdfbox.text.TextPosition> positions) {
                        positions.stream().filter(g -> g.getFontSizeInPt() == 22 && g.getYDirAdj() < 150)
                                .forEach(heading::add);
                    }
                };
                stripper.getText(doc);
                assertThat(heading).as("heading for %s", design).isNotEmpty();
                assertThat(heading.stream().map(org.apache.pdfbox.text.TextPosition::getUnicode)
                        .collect(java.util.stream.Collectors.joining()).replaceAll("\\s+", ""))
                        .as("complete heading for %s", design)
                        .isEqualTo(tournamentName.replace(" ", ""));
                assertThat(heading.stream().map(org.apache.pdfbox.text.TextPosition::getYDirAdj)
                        .distinct().count()).as("heading wraps to two lines for %s", design).isEqualTo(2);
                assertThat(heading).allSatisfy(g -> {
                    assertThat(g.getXDirAdj()).as("heading stays between logos for %s", design)
                            .isBetween(220f, 630f);
                    assertThat(g.getYDirAdj()).as("heading stays in header for %s", design).isLessThan(150);
                });
            }
        }
    }

    @Test
    void recipientNamesKeepTheSameFontSizeAndWrapAtWordBoundaries() throws Exception {
        String shortName = "ALEX TAN";
        String longName = "MUHAMMAD NUR ALIF ISKANDAR BIN ABDUL RAHMAN AL HADDAD";
        for (CertificateDesign design : CertificateDesign.values()) {
            for (String name : List.of(shortName, longName)) {
                byte[] pdf = pdfService.renderSingle(sampleRenderData(design, CertificateLanguage.EN, name));
                try (org.apache.pdfbox.pdmodel.PDDocument doc = org.apache.pdfbox.Loader.loadPDF(pdf)) {
                    assertThat(doc.getNumberOfPages()).as("pages for %s / %s", design, name).isEqualTo(1);
                    List<org.apache.pdfbox.text.TextPosition> nameGlyphs = new ArrayList<>();
                    StringBuilder renderedName = new StringBuilder();
                    org.apache.pdfbox.text.PDFTextStripper stripper = new org.apache.pdfbox.text.PDFTextStripper() {
                        @Override
                        protected void writeString(String text, List<org.apache.pdfbox.text.TextPosition> positions) {
                            String line = text.trim();
                            if (line.length() > 4 && name.contains(line)) {
                                renderedName.append(line);
                                nameGlyphs.addAll(positions);
                            }
                        }
                    };
                    stripper.getText(doc);
                    assertThat(renderedName.toString().replaceAll("\\s+", ""))
                            .as("complete name for %s", design).isEqualTo(name.replace(" ", ""));
                    assertThat(nameGlyphs).as("name glyphs for %s", design).isNotEmpty();
                    assertThat(nameGlyphs).allSatisfy(glyph ->
                            assertThat(glyph.getFontSizeInPt()).as("name size for %s", design).isEqualTo(30));
                    List<Float> baselines = nameGlyphs.stream()
                            .map(org.apache.pdfbox.text.TextPosition::getYDirAdj).distinct().sorted().toList();
                    if (name.equals(shortName)) {
                        assertThat(baselines).as("short name lines for %s", design).hasSize(1);
                    } else {
                        assertThat(baselines.size()).as("long name lines for %s", design).isBetween(1, 2);
                        if (design == CertificateDesign.MODERN) {
                            assertThat(baselines).as("long Modern name wraps").hasSize(2);
                        }
                        if (baselines.size() == 2) {
                            assertThat(baselines.get(1) - baselines.get(0))
                                    .as("close line spacing for %s", design).isBetween(30f, 35f);
                        }
                    }
                }
            }
        }
    }

    @Test
    void everyDesignStaysOnOnePageInTheWorstCase() throws Exception {
        // Worst case: 36 mm logos on both sides, the longest name, both languages, a 500-character
        // remark, two signatures and the QR. Anything spilling onto a second page fails here.
        String logo = squarePngDataUri(400);
        String signature = squarePngDataUri(300);
        String longRemark = "Certified that the above took part in the tournament in the spirit of the game. ".repeat(7).substring(0, 500);
        for (CertificateDesign design : CertificateDesign.values()) {
            CertificateRenderData worst = sampleRenderData(design, CertificateLanguage.BOTH,
                    "Muhammad Nur Alif Iskandar bin Abdul Rahman Al-Haddad").toBuilder()
                    .tournamentLogoDataUri(logo)
                    .organiserLogoDataUri(logo)
                    .signatory1SignatureDataUri(signature)
                    .signatory2SignatureDataUri(signature)
                    .remark(longRemark)
                    .build();
            byte[] pdf = pdfService.renderSingle(worst);
            try (org.apache.pdfbox.pdmodel.PDDocument doc = org.apache.pdfbox.Loader.loadPDF(pdf)) {
                assertThat(doc.getNumberOfPages()).as("pages for %s", design).isEqualTo(1);
            }
            // A tournament ZIP holds one PDF per player, so each must stay small.
            assertThat(pdf.length).as("bytes for %s", design).isLessThan(400 * 1024);
        }
        List<CertificateRenderData> team = new ArrayList<>();
        for (int i = 1; i <= 12; i++) {
            team.add(sampleRenderData(CertificateDesign.CLASSIC, CertificateLanguage.EN, "Player " + i).toBuilder()
                    .tournamentLogoDataUri(logo).organiserLogoDataUri(logo).build());
        }
        try (org.apache.pdfbox.pdmodel.PDDocument doc = org.apache.pdfbox.Loader.loadPDF(pdfService.renderBatch(team))) {
            assertThat(doc.getNumberOfPages()).isEqualTo(12);
        }
    }

    private static String squarePngDataUri(int size) throws java.io.IOException {
        java.awt.image.BufferedImage img = new java.awt.image.BufferedImage(size, size, java.awt.image.BufferedImage.TYPE_INT_ARGB);
        java.awt.Graphics2D g = img.createGraphics();
        g.setColor(new java.awt.Color(0x13, 0x28, 0x4f));
        g.fillOval(0, 0, size, size);
        g.dispose();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        javax.imageio.ImageIO.write(img, "png", out);
        return "data:image/png;base64," + java.util.Base64.getEncoder().encodeToString(out.toByteArray());
    }

    @Test
    void rendersAllFiveDesignsAndMeasuresTeamPdfAndZipBenchmark() throws Exception {
        for (CertificateDesign design : CertificateDesign.values()) {
            CertificateRenderData sample = sampleRenderData(design, CertificateLanguage.BOTH,
                    "Muhammad Nur Alif Iskandar bin Abdul Rahman Al-Haddad");
            byte[] pdf = pdfService.renderSingle(sample);
            assertThat(pdf).isNotEmpty();
            assertThat(new String(pdf, 0, 5)).isEqualTo("%PDF-");
        }

        // Benchmark: 12-player team combined PDF and ZIP
        List<CertificateRenderData> team12 = new ArrayList<>();
        for (int i = 1; i <= 12; i++) {
            team12.add(sampleRenderData(CertificateDesign.MODERN, CertificateLanguage.EN,
                    "Ahmad Faris bin Ismail " + i));
        }

        // Warmup
        pdfService.renderSingle(team12.get(0));

        long t0 = System.nanoTime();
        byte[] singlePdf = pdfService.renderSingle(team12.get(0));
        long singleMs = (System.nanoTime() - t0) / 1_000_000L;

        long t1 = System.nanoTime();
        byte[] combinedPdf = pdfService.renderBatch(team12);
        long combinedMs = (System.nanoTime() - t1) / 1_000_000L;

        ByteArrayOutputStream zipBaos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(zipBaos)) {
            for (int i = 0; i < team12.size(); i++) {
                byte[] p = pdfService.renderSingle(team12.get(i));
                zos.putNextEntry(new ZipEntry("Player " + (i + 1) + ".pdf"));
                zos.write(p);
                zos.closeEntry();
            }
        }
        byte[] zipBytes = zipBaos.toByteArray();

        System.out.printf("CERT_BENCHMARK singleMs=%d singleBytes=%d team12PdfMs=%d team12PdfBytes=%d team12ZipBytes=%d%n",
                singleMs, singlePdf.length, combinedMs, combinedPdf.length, zipBytes.length);

        assertThat(combinedPdf.length).isGreaterThan(singlePdf.length);
        assertThat(zipBytes.length).isGreaterThan(0);
    }

    private CertificateRenderData sampleRenderData(CertificateDesign design, CertificateLanguage lang, String name) {
        return CertificateRenderData.builder()
                .design(design)
                .language(lang)
                .recipientName(name)
                .teamName("Sample Barbarians RFC")
                .categoryName("Men Open")
                .achievementText("Cup Champions")
                .tournamentName("2026 National 7s")
                .tournamentStartDate(LocalDate.of(2026, 11, 13))
                .tournamentEndDate(LocalDate.of(2026, 11, 15))
                .tournamentVenue("Sample Rugby Stadium, Johor")
                .organiserName("Sample Rugby Union")
                .organiserPrimaryColor("#6b1d6b")
                .organiserSecondaryColor("#f2b705")
                .remark("Certified that the above took part in the tournament in the spirit of the game.")
                .issueDate(LocalDate.of(2026, 11, 16))
                .signatory1Name("Ahmad Rahman")
                .signatory1Title("Tournament Director")
                .signatory2Name("Siti Lim")
                .signatory2Title("President, Sample Rugby Union")
                .showVerification(true)
                .formattedCode("K7Q2-M9PX-4D")
                .verificationUrl("https://www.athleticaos.com/certificates/K7Q2-M9PX-4D")
                .verificationDisplayHost("www.athleticaos.com/certificates")
                .build();
    }
}
