package com.athleticaos.backend.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "match_lineups", indexes = {
        @Index(name = "idx_lineup_match", columnList = "match_id"),
        @Index(name = "idx_lineup_team", columnList = "team_id"),
        @Index(name = "idx_lineup_player", columnList = "player_id"),
        @Index(name = "idx_lineup_unique_player", columnList = "match_id, player_id", unique = true)
})
public class MatchLineup {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "match_id", nullable = false)
    private Match match;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "player_id", nullable = false)
    private Player player;

    @Column(name = "jersey_number")
    private Integer jerseyNumber;

    @Column(name = "is_captain")
    private boolean isCaptain;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    private com.athleticaos.backend.enums.LineupRole role; // STARTER, BENCH

    @Column(name = "order_index")
    private Integer orderIndex;

    @Column(name = "is_starter") // Keeping for backward compatibility or ease of query for now
    private boolean isStarter;

    @Column(name = "position_display")
    private String positionDisplay; // e.g. "Prop", "Fly Half"

    @Builder.Default
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    @PrePersist
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
        if (role == com.athleticaos.backend.enums.LineupRole.STARTER) {
            isStarter = true;
        } else {
            isStarter = false;
        }
    }
}
