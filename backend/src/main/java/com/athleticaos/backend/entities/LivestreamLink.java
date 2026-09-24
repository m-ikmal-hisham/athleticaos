package com.athleticaos.backend.entities;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/**
 * One stream a tournament points viewers to. Stored as an element of the tournaments.livestream_links
 * JSON array; label is optional ("Pitch A", "Day 2"), url is always an http(s) link.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LivestreamLink implements Serializable {
    private String label;
    private String url;
}
