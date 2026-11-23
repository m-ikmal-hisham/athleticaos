package com.athleticaos.backend.dtos.certificate;

import com.athleticaos.backend.enums.CertificateDesign;
import com.athleticaos.backend.enums.CertificateLanguage;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CertificateSettingsUpdateRequest {

    @NotNull(message = "Design is required")
    private CertificateDesign design;

    @Size(max = 160, message = "Title must be at most 160 characters")
    private String title;

    @NotNull(message = "Language is required")
    private CertificateLanguage language;

    @Size(max = 500, message = "Signing remark must be at most 500 characters")
    private String remark;

    private LocalDate issueDate;

    @Size(max = 120, message = "Signatory 1 name must be at most 120 characters")
    private String signatory1Name;

    @Size(max = 120, message = "Signatory 1 title must be at most 120 characters")
    private String signatory1Title;

    @Size(max = 120, message = "Signatory 2 name must be at most 120 characters")
    private String signatory2Name;

    @Size(max = 120, message = "Signatory 2 title must be at most 120 characters")
    private String signatory2Title;

    private boolean showVerification;

    private Map<String, String> teamAchievements;
}
