package com.athleticaos.backend.dtos.public_api;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class PublicPlayerStatEntry {
    private UUID playerId;
    private String name;
    private String teamName;
    private int tries;
    private int conversions;
    private int penalties;
    private int totalPoints;
    private int yellowCards;
    private int redCards;
}
