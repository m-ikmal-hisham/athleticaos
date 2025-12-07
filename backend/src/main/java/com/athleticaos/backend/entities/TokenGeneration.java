package com.athleticaos.backend.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "token_generation")
public class TokenGeneration {

    @Id
    @Builder.Default
    private Long id = 1L; // Single row table

    @Column(nullable = false)
    private Long generation;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PreUpdate
    @PrePersist
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
