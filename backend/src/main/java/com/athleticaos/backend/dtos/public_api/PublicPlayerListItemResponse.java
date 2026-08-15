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
public class PublicPlayerListItemResponse {
    private UUID id;
    private String firstName;
    private String lastName;
    private String slug;
    private String position;
    private String position2;
    private Integer jerseyNumber;
    private String currentTeamName;
    private UUID currentTeamId;
    private String organisationName;
    private String profilePictureUrl;
    private String state;
    private String city;
    private String gender;
    private String dateOfBirth;
    private int tournamentCount;
}
