package com.athleticaos.backend.utils;

import com.athleticaos.backend.entities.Match;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

class VenueUtilsTest {

    @Test
    @DisplayName("normalizeVenue trims whitespace and returns empty string for null or blank")
    void normalizeVenue_handlesNullAndWhitespace() {
        assertEquals("", VenueUtils.normalizeVenue(null));
        assertEquals("", VenueUtils.normalizeVenue("   "));
        assertEquals("Venue A", VenueUtils.normalizeVenue("  Venue A  "));
        assertEquals("Venue B", VenueUtils.normalizeVenue("Venue B"));
    }

    @Test
    @DisplayName("Cross-venue feeder appends feeder venue: Lose 77 -> Lose 77 (Venue B)")
    void formatFeederPlaceholder_crossVenue_appendsFeederVenue() {
        Match feeder = Match.builder()
                .id(UUID.randomUUID())
                .matchNumber(77)
                .venue("Venue B")
                .build();

        Match target = Match.builder()
                .id(UUID.randomUUID())
                .matchNumber(85)
                .venue("Venue A")
                .build();

        String result = VenueUtils.formatFeederPlaceholder("Lose 77", target.getVenue(), feeder);
        assertEquals("Lose 77 (Venue B)", result);
    }

    @Test
    @DisplayName("Same-venue feeder leaves placeholder unchanged: Lose 77 -> Lose 77")
    void formatFeederPlaceholder_sameVenue_leavesUnchanged() {
        Match feeder = Match.builder()
                .id(UUID.randomUUID())
                .matchNumber(77)
                .venue("Venue B")
                .build();

        Match target = Match.builder()
                .id(UUID.randomUUID())
                .matchNumber(86)
                .venue("Venue B")
                .build();

        String result = VenueUtils.formatFeederPlaceholder("Lose 77", target.getVenue(), feeder);
        assertEquals("Lose 77", result);
    }

    @Test
    @DisplayName("Winner feeder cross-venue: Winner 12 -> Winner 12 (Venue B)")
    void formatFeederPlaceholder_winnerCrossVenue_appendsFeederVenue() {
        Match feeder = Match.builder()
                .id(UUID.randomUUID())
                .matchNumber(12)
                .venue("Venue B")
                .build();

        Match target = Match.builder()
                .id(UUID.randomUUID())
                .matchNumber(30)
                .venue("Venue A")
                .build();

        String result = VenueUtils.formatFeederPlaceholder("Winner 12", target.getVenue(), feeder);
        assertEquals("Winner 12 (Venue B)", result);
    }

    @Test
    @DisplayName("Feeder identified via map lookup by slot link")
    void formatFeederPlaceholder_resolvedViaSlotLink() {
        UUID feederId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();

        Match feeder = Match.builder()
                .id(feederId)
                .matchNumber(77)
                .venue("Venue B")
                .nextMatchIdForLoser(targetId)
                .loserSlot("HOME")
                .build();

        Match target = Match.builder()
                .id(targetId)
                .matchNumber(85)
                .venue("Venue A")
                .build();

        Map<UUID, Match> byId = new HashMap<>();
        byId.put(feederId, feeder);
        byId.put(targetId, target);

        String result = VenueUtils.formatFeederPlaceholder(target, "TBD", "HOME", byId, null, null);
        assertEquals("Lose 77 (Venue B)", result);
    }

    @Test
    @DisplayName("Feeder with null/blank venue leaves placeholder unchanged")
    void formatFeederPlaceholder_blankFeederVenue_leavesUnchanged() {
        Match feeder = Match.builder()
                .id(UUID.randomUUID())
                .matchNumber(77)
                .venue(null)
                .build();

        Match target = Match.builder()
                .id(UUID.randomUUID())
                .matchNumber(85)
                .venue("Venue A")
                .build();

        String result = VenueUtils.formatFeederPlaceholder("Lose 77", target.getVenue(), feeder);
        assertEquals("Lose 77", result);
    }

    @Test
    @DisplayName("Pool standings and seed placeholders remain unaffected")
    void formatFeederPlaceholder_poolPlaceholders_unaffected() {
        Match target = Match.builder()
                .id(UUID.randomUUID())
                .matchNumber(1)
                .venue("Venue A")
                .build();

        Map<Integer, Match> byNumber = new HashMap<>();

        assertEquals("Winner Pool A", VenueUtils.formatFeederPlaceholder(target, "Winner Pool A", "HOME", null, byNumber, null));
        assertEquals("Runner-up Pool B", VenueUtils.formatFeederPlaceholder(target, "Runner-up Pool B", "AWAY", null, byNumber, null));
        assertEquals("Seed 1", VenueUtils.formatFeederPlaceholder(target, "Seed 1", "HOME", null, byNumber, null));
    }
}
