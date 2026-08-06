package com.athleticaos.backend.entities;

import com.athleticaos.backend.enums.MatchStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "matches")
public class Match {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tournament_id", nullable = false)
    private Tournament tournament;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private TournamentCategory category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "home_team_id", nullable = true)
    private Team homeTeam;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "away_team_id", nullable = true)
    private Team awayTeam;

    @Column(name = "match_date", nullable = true)
    private LocalDate matchDate;

    @Column(name = "kick_off_time", nullable = true)
    private LocalTime kickOffTime;

    @Column
    private String venue;

    @Column
    private String pitch;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private MatchStatus status = MatchStatus.SCHEDULED;

    @Column(name = "home_score")
    private Integer homeScore;

    @Column(name = "away_score")
    private Integer awayScore;

    /**
     * How the result came about. Null is equivalent to
     * {@link com.athleticaos.backend.enums.MatchResultType#NORMAL}.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "result_type")
    private com.athleticaos.backend.enums.MatchResultType resultType;

    /**
     * Explicit winner for results with no scores to derive one from (byes and walkovers).
     * Left null for normally played matches, where the scores decide it.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "winner_team_id")
    private Team winnerTeam;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stage_id")
    private TournamentStage stage;

    @Column
    private String phase;

    @Column(name = "match_code")
    private String matchCode;

    @Column(name = "next_match_id_for_winner")
    private UUID nextMatchIdForWinner;

    @Column(name = "next_match_id_for_loser")
    private UUID nextMatchIdForLoser;

    @Column(name = "winner_slot")
    private String winnerSlot; // HOME or AWAY

    @Column(name = "loser_slot")
    private String loserSlot; // HOME or AWAY

    @Column(name = "home_team_placeholder")
    private String homeTeamPlaceholder;

    @Column(name = "away_team_placeholder")
    private String awayTeamPlaceholder;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(nullable = false)
    @Builder.Default
    private boolean deleted = false;
}
