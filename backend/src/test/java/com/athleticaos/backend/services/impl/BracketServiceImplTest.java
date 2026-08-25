package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.entities.Team;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class BracketServiceImplTest {

    @Test
    void nextPowerOfTwoPadsNonStandardDraws() {
        assertEquals(32, BracketServiceImpl.nextPowerOfTwo(22));
        assertEquals(32, BracketServiceImpl.nextPowerOfTwo(32));
        assertEquals(64, BracketServiceImpl.nextPowerOfTwo(33));
    }

    @Test
    void determineKnockoutStagesSupportsDrawsAbove64() {
        List<String> names = BracketServiceImpl.determineKnockoutStages(128).stream()
                .map(info -> info.getName())
                .toList();

        assertEquals(List.of(
                "Round of 128", "Round of 64", "Round of 32", "Round of 16",
                "Quarter Finals", "Semi Finals", "Final"), names);
    }

    @Test
    void nonPowerOfTwoDrawNeverCreatesAnEmptyVersusEmptyOpeningMatch() {
        List<Team> teams = java.util.stream.IntStream.range(0, 22)
                .mapToObj(index -> Team.builder().name("Team " + index).build())
                .toList();
        List<Team> slots = BracketServiceImpl.buildOpeningRoundSlots(teams, 32);

        assertEquals(32, slots.size());
        for (int index = 0; index < slots.size(); index += 2) {
            long populatedSlots = java.util.stream.Stream.of(slots.get(index), slots.get(index + 1))
                    .filter(java.util.Objects::nonNull)
                    .count();
            assertTrue(populatedSlots >= 1);
        }
    }

    @Test
    void rejectsUnreasonablyLargeDrawBeforeIntegerOverflow() {
        assertThrows(IllegalArgumentException.class,
                () -> BracketServiceImpl.nextPowerOfTwo((1 << 20) + 1));
    }
}
