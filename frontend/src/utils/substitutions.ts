import { LineupRole, MatchLineupEntry } from '@/types';

// Ordering: minute (null = 0), then createdAt.

export interface SubstitutionEntry {
    minute: number;
    direction: 'OFF' | 'ON';
    otherPlayerId?: string;
    otherPlayerName?: string;
    otherJerseyNumber?: number;
}

export interface PlayerTimeline {
    playerId: string;
    playerName: string;
    jerseyNumber?: number;
    role: LineupRole;
    isStarter: boolean;
    isCaptain: boolean;
    orderIndex?: number;
    positionDisplay?: string;
    played: boolean;
    onFieldAtEnd: boolean;
    substitutions: SubstitutionEntry[];
}

export interface TimelineSubstitutionEvent {
    playerId?: string | null;
    playerName?: string | null;
    playerJerseyNumber?: number | null;
    relatedPlayerId?: string | null;
    relatedPlayerName?: string | null;
    relatedPlayerJerseyNumber?: number | null;
    minute?: number | null;
    createdAt?: string | Date | null;
}

/**
 * Computes the substitution timeline and who is on the field for a team.
 * Mirrors com.athleticaos.backend.services.lineup.SubstitutionTimeline.
 */
export function computeSubstitutionTimeline(
    lineupEntries: MatchLineupEntry[],
    events: TimelineSubstitutionEvent[]
): PlayerTimeline[] {
    const lineupMap = new Map<string, MatchLineupEntry>();
    for (const l of lineupEntries || []) {
        if (l.playerId) {
            lineupMap.set(l.playerId, l);
        }
    }

    // Ordering: minute (null = 0), then createdAt.
    const sortedEvents = [...(events || [])].sort((a, b) => {
        const minA = a.minute != null ? a.minute : 0;
        const minB = b.minute != null ? b.minute : 0;
        if (minA !== minB) return minA - minB;
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeA - timeB;
    });

    // Discover any players involved in events who are not in the lineup
    const unlistedMap = new Map<string, MatchLineupEntry>();
    for (const event of sortedEvents) {
        if (event.playerId && !lineupMap.has(event.playerId) && !unlistedMap.has(event.playerId)) {
            unlistedMap.set(event.playerId, {
                playerId: event.playerId,
                playerName: event.playerName || 'Unknown Player',
                jerseyNumber: event.playerJerseyNumber || undefined,
                role: LineupRole.STARTER,
                isStarter: true,
                isCaptain: false,
            });
        }
        if (event.relatedPlayerId && !lineupMap.has(event.relatedPlayerId) && !unlistedMap.has(event.relatedPlayerId)) {
            unlistedMap.set(event.relatedPlayerId, {
                playerId: event.relatedPlayerId,
                playerName: event.relatedPlayerName || 'Unknown Player',
                jerseyNumber: event.relatedPlayerJerseyNumber || undefined,
                role: LineupRole.BENCH,
                isStarter: false,
                isCaptain: false,
            });
        }
    }

    const allPlayers: MatchLineupEntry[] = [...lineupMap.values(), ...unlistedMap.values()];

    const substitutionsMap = new Map<string, SubstitutionEntry[]>();
    for (const p of allPlayers) {
        substitutionsMap.set(p.playerId, []);
    }

    const onField = new Set<string>();
    for (const p of allPlayers) {
        const isStarter = p.role === LineupRole.STARTER || (p.role == null && !!p.isStarter);
        if (isStarter) {
            onField.add(p.playerId);
        }
    }

    for (const event of sortedEvents) {
        const offId = event.playerId || undefined;
        const onId = event.relatedPlayerId || undefined;
        const minute = event.minute != null ? event.minute : 0;

        const offPlayer = offId ? allPlayers.find(p => p.playerId === offId) : undefined;
        const onPlayer = onId ? allPlayers.find(p => p.playerId === onId) : undefined;

        const offName = event.playerName || offPlayer?.playerName || 'Unknown Player';
        const offJersey = event.playerJerseyNumber ?? offPlayer?.jerseyNumber;

        const onName = event.relatedPlayerName || onPlayer?.playerName || 'Unknown Player';
        const onJersey = event.relatedPlayerJerseyNumber ?? onPlayer?.jerseyNumber;

        if (offId) {
            onField.delete(offId);
            const list = substitutionsMap.get(offId) || [];
            list.push({
                minute,
                direction: 'OFF',
                otherPlayerId: onId,
                otherPlayerName: onName,
                otherJerseyNumber: onJersey,
            });
            substitutionsMap.set(offId, list);
        }

        if (onId) {
            onField.add(onId);
            const list = substitutionsMap.get(onId) || [];
            list.push({
                minute,
                direction: 'ON',
                otherPlayerId: offId,
                otherPlayerName: offName,
                otherJerseyNumber: offJersey,
            });
            substitutionsMap.set(onId, list);
        }
    }

    return allPlayers.map(p => {
        const isStarter = p.role === LineupRole.STARTER || (p.role == null && !!p.isStarter);
        const role = p.role || (isStarter ? LineupRole.STARTER : LineupRole.BENCH);
        const subs = substitutionsMap.get(p.playerId) || [];
        const played = isStarter || subs.some(s => s.direction === 'ON');
        const onFieldAtEnd = onField.has(p.playerId);

        return {
            playerId: p.playerId,
            playerName: p.playerName,
            jerseyNumber: p.jerseyNumber,
            role,
            isStarter,
            isCaptain: !!p.isCaptain,
            orderIndex: p.orderIndex,
            positionDisplay: p.positionDisplay,
            played,
            onFieldAtEnd,
            substitutions: subs,
        };
    });
}
