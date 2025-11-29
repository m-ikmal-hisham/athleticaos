package com.athleticaos.backend.entities;

import com.athleticaos.backend.enums.TournamentStageType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "tournament_stages")
public class TournamentStage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tournament_id", nullable = false)
    private Tournament tournament;

    @Column(nullable = false)
    private String name; // e.g. "Pool A", "Quarter Finals", "Cup Semi Final"

    @Enumerated(EnumType.STRING)
    @Column(name = "stage_type", nullable = false)
    private TournamentStageType stageType;

    @Column(name = "display_order")
    private Integer displayOrder;

    @Column(name = "is_group_stage", nullable = false)
    @Builder.Default
    private Boolean isGroupStage = false;

    @Column(name = "is_knockout_stage", nullable = false)
    @Builder.Default
    private Boolean isKnockoutStage = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
