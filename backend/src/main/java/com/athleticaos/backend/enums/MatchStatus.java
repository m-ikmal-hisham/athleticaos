package com.athleticaos.backend.enums;

public enum MatchStatus {
    SCHEDULED,
    ONGOING,
    LIVE, // Added to support database value
    COMPLETED,
    CANCELLED
}
