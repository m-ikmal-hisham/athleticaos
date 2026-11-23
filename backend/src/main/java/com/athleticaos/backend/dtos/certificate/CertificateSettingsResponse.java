package com.athleticaos.backend.dtos.certificate;

import com.athleticaos.backend.enums.CertificateDesign;
import com.athleticaos.backend.enums.CertificateLanguage;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CertificateSettingsResponse {
    private UUID tournamentId;
    private CertificateDesign design;
    private String title;
    private CertificateLanguage language;
    private String remark;
    private LocalDate issueDate;
    private String signatory1Name;
    private String signatory1Title;
    private boolean hasSignature1;
    private String signatory2Name;
    private String signatory2Title;
    private boolean hasSignature2;
    private boolean showVerification;
    private boolean verificationUrlConfigured;
    private Map<String, String> teamAchievements;
    // Read-only context for UI preview/thumbnails
    private String tournamentName;
    private String tournamentLogoUrl;
    private String organiserName;
    private String organiserLogoUrl;
    private String organiserPrimaryColor;
    private String organiserSecondaryColor;
}
