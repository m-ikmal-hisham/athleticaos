package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.certificate.CertificateRenderData;
import com.athleticaos.backend.enums.CertificateDesign;
import com.athleticaos.backend.enums.CertificateLanguage;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.Base64;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Renders A4 landscape e-certificates to PDF using OpenHTMLtoPDF (LGPL-2.1)
 * and ZXing Core (Apache-2.0) for crisp monochrome PNG QR codes.
 */
@Slf4j
@Service
public class CertificatePdfService {

    private static final Pattern HEX_COLOR = Pattern.compile("^#[0-9a-fA-F]{6}$");
    private static final String DEFAULT_NAVY = "#13284f";
    private static final String DEFAULT_CRIMSON = "#c8102e";

    private static final String[] EN_MONTHS = {
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
    };
    private static final String[] EN_SHORT_MONTHS = {
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    };
    private static final String[] MS_MONTHS = {
            "Januari", "Februari", "Mac", "April", "Mei", "Jun",
            "Julai", "Ogos", "September", "Oktober", "November", "Disember"
    };
    private static final String[] MS_SHORT_MONTHS = {
            "Jan", "Feb", "Mac", "Apr", "Mei", "Jun",
            "Jul", "Ogos", "Sep", "Okt", "Nov", "Dis"
    };

    private final Map<String, byte[]> fontBytes = new LinkedHashMap<>();
    private final Map<CertificateDesign, String> designCss = new EnumMap<>(CertificateDesign.class);
    // Artwork designs: one full-page background image each, read once and reused for every page.
    private final Map<CertificateDesign, String> backgroundDataUri = new EnumMap<>(CertificateDesign.class);
    private String baseCss;

    @PostConstruct
    public void init() {
        loadFont("Inter-Regular.ttf");
        loadFont("Inter-Medium.ttf");
        loadFont("Inter-SemiBold.ttf");
        loadFont("Inter-Bold.ttf");
        loadFont("PlayfairDisplay-Bold.ttf");
        loadFont("Oswald-Bold.ttf");

        this.baseCss = loadResourceText("templates/certificates/base.css");
        designCss.put(CertificateDesign.CLASSIC, loadResourceText("templates/certificates/classic.css"));
        designCss.put(CertificateDesign.MODERN, loadResourceText("templates/certificates/modern.css"));
        designCss.put(CertificateDesign.ORGANISER_COLOURS, loadResourceText("templates/certificates/organiser_colours.css"));
        designCss.put(CertificateDesign.PITCH, loadResourceText("templates/certificates/pitch.css"));
        designCss.put(CertificateDesign.PRINT_SAVER, loadResourceText("templates/certificates/print_saver.css"));

        String backgroundsCss = loadResourceText("templates/certificates/backgrounds.css");
        for (CertificateDesign design : CertificateDesign.values()) {
            String file = backgroundFile(design);
            if (file != null) {
                designCss.put(design, backgroundsCss);
                backgroundDataUri.put(design, "data:image/jpeg;base64,"
                        + java.util.Base64.getEncoder().encodeToString(loadResourceBytes("templates/certificates/backgrounds/" + file)));
            }
        }
    }

    /** Background image file for an artwork design, or null for the five drawn designs. */
    private static String backgroundFile(CertificateDesign design) {
        return switch (design) {
            case SONGKET_GOLD -> "songket_gold.jpg";
            case HIBISCUS_ENERGY -> "hibiscus_energy.jpg";
            case PITCH_DYNAMIC -> "pitch_dynamic.jpg";
            case STADIUM_LIGHTS -> "stadium_lights.jpg";
            case BATIK_WAVE -> "batik_wave.jpg";
            case CHAMPIONS_RIBBON -> "champions_ribbon.jpg";
            default -> null;
        };
    }

    private byte[] loadResourceBytes(String path) {
        try (InputStream is = new ClassPathResource(path).getInputStream()) {
            return is.readAllBytes();
        } catch (IOException e) {
            throw new IllegalStateException("Failed to load certificate background: " + path, e);
        }
    }

