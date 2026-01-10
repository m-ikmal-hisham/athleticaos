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
 * Represents a player's roster entry for a specific tournament and team.
 * Tracks eligibility status and provides notes for ineligibility reasons.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "tournament_players", uniqueConstraints = {
                @UniqueConstraint(columnNames = { "tournament_id", "team_id", "player_id" })
}, indexes = {
                @Index(name = "idx_tournament_player_tournament", columnList = "tournament_id"),
                @Index(name = "idx_tournament_player_team", columnList = "team_id"),
                @Index(name = "idx_tournament_player_player", columnList = "player_id"),
                @Index(name = "idx_tournament_player_tournament_team", columnList = "tournament_id, team_id"),
                @Index(name = "idx_tournament_player_active", columnList = "is_active"),
                @Index(name = "idx_tournament_player_tournament_team_active", columnList = "tournament_id, team_id, is_active")
})
public class TournamentPlayer {

        @Id
        @GeneratedValue(strategy = GenerationType.UUID)
        private UUID id;

        @ManyToOne(fetch = FetchType.LAZY)
        @JoinColumn(name = "tournament_id", nullable = false)
        private Tournament tournament;

        @ManyToOne(fetch = FetchType.LAZY)
        @JoinColumn(name = "team_id", nullable = false)
        private Team team;

        @ManyToOne(fetch = FetchType.LAZY)
        @JoinColumn(name = "player_id", nullable = false)
        private Player player;

        @Column(name = "is_active", nullable = false)
        @Builder.Default
        private boolean isActive = true;

        @Column(name = "is_eligible", nullable = false)
        @Builder.Default
        private boolean isEligible = true;

        @Column(name = "eligibility_note")
        private String eligibilityNote;

        /**
         * Tournament-specific jersey number for this player.
         * This overrides the team-level jersey number (PlayerTeam.jerseyNumber) for
         * this tournament.
         * Priority: tournamentJerseyNumber > PlayerTeam.jerseyNumber > null
         * Can be further overridden per-match in MatchLineup.jerseyNumber
         */
        @Column(name = "tournament_jersey_number")
        private Integer tournamentJerseyNumber;

        @CreationTimestamp
        @Column(name = "created_at", nullable = false, updatable = false)
        private LocalDateTime createdAt;
}
