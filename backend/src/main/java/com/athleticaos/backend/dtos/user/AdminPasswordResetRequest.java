package com.athleticaos.backend.dtos.user;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminPasswordResetRequest {
    // Temporary password conveyed to the user out-of-band; they must change it at next sign-in.
    @NotBlank(message = "New password is required")
    @ToString.Exclude
    private String newPassword;
}
