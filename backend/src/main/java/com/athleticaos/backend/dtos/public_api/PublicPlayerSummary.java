package com.athleticaos.backend.dtos.public_api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PublicPlayerSummary {
    private UUID id;
    private String firstName;
    private String lastName;
    private String idType;
    private String idNumber;
    private String dateOfBirth;
    private String position;
    private String position2;
    private Integer jerseyNumber;
    private String profilePictureUrl;
    private Integer tries;
    private Integer conversions;
    private Integer penalties;
    private Integer dropGoals;
    private Integer yellowCards;
    private Integer redCards;
    private Integer appearances;
}
