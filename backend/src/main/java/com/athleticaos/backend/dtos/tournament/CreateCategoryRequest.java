package com.athleticaos.backend.dtos.tournament;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotBlank;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateCategoryRequest {
    @NotBlank
    private String name;
    private String description;
    private String gender;
    private Integer minAge;
    private Integer maxAge;
}
