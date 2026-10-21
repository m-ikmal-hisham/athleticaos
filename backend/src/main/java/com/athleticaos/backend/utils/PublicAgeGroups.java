package com.athleticaos.backend.utils;

public final class PublicAgeGroups {

    private static final int[] BANDS = {8, 10, 12, 14, 16, 18};

    private PublicAgeGroups() {
        // Utility class
    }

    /**
     * Computes the age group band for an under-18 player.
     * Returns "Under " + band where band is the smallest even number strictly above
     * the age from {8, 10, 12, 14, 16, 18}.
     * Returns null for age >= 18 or negative ages.
     */
    public static String ageGroupFor(int age) {
        if (age < 0 || age >= 18) {
            return null;
        }
        for (int band : BANDS) {
            if (band > age) {
                return "Under " + band;
            }
        }
        return null;
    }
}
