package com.athleticaos.backend.dtos.user;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UserUpdateRequest {
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private String avatarUrl;
    private Set<String> roles;
    private UUID organisationId;
    private Boolean isActive;

    // Structured Address
    private String addressLine1;
    private String addressLine2;
    private String city;
    private String postcode;
    private String state;
    private String country;
}
