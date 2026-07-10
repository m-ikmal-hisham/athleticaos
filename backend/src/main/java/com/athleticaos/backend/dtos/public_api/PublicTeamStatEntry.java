package com.athleticaos.backend.dtos.public_api;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class PublicTeamStatEntry {
    private UUID teamId;
    private String teamName;
    private String organisationName;
    private int wins;
    private int triesScored;
    private int tablePoints;
}
