package com.athleticaos.backend.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "organisations")
public class Organisation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(unique = true)
    private String slug;

    @Column(name = "org_type", nullable = false)
    private String orgType; // ENUM as String

    @Enumerated(EnumType.STRING)
    @Column(name = "org_level", nullable = false)
    @Builder.Default
    private com.athleticaos.backend.enums.OrganisationLevel orgLevel = com.athleticaos.backend.enums.OrganisationLevel.CLUB;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_org_id")
    private Organisation parentOrg;

    @Column(name = "primary_color")
    private String primaryColor;

    @Column(name = "secondary_color")
    private String secondaryColor;

    @Column(name = "tertiary_color")
    private String tertiaryColor;

    @Column(name = "quaternary_color")
    private String quaternaryColor;

    @Column(name = "logo_url")
    private String logoUrl;

    @Column(name = "accent_color")
    private String accentColor;

    @Column(name = "cover_image_url")
    private String coverImageUrl;

    @Column
    private String state; // State/Region

    // Structured Address Fields
    @Column(name = "address_line1")
    private String addressLine1;

    @Column(name = "address_line2")
    private String addressLine2;

    @Column
    private String postcode;

    @Column
    private String city;

    @Column(name = "state_code")
    private String stateCode;

    @Column(name = "country_code")
    private String countryCode;

    @Column
    @Builder.Default
    private String status = "Active"; // Active, Inactive

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
