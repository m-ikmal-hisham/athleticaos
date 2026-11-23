package com.athleticaos.backend.dtos.certificate;

import com.athleticaos.backend.enums.CertificateDesign;
import com.athleticaos.backend.enums.CertificateLanguage;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDate;

/**
 * Immutable snapshot of all data needed to render one certificate PDF page.
 * Loaded completely before streaming so no JPA lazy loading occurs during PDF/ZIP output.
 */
@Value
@Builder(toBuilder = true)
public class CertificateRenderData {
    CertificateDesign design;
    CertificateLanguage language;
    String customTitle;
    String recipientName;
    String teamName;
    String categoryName;
    String achievementText;
    String tournamentName;
    LocalDate tournamentStartDate;
    LocalDate tournamentEndDate;
    String tournamentVenue;
    String organiserName;
    String organiserPrimaryColor;
    String organiserSecondaryColor;
    String tournamentLogoDataUri;
    String organiserLogoDataUri;
    String remark;
    LocalDate issueDate;
    String signatory1Name;
    String signatory1Title;
    String signatory1SignatureDataUri;
    String signatory2Name;
    String signatory2Title;
    String signatory2SignatureDataUri;
    boolean showVerification;
    String formattedCode;
    String verificationUrl;
    String verificationDisplayHost;
}
