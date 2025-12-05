package com.athleticaos.backend.utils;

import com.athleticaos.backend.repositories.TeamRepository;

public class SlugGenerator {

    /**
     * Generate a URL-friendly slug from a name
     * Example: "Sydney Roosters U18" -> "sydney-roosters-u18"
     */
    public static String generateSlug(String name) {
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("Name cannot be null or empty");
        }

        return name.toLowerCase()
                .replaceAll("[^a-z0-9\\s-]", "") // Remove special characters
                .replaceAll("\\s+", "-") // Replace spaces with hyphens
                .replaceAll("-+", "-") // Replace multiple hyphens with single
                .replaceAll("^-|-$", "") // Remove leading/trailing hyphens
                .trim();
    }

    /**
     * Generate a unique slug by appending a counter if needed
     * Example: "sydney-roosters-u18" -> "sydney-roosters-u18-2" if first exists
     */
    public static String generateUniqueSlug(String name, TeamRepository repository) {
        String baseSlug = generateSlug(name);
        String slug = baseSlug;
        int counter = 1;

        while (repository.existsBySlug(slug)) {
            slug = baseSlug + "-" + counter++;
        }

        return slug;
    }
}
