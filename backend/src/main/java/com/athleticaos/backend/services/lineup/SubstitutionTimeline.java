package com.athleticaos.backend.services.lineup;

import com.athleticaos.backend.enums.LineupRole;

import java.time.LocalDateTime;
import java.util.*;

public class SubstitutionTimeline {

    // Ordering: minute (null = 0), then createdAt.

    public record SubstitutionEntry(
            Integer minute,
            String direction, // "OFF" | "ON"
            UUID otherPlayerId,
            String otherPlayerName,
            Integer otherJerseyNumber
    ) {}

    public record PlayerTimeline(
            UUID playerId,
            String playerName,
            Integer jerseyNumber,
            LineupRole originalRole,
            boolean isStarter,
            boolean isCaptain,
            Integer orderIndex,
            String positionDisplay,
            boolean played,
            boolean onFieldAtEnd,
            List<SubstitutionEntry> substitutions
    ) {}

    public record LineupInput(
            UUID playerId,
            String playerName,
            Integer jerseyNumber,
            LineupRole role,
            boolean isStarter,
            boolean isCaptain,
            Integer orderIndex,
            String positionDisplay
    ) {}

    public record EventInput(
            UUID playerId,
            String playerName,
            Integer playerJerseyNumber,
            UUID relatedPlayerId,
            String relatedPlayerName,
            Integer relatedPlayerJerseyNumber,
            Integer minute,
            LocalDateTime createdAt
    ) {}

    /**
     * Calculates the substitution timeline and who is on the field for a team.
     *
     * @param lineupInputs       Lineup entries for the team.
     * @param substitutionEvents Substitution events for the match and team.
     * @return List of PlayerTimeline in order of lineups, plus any unlisted players from events.
     */
    public static List<PlayerTimeline> computeTimeline(
            List<LineupInput> lineupInputs,
            List<EventInput> substitutionEvents
    ) {
        Map<UUID, LineupInput> lineupMap = new LinkedHashMap<>();
        if (lineupInputs != null) {
            for (LineupInput l : lineupInputs) {
                if (l.playerId() != null) {
                    lineupMap.put(l.playerId(), l);
                }
            }
        }

        // Ordering: minute (null = 0), then createdAt.
        List<EventInput> sortedEvents = new ArrayList<>(substitutionEvents != null ? substitutionEvents : Collections.emptyList());
        sortedEvents.sort(Comparator
                .comparingInt((EventInput e) -> e.minute() != null ? e.minute() : 0)
                .thenComparing(e -> e.createdAt() != null ? e.createdAt() : LocalDateTime.MIN));

        // Discover any players involved in events who are not in the lineup
        Map<UUID, LineupInput> unlistedMap = new LinkedHashMap<>();
        for (EventInput event : sortedEvents) {
            if (event.playerId() != null && !lineupMap.containsKey(event.playerId()) && !unlistedMap.containsKey(event.playerId())) {
                // Earliest involvement is coming OFF -> original role STARTER
                unlistedMap.put(event.playerId(), new LineupInput(
                        event.playerId(),
                        event.playerName() != null ? event.playerName() : "Unknown Player",
                        event.playerJerseyNumber(),
                        LineupRole.STARTER,
                        true,
                        false,
                        null,
                        null
                ));
            }
            if (event.relatedPlayerId() != null && !lineupMap.containsKey(event.relatedPlayerId()) && !unlistedMap.containsKey(event.relatedPlayerId())) {
                // Earliest involvement is coming ON -> original role BENCH
                unlistedMap.put(event.relatedPlayerId(), new LineupInput(
                        event.relatedPlayerId(),
                        event.relatedPlayerName() != null ? event.relatedPlayerName() : "Unknown Player",
                        event.relatedPlayerJerseyNumber(),
                        LineupRole.BENCH,
                        false,
                        false,
                        null,
                        null
                ));
            }
        }

        // Combined ordered player list
        List<LineupInput> allPlayers = new ArrayList<>(lineupMap.values());
        allPlayers.addAll(unlistedMap.values());

        // Map to collect substitutions per player
        Map<UUID, List<SubstitutionEntry>> substitutionsMap = new HashMap<>();
        for (LineupInput p : allPlayers) {
            substitutionsMap.put(p.playerId(), new ArrayList<>());
        }

        // Track who is on field
        Set<UUID> onField = new HashSet<>();
        for (LineupInput p : allPlayers) {
            LineupRole originalRole = resolveRole(p.role(), p.isStarter());
            if (originalRole == LineupRole.STARTER) {
                onField.add(p.playerId());
            }
        }

        // Apply events in chronological order
        for (EventInput event : sortedEvents) {
            UUID offId = event.playerId();
            UUID onId = event.relatedPlayerId();
            Integer minute = event.minute() != null ? event.minute() : 0;

            String offName = resolveName(offId, event.playerName(), allPlayers);
            Integer offJersey = resolveJersey(offId, event.playerJerseyNumber(), allPlayers);

            String onName = resolveName(onId, event.relatedPlayerName(), allPlayers);
            Integer onJersey = resolveJersey(onId, event.relatedPlayerJerseyNumber(), allPlayers);

            if (offId != null) {
                onField.remove(offId);
                substitutionsMap.computeIfAbsent(offId, k -> new ArrayList<>())
                        .add(new SubstitutionEntry(minute, "OFF", onId, onName, onJersey));
            }

            if (onId != null) {
                onField.add(onId);
                substitutionsMap.computeIfAbsent(onId, k -> new ArrayList<>())
                        .add(new SubstitutionEntry(minute, "ON", offId, offName, offJersey));
            }
        }

        List<PlayerTimeline> results = new ArrayList<>();
        for (LineupInput p : allPlayers) {
            LineupRole originalRole = resolveRole(p.role(), p.isStarter());
            List<SubstitutionEntry> subs = substitutionsMap.getOrDefault(p.playerId(), Collections.emptyList());

            boolean played = (originalRole == LineupRole.STARTER)
                    || subs.stream().anyMatch(s -> "ON".equals(s.direction()));
            boolean onFieldAtEnd = onField.contains(p.playerId());

            results.add(new PlayerTimeline(
                    p.playerId(),
                    p.playerName(),
                    p.jerseyNumber(),
                    originalRole,
                    originalRole == LineupRole.STARTER,
                    p.isCaptain(),
                    p.orderIndex(),
                    p.positionDisplay(),
                    played,
                    onFieldAtEnd,
                    subs
            ));
        }

        return results;
    }

    private static LineupRole resolveRole(LineupRole role, boolean isStarter) {
        if (role != null) {
            return role;
        }
        return isStarter ? LineupRole.STARTER : LineupRole.BENCH;
    }

    private static String resolveName(UUID id, String eventName, List<LineupInput> allPlayers) {
        if (eventName != null && !eventName.isBlank()) {
            return eventName;
        }
        if (id != null) {
            for (LineupInput p : allPlayers) {
                if (id.equals(p.playerId()) && p.playerName() != null && !p.playerName().isBlank()) {
                    return p.playerName();
                }
            }
        }
        return "Unknown Player";
    }

    private static Integer resolveJersey(UUID id, Integer eventJersey, List<LineupInput> allPlayers) {
        if (eventJersey != null) {
            return eventJersey;
        }
        if (id != null) {
            for (LineupInput p : allPlayers) {
                if (id.equals(p.playerId()) && p.jerseyNumber() != null) {
                    return p.jerseyNumber();
                }
            }
        }
        return null;
    }
}
