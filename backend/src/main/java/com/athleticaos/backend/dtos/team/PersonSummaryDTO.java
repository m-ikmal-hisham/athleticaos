package com.athleticaos.backend.dtos.team;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PersonSummaryDTO {
    private String id;
    private String firstName;
    private String lastName;
    private String email;
}
