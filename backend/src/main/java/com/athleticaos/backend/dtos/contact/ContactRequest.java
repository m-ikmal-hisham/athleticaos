package com.athleticaos.backend.dtos.contact;

import com.athleticaos.backend.enums.ContactSubject;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContactRequest {

    @NotBlank(message = "Name is required")
    @Size(min = 2, max = 120, message = "Name must be between 2 and 120 characters")
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be a valid email address")
    @Size(max = 254, message = "Email must not exceed 254 characters")
    private String email;

    @Size(max = 160, message = "Organisation must not exceed 160 characters")
    private String organisation;

    @NotNull(message = "Subject is required")
    private ContactSubject subject;

    @NotBlank(message = "Message is required")
    @Size(min = 10, max = 4000, message = "Message must be between 10 and 4000 characters")
    private String message;

    private String website;
}
