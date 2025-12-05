package com.athleticaos.backend.dtos.user;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InviteUserResponse {

    private UUID userId;
    private String email;
    private String role;
    private UUID organisationId;
    private String inviteStatus;
    private String message;
}