    private void loadFont(String fileName) {
        try (InputStream is = new ClassPathResource("fonts/" + fileName).getInputStream()) {
            fontBytes.put(fileName, is.readAllBytes());
        } catch (IOException e) {
            throw new IllegalStateException("Failed to load bundled certificate font: " + fileName, e);
        }
    }

    private String loadResourceText(String path) {
        try (InputStream is = new ClassPathResource(path).getInputStream()) {
            return new String(is.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to load certificate template resource: " + path, e);
        }
    }

    public byte[] renderSingle(CertificateRenderData data) {
        return renderBatch(List.of(data));
    }

    public byte[] renderBatch(List<CertificateRenderData> items) {
        if (items == null || items.isEmpty()) {
            throw new IllegalArgumentException("Cannot render empty certificate batch");
        }
        CertificateRenderData first = items.get(0);
        String html = buildDocumentHtml(first, items);

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PdfRendererBuilder builder = new PdfRendererBuilder();
            registerFonts(builder);
            builder.withHtmlContent(html, null);
            builder.toStream(out);
            builder.run();
            return out.toByteArray();
        } catch (Exception e) {
            log.error("Failed to render certificate PDF", e);
            throw new RuntimeException("Failed to generate certificate PDF", e);
        }
    }

    private void registerFonts(PdfRendererBuilder builder) {
        addFont(builder, "Inter-Regular.ttf", "Inter", 400);
        addFont(builder, "Inter-Medium.ttf", "Inter", 500);
        addFont(builder, "Inter-SemiBold.ttf", "Inter", 600);
        addFont(builder, "Inter-Bold.ttf", "Inter", 700);
        addFont(builder, "PlayfairDisplay-Bold.ttf", "Playfair Display", 700);
        addFont(builder, "Oswald-Bold.ttf", "Oswald", 700);
    }

    private void addFont(PdfRendererBuilder builder, String fileName, String family, int weight) {
        byte[] bytes = fontBytes.get(fileName);
        if (bytes != null) {
            builder.useFont(() -> new ByteArrayInputStream(bytes), family, weight, PdfRendererBuilder.FontStyle.NORMAL, true);
        }
    }

    private String buildDocumentHtml(CertificateRenderData first, List<CertificateRenderData> items) {
        CertificateDesign design = first.getDesign() != null ? first.getDesign() : CertificateDesign.MODERN;
        String orgPrimary = sanitizeColor(first.getOrganiserPrimaryColor(), DEFAULT_NAVY);
        String orgSecondary = sanitizeColor(first.getOrganiserSecondaryColor(), DEFAULT_CRIMSON);

        String specificCss = designCss.getOrDefault(design, designCss.get(CertificateDesign.MODERN))
                .replace("{{ORG_PRIMARY}}", orgPrimary)
                .replace("{{ORG_SECONDARY}}", orgSecondary);

        StringBuilder sb = new StringBuilder(4096 * items.size());
        sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        sb.append("<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.0 Strict//EN\" \"http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd\">\n");
        sb.append("<html xmlns=\"http://www.w3.org/1999/xhtml\">\n<head>\n");
        sb.append("<meta http-equiv=\"Content-Type\" content=\"text/html; charset=UTF-8\" />\n");
        sb.append("<style type=\"text/css\">\n/*<![CDATA[*/\n");
        sb.append(baseCss).append("\n").append(specificCss).append("\n");
        sb.append("/*]]>*/\n</style>\n</head>\n<body>\n");

        for (int i = 0; i < items.size(); i++) {
            boolean isLast = (i == items.size() - 1);
            sb.append(buildPageHtml(items.get(i), design, isLast));
        }

        sb.append("</body>\n</html>");
        return sb.toString();
    }

