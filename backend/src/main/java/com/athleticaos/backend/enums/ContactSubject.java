package com.athleticaos.backend.enums;

public enum ContactSubject {
    GENERAL("General enquiry"),
    PARTNERSHIP("Partnership"),
    ORGANISATION_REGISTRATION("Register my organisation"),
    MEDIA("Media & press"),
    TOURNAMENT_SUPPORT("Tournament organiser support");

    private final String label;

    ContactSubject(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
