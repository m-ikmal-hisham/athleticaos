package com.athleticaos.backend.dtos.user;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UserResponse {
    private UUID id;
    private String firstName;
    private String lastName;
    private String email;
    private String phone;

    private boolean isActive;

    private String status;
    private Set<String> roles;
    private UUID organisationId;
    private String organisationName;
    private List<String> teamNames;
    private List<UUID> teamIds;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @JsonProperty("isActive")
    public boolean isActive() {
        return isActive;
    }
}
