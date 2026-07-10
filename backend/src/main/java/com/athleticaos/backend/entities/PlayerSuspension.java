package com.athleticaos.backend.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Tracks player suspensions resulting from disciplinary cards.
 * Suspensions are automatically created when red cards are issued
 * and decremented when matches are completed.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "player_suspensions", indexes = {
        @Index(name = "idx_player_suspension_tournament", columnList = "tournament_id"),
        @Index(name = "idx_player_suspension_team", columnList = "team_id"),
        @Index(name = "idx_player_suspension_player", columnList = "player_id"),
        @Index(name = "idx_player_suspension_active", columnList = "is_active"),
        @Index(name = "idx_player_suspension_tournament_active", columnList = "tournament_id, is_active"),
        @Index(name = "idx_player_suspension_tournament_team_active", columnList = "tournament_id, team_id, is_active"),
        @Index(name = "idx_player_suspension_tournament_player_active", columnList = "tournament_id, player_id, is_active")
})
public class PlayerSuspension {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tournament_id", nullable = false)
    private Tournament tournament;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "match_id") // Nullable for existing records or manual suspensions
    private Match match;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "player_id", nullable = false)
    private Player player;

    @Column(nullable = false, length = 500)
    private String reason;

    @Column(name = "matches_remaining", nullable = false)
    private int matchesRemaining;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
