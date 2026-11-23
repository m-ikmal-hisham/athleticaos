package com.athleticaos.backend.entities;

import com.athleticaos.backend.enums.CertificateDesign;
import com.athleticaos.backend.enums.CertificateLanguage;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "certificate_settings")
public class CertificateSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tournament_id", nullable = false, unique = true)
    private Tournament tournament;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private CertificateDesign design = CertificateDesign.MODERN;

    @Column(length = 160)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    @Builder.Default
    private CertificateLanguage language = CertificateLanguage.EN;

    @Column(columnDefinition = "TEXT")
    private String remark;

    @Column(name = "issue_date")
    private LocalDate issueDate;

    @Column(name = "signatory1_name", length = 120)
    private String signatory1Name;

    @Column(name = "signatory1_title", length = 120)
    private String signatory1Title;

    @JdbcTypeCode(SqlTypes.VARBINARY)
    @Column(name = "signature1_image", columnDefinition = "bytea")
    private byte[] signature1Image;

    @Column(name = "signature1_content_type", length = 64)
    private String signature1ContentType;

    @Column(name = "signatory2_name", length = 120)
    private String signatory2Name;

    @Column(name = "signatory2_title", length = 120)
    private String signatory2Title;

    @JdbcTypeCode(SqlTypes.VARBINARY)
    @Column(name = "signature2_image", columnDefinition = "bytea")
    private byte[] signature2Image;

    @Column(name = "signature2_content_type", length = 64)
    private String signature2ContentType;

    @Column(name = "show_verification", nullable = false)
    @Builder.Default
    private boolean showVerification = true;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "team_achievements", columnDefinition = "jsonb", nullable = false)
    @Builder.Default
    private Map<String, String> teamAchievements = new HashMap<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
