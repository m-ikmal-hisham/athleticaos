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
import java.time.LocalTime;
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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tournament_id", nullable = false)
    private Tournament tournament;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private TournamentCategory category;

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

    @Column(name = "buffer_time_minutes")
    private Integer bufferTimeMinutes;

    @Column(name = "carnival_start_time")
    private LocalTime carnivalStartTime; // Using LocalDateTime or LocalTime? User said "Select start time and end
                                         // time of the tournament is a carnival". Usually daily start/end. Let's
                                         // use LocalTime for daily carnival hours.

    @Column(name = "carnival_end_time")
    private LocalTime carnivalEndTime;

    @Column(name = "is_one_way_match")
    @Builder.Default
    private Boolean isOneWayMatch = false;

    /**
     * Teams per placement bracket, i.e. how many places each rung of the ladder covers.
     * Null falls back to the generator's default of 4 (Cup 1-4, Plate 5-8, ... with no
     * quarter-finals); 8 gives Cup 1-8, Plate 9-16, ... with a quarter-final per bracket.
     */
    @Column(name = "placement_bracket_size")
    private Integer placementBracketSize;

    @Column(name = "include_placement_stages")
    @Builder.Default
    private Boolean includePlacementStages = false;

    @Column(name = "is_strictly_validated")
    @Builder.Default
    private Boolean isStrictlyValidated = false;

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
    private Integer maxBenchCount = 10;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
