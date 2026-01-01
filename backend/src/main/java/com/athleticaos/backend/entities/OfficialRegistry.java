package com.athleticaos.backend.entities;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "official_registry")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OfficialRegistry {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String accreditationLevel; // e.g., "LEVEL_1", "FIFA", "WORLD_RUGBY_L2"

    @Column(nullable = false)
    private String primaryRole; // e.g., "REFEREE", "TMO", "AR"

    @Column(nullable = false)
    private String badgeNumber;

    private LocalDateTime accreditationExpiryDate;

    @Column(columnDefinition = "boolean default true")
    @Builder.Default
    private boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