    private String buildPageHtml(CertificateRenderData d, CertificateDesign design, boolean isLast) {
        CertificateLanguage lang = d.getLanguage() != null ? d.getLanguage() : CertificateLanguage.EN;
        String designClass = switch (design) {
            case CLASSIC -> "classic";
            case MODERN -> "modern";
            case ORGANISER_COLOURS -> "org";
            case PITCH -> "pitch";
            case PRINT_SAVER -> "print";
            case SONGKET_GOLD -> "bg bg-songket";
            case HIBISCUS_ENERGY -> "bg bg-hibiscus";
            case PITCH_DYNAMIC -> "bg bg-pitch-dynamic";
            case STADIUM_LIGHTS -> "bg bg-stadium";
            case BATIK_WAVE -> "bg bg-batik";
            case CHAMPIONS_RIBBON -> "bg bg-champions";
        };

        String titleText = resolveTitle(d.getCustomTitle(), lang);
        String subtitleText = resolveSubtitle(lang, design);
        String nameText = d.getRecipientName() != null ? d.getRecipientName().trim() : "";
        String metaText = buildMetaLine(d.getTeamName(), d.getCategoryName());
        String eventHtml = buildEventHtml(d, lang, design);
        String remarkText = d.getRemark() != null ? d.getRemark().trim() : "";
        String issueLabel = buildIssueLabel(d.getIssueDate(), lang);

        boolean hasVerification = d.isShowVerification()
                && d.getVerificationUrl() != null && !d.getVerificationUrl().isBlank()
                && d.getFormattedCode() != null && !d.getFormattedCode().isBlank();
        String qrDataUri = hasVerification ? generateQrPngDataUri(d.getVerificationUrl()) : null;

        StringBuilder p = new StringBuilder(2048);
        p.append("<div class=\"page ").append(designClass).append(isLast ? "" : " page-break").append("\">");

        // Decorative background elements per design (pure HTML/CSS, zero Batik/SVG dependency)
        if (design == CertificateDesign.CLASSIC) {
            p.append("<div class=\"classic-outer\"></div><div class=\"classic-inner\"></div>");
        } else if (design == CertificateDesign.MODERN) {
            p.append("<div class=\"modern-band-navy\"></div><div class=\"modern-band-crimson\"></div>");
        } else if (design == CertificateDesign.ORGANISER_COLOURS) {
            p.append("<div class=\"org-corner-tl\"></div><div class=\"org-corner-br\"></div><div class=\"org-card\"></div>");
        } else if (design == CertificateDesign.PITCH) {
            p.append("<div class=\"pitch-outer\"></div>");
            p.append("<div class=\"pitch-22-left\"></div>");
            p.append("<div class=\"pitch-half\"></div>");
            p.append("<div class=\"pitch-22-right\"></div>");
        } else if (design == CertificateDesign.PRINT_SAVER) {
            p.append("<div class=\"print-frame\"></div>");
        } else if (backgroundDataUri.containsKey(design)) {
            p.append("<img class=\"page-bg\" src=\"").append(backgroundDataUri.get(design)).append("\" alt=\"\" />");
        }

        // Main content container
        p.append("<div class=\"content\">");

        // Header logos row (table layout for rock-solid OpenHTMLtoPDF alignment)
        p.append("<table class=\"logos-table\"><tr>");
        p.append("<td class=\"logo-cell-left\">");
        if (d.getTournamentLogoDataUri() != null) {
            p.append("<img class=\"logo-img\" src=\"").append(d.getTournamentLogoDataUri()).append("\" alt=\"\" />");
        }
        p.append("</td>");
        p.append("<td class=\"logo-cell-right\">");
        if (d.getOrganiserLogoDataUri() != null) {
            p.append("<img class=\"logo-img\" src=\"").append(d.getOrganiserLogoDataUri()).append("\" alt=\"\" />");
        }
        p.append("</td>");
        p.append("</tr></table>");

        // Title & Subtitle
        p.append("<div class=\"title").append(lang == CertificateLanguage.BOTH ? " title-both" : "").append("\">")
                .append(escapeXml(titleText)).append("</div>");
        p.append("<div class=\"sub\">").append(escapeXml(subtitleText)).append("</div>");

        // Recipient name
        p.append("<div class=\"name-wrap\"><span class=\"name\">")
                .append(escapeXml(nameText)).append("</span></div>");

        // Team & Category
        if (!metaText.isEmpty()) {
            p.append("<div class=\"meta\">").append(escapeXml(metaText)).append("</div>");
        }

        // Optional Achievement pill
        if (d.getAchievementText() != null && !d.getAchievementText().isBlank()) {
            p.append("<div class=\"ach-wrap\"><span class=\"ach\">")
                    .append(escapeXml(d.getAchievementText().trim())).append("</span></div>");
        }

        // Tournament details
        p.append("<div class=\"event\">").append(eventHtml).append("</div>");

        // Optional Organiser Remark
        if (!remarkText.isEmpty()) {
            p.append("<div class=\"remark\">").append(escapeXml(remarkText)).append("</div>");
        }

        p.append("</div>"); // .content

        // Bottom signature + verification bar pinned cleanly above bottom margin
        p.append("<div class=\"footer-bar\">");
        p.append(buildFooterTable(d, design, lang, issueLabel, hasVerification, qrDataUri));
        p.append("</div>");

        p.append("</div>\n"); // .page
        return p.toString();
    }

