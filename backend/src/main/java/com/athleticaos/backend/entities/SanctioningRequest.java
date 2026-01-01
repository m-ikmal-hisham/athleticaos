package com.athleticaos.backend.entities;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "sanctioning_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SanctioningRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tournament_id", nullable = false)
    private Tournament tournament;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requester_org_id", nullable = false)
    private Organisation requesterOrg;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approver_org_id", nullable = false)
    private Organisation approverOrg;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private SanctioningStatus status = SanctioningStatus.PENDING;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum SanctioningStatus {
        PENDING,
        APPROVED,
        REJECTED,
        MORE_INFO_REQUIRED
    }
}
