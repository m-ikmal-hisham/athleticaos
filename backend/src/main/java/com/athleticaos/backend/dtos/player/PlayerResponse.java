package com.athleticaos.backend.dtos.player;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PlayerResponse {
    private UUID id;
    private UUID personId;
    private String firstName;
    private String lastName;
    private String gender;
    private LocalDate dob;
    private String nationality;
    private String status;
    private String dominantHand;
    private String dominantLeg;
    private Integer heightCm;
    private Integer weightKg;
}