    private String buildFooterTable(
            CertificateRenderData d,
            CertificateDesign design,
            CertificateLanguage lang,
            String issueLabel,
            boolean hasVerification,
            String qrDataUri) {

        String sig1Html = buildSignatoryCell(d.getSignatory1Name(), d.getSignatory1Title(), d.getSignatory1SignatureDataUri());
        String sig2Html = buildSignatoryCell(d.getSignatory2Name(), d.getSignatory2Title(), d.getSignatory2SignatureDataUri());
        String verifyHtml = buildVerifyCell(d, lang, issueLabel, hasVerification, qrDataUri);

        // Modern aligns signatories left and verification right; other 4 designs flank verification between sig1 and sig2
        StringBuilder t = new StringBuilder();
        t.append("<table class=\"footer-table\"><tr>");
        if (design == CertificateDesign.MODERN) {
            t.append("<td class=\"footer-sig-col\">").append(sig1Html).append("</td>");
            t.append("<td class=\"footer-sig-col\">").append(sig2Html).append("</td>");
            t.append("<td class=\"footer-verify-col footer-verify-right\">").append(verifyHtml).append("</td>");
        } else {
            t.append("<td class=\"footer-sig-col\">").append(sig1Html).append("</td>");
            t.append("<td class=\"footer-verify-col footer-verify-center\">").append(verifyHtml).append("</td>");
            t.append("<td class=\"footer-sig-col\">").append(sig2Html).append("</td>");
        }
        t.append("</tr></table>");
        return t.toString();
    }

    private String buildSignatoryCell(String name, String title, String signatureDataUri) {
        boolean hasName = name != null && !name.isBlank();
        boolean hasTitle = title != null && !title.isBlank();
        boolean hasImg = signatureDataUri != null && !signatureDataUri.isBlank();
        if (!hasName && !hasTitle && !hasImg) {
            return "&#160;";
        }
        StringBuilder sb = new StringBuilder();
        sb.append("<div class=\"sig-box\">");
        sb.append("<div class=\"sig-img-slot\">");
        if (hasImg) {
            sb.append("<img class=\"sig-img\" src=\"").append(signatureDataUri).append("\" alt=\"\" />");
        }
        sb.append("</div>");
        sb.append("<div class=\"sig-line\">");
        if (hasName) {
            sb.append("<div class=\"sig-name\">").append(escapeXml(name.trim())).append("</div>");
        }
        if (hasTitle) {
            sb.append("<div class=\"sig-title\">").append(escapeXml(title.trim())).append("</div>");
        }
        sb.append("</div></div>");
        return sb.toString();
    }

