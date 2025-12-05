package com.athleticaos.backend.dtos.org;

import com.athleticaos.backend.enums.OrganisationLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class OrganisationTreeNode {
    private UUID id;
    private String name;
    private OrganisationLevel orgLevel;
    private List<OrganisationTreeNode> children;
}
