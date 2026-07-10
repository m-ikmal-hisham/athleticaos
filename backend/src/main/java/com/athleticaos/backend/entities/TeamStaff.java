package com.athleticaos.backend.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "team_staff", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "team_id", "person_id", "staff_role_id" })
})
public class TeamStaff {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "person_id", nullable = false)
    private Person person;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "staff_role_id", nullable = false)
    private StaffRole staffRole;

    @Column(name = "joined_at", nullable = false)
    private LocalDate joinedAt;

    @Column(name = "is_world_rugby_certified")
    private boolean isWorldRugbyCertified;
}
