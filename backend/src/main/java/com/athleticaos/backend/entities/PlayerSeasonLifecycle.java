package com.athleticaos.backend.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "player_season_lifecycles", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "player_id", "season_year" })
})
public class PlayerSeasonLifecycle {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "player_id", nullable = false)
    private Player player;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organisation_id", nullable = false)
    private Organisation organisation;

    @Column(name = "season_year", nullable = false)
    private Integer seasonYear;

    @Column(name = "age_group", nullable = false)
    private String ageGroup;

    @Column(name = "auto_age_up", nullable = false)
    @Builder.Default
    private boolean autoAgeUp = true;
}
