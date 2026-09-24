package com.athleticaos.backend.dtos.tournament;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * Outcome of seeding knockout brackets from pool results. A category is seeded only once every
 * one of its pool matches is finished; the rest are reported as skipped so the organiser can see
 * why their bracket has not filled yet.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PoolSeedingResult {

    /** Categories whose brackets were seeded, by name. */
    @Builder.Default
    private List<String> seededCategories = new ArrayList<>();

    /** Categories left alone because pool matches are still to be played, e.g. "Boys U16 (3 pool matches left)". */
    @Builder.Default
    private List<String> skippedCategories = new ArrayList<>();
}
