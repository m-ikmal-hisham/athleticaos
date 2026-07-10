package com.athleticaos.backend.dtos.public_api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicCategorySummary {
    private UUID id;
    private String name;
    private String description;
}
