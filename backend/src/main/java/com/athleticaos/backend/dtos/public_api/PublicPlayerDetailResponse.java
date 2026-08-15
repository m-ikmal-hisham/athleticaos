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
public class PublicPlayerDetailResponse {
    private UUID id;
    private String firstName;
    private String lastName;
    private String idType;
    private String idNumber;
    private String dateOfBirth;
    private String gender;
    private String country;
    private String state;
    private String city;
    private String bloodGroup;
    private String emergencyContactName;
    private String emergencyContactNumber;
    private String emergencyContactRelationship;
    private String position;
    private String position2;
    private Integer jerseyNumber;
    private String organisationName;
    private String profilePictureUrl;
    private String currentTeamName;
    private UUID currentTeamId;
    private java.util.List<PublicTeamDetailResponse.TournamentSummary> tournaments;
}
