package com.athleticaos.backend.dtos.person;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PersonResponseDTO {
    private String id;
    private String firstName;
    private String lastName;
    // Identification — raw value NOT exposed in responses (Phase 1 containment)
    private boolean identificationPresent;
    private String identificationType;
    private String identificationDisplay; // "PRESENT" when an IC/passport is stored, null otherwise
    private LocalDate dob;
    private String gender;
    private String nationality;
    private String email;
    private String phone;
    private String registeredAt;
    private String nationalPlayerStatus;
    private String nationalOrganisationLogoUrl;
    
    // Dynamic roles
    private List<String> roles;
    private String userId;
    
    @JsonProperty("isPlayer")
    private boolean isPlayer;
    
    @JsonProperty("isStaff")
    private boolean isStaff;
    
    @JsonProperty("isOfficial")
    private boolean isOfficial;
    
    @JsonProperty("isWorldRugbyCertified")
    private boolean isWorldRugbyCertified;
}
