package com.athleticaos.backend.entities;

import com.athleticaos.backend.enums.TournamentFormat;
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
@Table(name = "tournament_format_configs")
public class TournamentFormatConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tournament_id", nullable = false, unique = true)
    private Tournament tournament;

    @Enumerated(EnumType.STRING)
    @Column(name = "format_type", nullable = false)
    private TournamentFormat formatType;

    @Column(name = "rugby_format", nullable = false) // XV, SEVENS, TENS
    private String rugbyFormat;

    @Column(name = "team_count", nullable = false)
    private Integer teamCount;

    @Column(name = "pool_count")
    private Integer poolCount;

    @Column(name = "match_duration_minutes", nullable = false)
    private Integer matchDurationMinutes;

    // Scoring Rules
    @Column(name = "points_win", nullable = false)
    @Builder.Default
    private Integer pointsWin = 4;

    @Column(name = "points_draw", nullable = false)
    @Builder.Default
    private Integer pointsDraw = 2;

    @Column(name = "points_loss", nullable = false)
    @Builder.Default
    private Integer pointsLoss = 0;

    @Column(name = "points_bonus_try")
    @Builder.Default
    private Integer pointsBonusTry = 1;

    @Column(name = "points_bonus_loss")
    @Builder.Default
    private Integer pointsBonusLoss = 1;

    // Lineup Rules
    @Column(name = "starters_count", nullable = false)
    private Integer startersCount;

    @Column(name = "max_bench_count", nullable = false)
    @Builder.Default
    private Integer maxBenchCount = 8;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