    private String buildVerifyCell(
            CertificateRenderData d,
            CertificateLanguage lang,
            String issueLabel,
            boolean hasVerification,
            String qrDataUri) {

        StringBuilder sb = new StringBuilder();
        sb.append("<table class=\"verify-inner\"><tr>");
        if (hasVerification && qrDataUri != null) {
            sb.append("<td class=\"qr-cell\"><img class=\"qr-img\" src=\"").append(qrDataUri).append("\" alt=\"\" /></td>");
        }
        sb.append("<td class=\"verify-text-cell\">");
        if (!issueLabel.isEmpty()) {
            sb.append("<div class=\"verify-line\">").append(escapeXml(issueLabel)).append("</div>");
        }
        if (hasVerification) {
            String verifyPrefix = switch (lang) {
                case MS -> "Semak: ";
                case BOTH -> "Verify / Semak: ";
                case EN -> "Verify: ";
            };
            String host = d.getVerificationDisplayHost() != null ? d.getVerificationDisplayHost() : "";
            if (!host.isBlank()) {
                sb.append("<div class=\"verify-line\">").append(escapeXml(verifyPrefix + host)).append("</div>");
            }
            sb.append("<div class=\"verify-code\">").append(escapeXml(d.getFormattedCode())).append("</div>");
        }
        sb.append("</td></tr></table>");
        return sb.toString();
    }

    private String resolveTitle(String customTitle, CertificateLanguage lang) {
        if (customTitle != null && !customTitle.isBlank()) {
            return customTitle.trim();
        }
        return switch (lang) {
            case MS -> "Sijil Penyertaan";
            case BOTH -> "Certificate of Participation / Sijil Penyertaan";
            case EN -> "Certificate of Participation";
        };
    }

    private String resolveSubtitle(CertificateLanguage lang, CertificateDesign design) {
        return switch (lang) {
            case MS -> "Dengan ini disahkan bahawa";
            case BOTH -> "This certifies that · Dengan ini disahkan bahawa";
            case EN -> switch (design) {
                case MODERN -> "Awarded to";
                case ORGANISER_COLOURS -> "Presented to";
                default -> "This certifies that";
            };
        };
    }

    private String buildMetaLine(String teamName, String categoryName) {
        boolean hasTeam = teamName != null && !teamName.isBlank();
        boolean hasCat = categoryName != null && !categoryName.isBlank();
        if (hasTeam && hasCat) {
            return teamName.trim() + " · " + categoryName.trim();
        }
        if (hasTeam) return teamName.trim();
        if (hasCat) return categoryName.trim();
        return "";
    }

    private String buildEventHtml(CertificateRenderData d, CertificateLanguage lang, CertificateDesign design) {
        String tName = d.getTournamentName() != null ? d.getTournamentName().trim() : "";
        String dates = formatDateRange(d.getTournamentStartDate(), d.getTournamentEndDate(), lang);
        String venue = d.getTournamentVenue() != null ? d.getTournamentVenue().trim() : "";

        String prefix = switch (lang) {
            case MS -> "telah menyertai ";
            case BOTH -> "took part in / telah menyertai ";
            case EN -> design == CertificateDesign.PITCH ? "played in the " : "took part in the ";
        };

        StringBuilder sb = new StringBuilder();
        if (design == CertificateDesign.MODERN) {
            sb.append("<strong>").append(escapeXml(tName)).append("</strong>");
            if (!dates.isEmpty()) {
                sb.append(" · ").append(escapeXml(dates));
            }
            if (!venue.isEmpty()) {
                sb.append(" · ").append(escapeXml(venue));
            }
        } else {
            sb.append(escapeXml(prefix)).append("<strong>").append(escapeXml(tName)).append("</strong>");
            if (!dates.isEmpty() || !venue.isEmpty()) {
                sb.append("<br />");
                if (!dates.isEmpty()) {
                    sb.append(escapeXml(dates));
                }
                if (!dates.isEmpty() && !venue.isEmpty()) {
                    sb.append(" · ");
                }
                if (!venue.isEmpty()) {
                    sb.append(escapeXml(venue));
                }
            }
        }
        return sb.toString();
    }

