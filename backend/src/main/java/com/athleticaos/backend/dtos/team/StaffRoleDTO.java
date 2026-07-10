package com.athleticaos.backend.dtos.team;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffRoleDTO {
    private Integer id;
    private String name;
    private String description;
}
