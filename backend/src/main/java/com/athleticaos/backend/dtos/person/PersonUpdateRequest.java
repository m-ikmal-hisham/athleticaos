package com.athleticaos.backend.dtos.person;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PersonUpdateRequest {
    private String firstName;
    private String lastName;
    // icOrPassport: null = leave existing value unchanged; non-blank = validate and replace
    private String icOrPassport;
    // identificationType: MALAYSIAN_IC | PASSPORT | OTHER (canonical Phase 1 values)
    private String identificationType;
    private LocalDate dob;
    private String gender;
    private String nationality;
    private String email;
    private String phone;
    private String nationalPlayerStatus;
    private Boolean isPlayer;
    private Boolean isOfficial;
    private Boolean isStaff;
}
