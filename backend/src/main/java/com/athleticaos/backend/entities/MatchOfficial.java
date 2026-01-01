package com.athleticaos.backend.entities;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "match_officials")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MatchOfficial {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "match_id", nullable = false)
    private Match match;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "official_id", nullable = false)
    private OfficialRegistry official;

    @Column(nullable = false)
    private String assignedRole; // "REFEREE", "AR1", "AR2", "TMO", "4TH_OFFICIAL"

    @Column(nullable = false)
    private boolean isConfirmed;

    // Optional: Track if they were replaced?
}