    private String buildIssueLabel(LocalDate issueDate, CertificateLanguage lang) {
        if (issueDate == null) {
            return "";
        }
        String formatted = formatShortDate(issueDate, lang);
        return switch (lang) {
            case MS -> "Dikeluarkan " + formatted;
            case BOTH -> "Issued / Dikeluarkan " + formatted;
            case EN -> "Issued " + formatted;
        };
    }

    private String formatDateRange(LocalDate start, LocalDate end, CertificateLanguage lang) {
        if (start == null && end == null) return "";
        if (start == null) return formatFullDate(end, lang);
        if (end == null || start.equals(end)) return formatFullDate(start, lang);

        String[] months = (lang == CertificateLanguage.MS) ? MS_MONTHS : EN_MONTHS;
        String toWord = (lang == CertificateLanguage.MS) ? " hingga " : " to ";
        if (start.getYear() == end.getYear() && start.getMonthValue() == end.getMonthValue()) {
            return start.getDayOfMonth() + toWord + end.getDayOfMonth() + " "
                    + months[end.getMonthValue() - 1] + " " + end.getYear();
        }
        if (start.getYear() == end.getYear()) {
            return start.getDayOfMonth() + " " + months[start.getMonthValue() - 1]
                    + toWord + end.getDayOfMonth() + " " + months[end.getMonthValue() - 1]
                    + " " + end.getYear();
        }
        return formatFullDate(start, lang) + toWord + formatFullDate(end, lang);
    }

    private String formatFullDate(LocalDate date, CertificateLanguage lang) {
        String[] months = (lang == CertificateLanguage.MS) ? MS_MONTHS : EN_MONTHS;
        return date.getDayOfMonth() + " " + months[date.getMonthValue() - 1] + " " + date.getYear();
    }

    private String formatShortDate(LocalDate date, CertificateLanguage lang) {
        String[] months = (lang == CertificateLanguage.MS) ? MS_SHORT_MONTHS : EN_SHORT_MONTHS;
        return date.getDayOfMonth() + " " + months[date.getMonthValue() - 1] + " " + date.getYear();
    }

    private String generateQrPngDataUri(String url) {
        try {
            Map<EncodeHintType, Object> hints = new EnumMap<>(EncodeHintType.class);
            hints.put(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M);
            hints.put(EncodeHintType.MARGIN, 1);
            hints.put(EncodeHintType.CHARACTER_SET, "UTF-8");

            int size = 180;
            BitMatrix matrix = new QRCodeWriter().encode(url, BarcodeFormat.QR_CODE, size, size, hints);
            BufferedImage image = new BufferedImage(size, size, BufferedImage.TYPE_BYTE_BINARY);
            for (int y = 0; y < size; y++) {
                for (int x = 0; x < size; x++) {
                    image.setRGB(x, y, matrix.get(x, y) ? 0xFF0F172A : 0xFFFFFFFF);
                }
            }
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(image, "png", baos);
            return "data:image/png;base64," + Base64.getEncoder().encodeToString(baos.toByteArray());
        } catch (Exception e) {
            log.warn("Failed to generate QR code for URL {}: {}", url, e.getMessage());
            return null;
        }
    }

    private String sanitizeColor(String color, String fallback) {
        if (color != null && HEX_COLOR.matcher(color.trim()).matches()) {
            return color.trim();
        }
        return fallback;
    }

    static String escapeXml(String input) {
        if (input == null) return "";
        StringBuilder sb = new StringBuilder(input.length() + 16);
        for (int i = 0; i < input.length(); i++) {
            char c = input.charAt(i);
            switch (c) {
                case '&' -> sb.append("&amp;");
                case '<' -> sb.append("&lt;");
                case '>' -> sb.append("&gt;");
                case '"' -> sb.append("&quot;");
                case '\'' -> sb.append("&#39;");
                default -> sb.append(c);
            }
        }
        return sb.toString();
    }
}
