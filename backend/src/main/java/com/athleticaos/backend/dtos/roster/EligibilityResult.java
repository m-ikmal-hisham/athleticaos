package com.athleticaos.backend.dtos.roster;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EligibilityResult {
    private boolean eligible;
    private String reason;
}
