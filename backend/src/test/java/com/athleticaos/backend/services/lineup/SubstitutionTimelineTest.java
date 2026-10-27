package com.athleticaos.backend.services.lineup;

import com.athleticaos.backend.enums.LineupRole;
import com.athleticaos.backend.services.lineup.SubstitutionTimeline.EventInput;
import com.athleticaos.backend.services.lineup.SubstitutionTimeline.LineupInput;
import com.athleticaos.backend.services.lineup.SubstitutionTimeline.PlayerTimeline;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class SubstitutionTimelineTest {

    // Ordering: minute (null = 0), then createdAt.

    private LineupInput starter(UUID id, String name, int jersey) {
        return new LineupInput(id, name, jersey, LineupRole.STARTER, true, false, jersey, "Pos " + jersey);
    }

    private LineupInput bench(UUID id, String name, int jersey) {
        return new LineupInput(id, name, jersey, LineupRole.BENCH, false, false, jersey, "Reserve " + jersey);
    }

    private EventInput sub(UUID offPlayerId, String offName, UUID onPlayerId, String onName, Integer minute, LocalDateTime createdAt) {
        return new EventInput(offPlayerId, offName, null, onPlayerId, onName, null, minute, createdAt);
    }

    @Test
    @DisplayName("1. One sub: starter goes off, bench comes on")
    void oneSubstitution() {
        UUID p1 = UUID.randomUUID(); // Starter
        UUID p2 = UUID.randomUUID(); // Bench

        List<LineupInput> lineups = List.of(starter(p1, "Alice", 10), bench(p2, "Bob", 16));
        List<EventInput> events = List.of(
                sub(p1, "Alice", p2, "Bob", 34, LocalDateTime.of(2026, 1, 1, 10, 34))
        );

        List<PlayerTimeline> result = SubstitutionTimeline.computeTimeline(lineups, events);
        Map<UUID, PlayerTimeline> map = result.stream().collect(Collectors.toMap(PlayerTimeline::playerId, p -> p));

        PlayerTimeline alice = map.get(p1);
        assertThat(alice.originalRole()).isEqualTo(LineupRole.STARTER);
        assertThat(alice.played()).isTrue();
        assertThat(alice.onFieldAtEnd()).isFalse();
        assertThat(alice.substitutions()).hasSize(1);
        assertThat(alice.substitutions().get(0).direction()).isEqualTo("OFF");
        assertThat(alice.substitutions().get(0).minute()).isEqualTo(34);
        assertThat(alice.substitutions().get(0).otherPlayerName()).isEqualTo("Bob");

        PlayerTimeline bob = map.get(p2);
        assertThat(bob.originalRole()).isEqualTo(LineupRole.BENCH);
        assertThat(bob.played()).isTrue();
        assertThat(bob.onFieldAtEnd()).isTrue();
        assertThat(bob.substitutions()).hasSize(1);
        assertThat(bob.substitutions().get(0).direction()).isEqualTo("ON");
        assertThat(bob.substitutions().get(0).minute()).isEqualTo(34);
        assertThat(bob.substitutions().get(0).otherPlayerName()).isEqualTo("Alice");
    }

    @Test
    @DisplayName("2. Two subs in one team at different minutes")
    void twoSubsInOneTeam() {
        UUID p1 = UUID.randomUUID(); // Starter 1
        UUID p2 = UUID.randomUUID(); // Starter 2
        UUID b1 = UUID.randomUUID(); // Bench 1
        UUID b2 = UUID.randomUUID(); // Bench 2

        List<LineupInput> lineups = List.of(
                starter(p1, "Player 1", 1),
                starter(p2, "Player 2", 2),
                bench(b1, "Bench 1", 16),
                bench(b2, "Bench 2", 17)
        );

        List<EventInput> events = List.of(
                sub(p1, "Player 1", b1, "Bench 1", 40, LocalDateTime.of(2026, 1, 1, 10, 40)),
                sub(p2, "Player 2", b2, "Bench 2", 55, LocalDateTime.of(2026, 1, 1, 10, 55))
        );

        List<PlayerTimeline> result = SubstitutionTimeline.computeTimeline(lineups, events);
        Map<UUID, PlayerTimeline> map = result.stream().collect(Collectors.toMap(PlayerTimeline::playerId, p -> p));

        assertThat(map.get(p1).onFieldAtEnd()).isFalse();
        assertThat(map.get(p2).onFieldAtEnd()).isFalse();
        assertThat(map.get(b1).onFieldAtEnd()).isTrue();
        assertThat(map.get(b2).onFieldAtEnd()).isTrue();
        assertThat(map.get(b1).played()).isTrue();
        assertThat(map.get(b2).played()).isTrue();
    }

    @Test
    @DisplayName("3. Re-entry: player goes off and later comes on again (blood / HIA)")
    void reEntryOffThenOn() {
        UUID p1 = UUID.randomUUID(); // Starter
        UUID b1 = UUID.randomUUID(); // Bench

        List<LineupInput> lineups = List.of(starter(p1, "Captain", 7), bench(b1, "Sub", 20));
        List<EventInput> events = List.of(
                sub(p1, "Captain", b1, "Sub", 20, LocalDateTime.of(2026, 1, 1, 10, 20)),
                sub(b1, "Sub", p1, "Captain", 30, LocalDateTime.of(2026, 1, 1, 10, 30))
        );

        List<PlayerTimeline> result = SubstitutionTimeline.computeTimeline(lineups, events);
        Map<UUID, PlayerTimeline> map = result.stream().collect(Collectors.toMap(PlayerTimeline::playerId, p -> p));

        PlayerTimeline captain = map.get(p1);
        assertThat(captain.originalRole()).isEqualTo(LineupRole.STARTER);
        assertThat(captain.played()).isTrue();
        assertThat(captain.onFieldAtEnd()).isTrue();
        assertThat(captain.substitutions()).hasSize(2);
        assertThat(captain.substitutions().get(0).direction()).isEqualTo("OFF");
        assertThat(captain.substitutions().get(0).minute()).isEqualTo(20);
        assertThat(captain.substitutions().get(1).direction()).isEqualTo("ON");
        assertThat(captain.substitutions().get(1).minute()).isEqualTo(30);

        PlayerTimeline sub = map.get(b1);
        assertThat(sub.originalRole()).isEqualTo(LineupRole.BENCH);
        assertThat(sub.played()).isTrue();
        assertThat(sub.onFieldAtEnd()).isFalse();
        assertThat(sub.substitutions()).hasSize(2);
        assertThat(sub.substitutions().get(0).direction()).isEqualTo("ON");
        assertThat(sub.substitutions().get(1).direction()).isEqualTo("OFF");
    }

    @Test
    @DisplayName("4. A replacement who is later replaced (bench player comes on, then subbed off)")
    void replacementLaterReplaced() {
        UUID p1 = UUID.randomUUID(); // Starter
        UUID b1 = UUID.randomUUID(); // Bench 1
        UUID b2 = UUID.randomUUID(); // Bench 2

        List<LineupInput> lineups = List.of(starter(p1, "Starter", 9), bench(b1, "FirstSub", 21), bench(b2, "SecondSub", 22));
        List<EventInput> events = List.of(
                sub(p1, "Starter", b1, "FirstSub", 30, LocalDateTime.of(2026, 1, 1, 10, 30)),
                sub(b1, "FirstSub", b2, "SecondSub", 65, LocalDateTime.of(2026, 1, 1, 11, 5))
        );

        List<PlayerTimeline> result = SubstitutionTimeline.computeTimeline(lineups, events);
        Map<UUID, PlayerTimeline> map = result.stream().collect(Collectors.toMap(PlayerTimeline::playerId, p -> p));

        PlayerTimeline firstSub = map.get(b1);
        assertThat(firstSub.originalRole()).isEqualTo(LineupRole.BENCH);
        assertThat(firstSub.played()).isTrue();
        assertThat(firstSub.onFieldAtEnd()).isFalse();
        assertThat(firstSub.substitutions()).hasSize(2);
        assertThat(firstSub.substitutions().get(0).direction()).isEqualTo("ON");
        assertThat(firstSub.substitutions().get(0).minute()).isEqualTo(30);
        assertThat(firstSub.substitutions().get(1).direction()).isEqualTo("OFF");
        assertThat(firstSub.substitutions().get(1).minute()).isEqualTo(65);

        PlayerTimeline secondSub = map.get(b2);
        assertThat(secondSub.originalRole()).isEqualTo(LineupRole.BENCH);
        assertThat(secondSub.played()).isTrue();
        assertThat(secondSub.onFieldAtEnd()).isTrue();
    }

    @Test
    @DisplayName("5. Events out of minute order are sorted properly")
    void eventsOutOfMinuteOrder() {
        UUID p1 = UUID.randomUUID();
        UUID b1 = UUID.randomUUID();
        UUID p2 = UUID.randomUUID();
        UUID b2 = UUID.randomUUID();

        List<LineupInput> lineups = List.of(
                starter(p1, "S1", 1),
                starter(p2, "S2", 2),
                bench(b1, "B1", 16),
                bench(b2, "B2", 17)
        );

        // Put minute 70 before minute 20
        List<EventInput> events = List.of(
                sub(p2, "S2", b2, "B2", 70, LocalDateTime.of(2026, 1, 1, 10, 7)),
                sub(p1, "S1", b1, "B1", 20, LocalDateTime.of(2026, 1, 1, 10, 2))
        );

        List<PlayerTimeline> result = SubstitutionTimeline.computeTimeline(lineups, events);
        Map<UUID, PlayerTimeline> map = result.stream().collect(Collectors.toMap(PlayerTimeline::playerId, p -> p));

        assertThat(map.get(p1).substitutions().get(0).minute()).isEqualTo(20);
        assertThat(map.get(p2).substitutions().get(0).minute()).isEqualTo(70);
    }

    @Test
    @DisplayName("6. An event deleted / omitted from the list leaves player on field")
    void eventDeleted() {
        UUID p1 = UUID.randomUUID();
        UUID b1 = UUID.randomUUID();

        List<LineupInput> lineups = List.of(starter(p1, "Starter", 10), bench(b1, "UnusedBench", 16));
        // No events (e.g. event was deleted / undone)
        List<EventInput> events = List.of();

        List<PlayerTimeline> result = SubstitutionTimeline.computeTimeline(lineups, events);
        Map<UUID, PlayerTimeline> map = result.stream().collect(Collectors.toMap(PlayerTimeline::playerId, p -> p));

        PlayerTimeline starter = map.get(p1);
        assertThat(starter.originalRole()).isEqualTo(LineupRole.STARTER);
        assertThat(starter.played()).isTrue();
        assertThat(starter.onFieldAtEnd()).isTrue();
        assertThat(starter.substitutions()).isEmpty();

        PlayerTimeline bench = map.get(b1);
        assertThat(bench.originalRole()).isEqualTo(LineupRole.BENCH);
        assertThat(bench.played()).isFalse();
        assertThat(bench.onFieldAtEnd()).isFalse();
        assertThat(bench.substitutions()).isEmpty();
    }

    @Test
    @DisplayName("7. Players not in the lineup are included with synthesized entries")
    void playersNotInLineup() {
        UUID p1 = UUID.randomUUID(); // In lineup
        UUID guest = UUID.randomUUID(); // Not in lineup

        List<LineupInput> lineups = List.of(starter(p1, "ListedStarter", 1));
        List<EventInput> events = List.of(
                sub(p1, "ListedStarter", guest, "GuestPlayer", 45, LocalDateTime.of(2026, 1, 1, 10, 45))
        );

        List<PlayerTimeline> result = SubstitutionTimeline.computeTimeline(lineups, events);
        Map<UUID, PlayerTimeline> map = result.stream().collect(Collectors.toMap(PlayerTimeline::playerId, p -> p));

        assertThat(map).containsKey(guest);
        PlayerTimeline guestTimeline = map.get(guest);
        assertThat(guestTimeline.playerName()).isEqualTo("GuestPlayer");
        assertThat(guestTimeline.originalRole()).isEqualTo(LineupRole.BENCH);
        assertThat(guestTimeline.played()).isTrue();
        assertThat(guestTimeline.onFieldAtEnd()).isTrue();
        assertThat(guestTimeline.substitutions()).hasSize(1);
        assertThat(guestTimeline.substitutions().get(0).direction()).isEqualTo("ON");
        assertThat(guestTimeline.substitutions().get(0).otherPlayerName()).isEqualTo("ListedStarter");
    }
}
