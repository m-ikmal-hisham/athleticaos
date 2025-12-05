package com.athleticaos.backend.entities;

import com.athleticaos.backend.enums.CompetitionType;
import com.athleticaos.backend.enums.TournamentFormat;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "tournaments")
public class Tournament {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String level; // NATIONAL, STATE, SCHOOL

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organiser_org_id", nullable = false)
    private Organisation organiserOrg;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(nullable = false)
    private String venue;

    @Column(name = "is_published", nullable = false)
    @Builder.Default
    private boolean isPublished = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "format")
    private TournamentFormat format;

    @Column(name = "number_of_pools")
    private Integer numberOfPools;

    @Column(name = "has_placement_stages")
    @Builder.Default
    private Boolean hasPlacementStages = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "season_id")
    private Season season;

    @Enumerated(EnumType.STRING)
    @Column(name = "competition_type")
    private CompetitionType competitionType;

    @Column(name = "is_age_grade")
    @Builder.Default
    private boolean isAgeGrade = false;

    @Column(name = "age_group_label")
    private String ageGroupLabel;

    @Column(nullable = false)
    @Builder.Default
    private boolean deleted = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
