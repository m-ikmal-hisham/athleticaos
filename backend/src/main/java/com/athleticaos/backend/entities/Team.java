package com.athleticaos.backend.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "teams")
public class Team {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organisation_id", nullable = false)
    private Organisation organisation;

    @Column(unique = true, length = 255)
    private String slug;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String category; // MENS, WOMENS, MIXED

    @Column(name = "age_group", nullable = false)
    private String ageGroup;

    @Column
    private String division; // Premier, Division 1, Division 2, School

    @Column
    private String state; // State/Region

    @Column
    @Builder.Default
    private String status = "Active"; // Active, Inactive

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
