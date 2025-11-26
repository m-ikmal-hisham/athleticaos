package com.athleticaos.backend.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "user_organisations")
public class UserOrganisation {

    @EmbeddedId
    private UserOrganisationId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("userId")
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("organisationId")
    @JoinColumn(name = "organisation_id")
    private Organisation organisation;

    @Column(nullable = false, insertable = false, updatable = false)
    private String role; // Part of PK

    @Embeddable
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserOrganisationId implements Serializable {
        @Column(name = "user_id")
        private UUID userId;

        @Column(name = "organisation_id")
        private UUID organisationId;

        @Column(name = "role")
        private String role;
    }
}
