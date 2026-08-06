export interface BracketRound<T = any> {
    id: string;
    name: string; // e.g. "Quarter Finals", "Semi Finals", "Final"
    stageType?: string;
    displayOrder: number;
    roundWeight: number;
    matches: T[];
}

export interface BracketGroup<T = any> {
    id: string; // 'CUP' | 'PLATE' | 'BOWL' | 'SHIELD' | 'SPOON' | 'FORK' | 'CUSTOM'
    title: string; // e.g. "Cup Bracket", "Plate Bracket", "Bowl Bracket"
    description?: string;
    rounds: BracketRound<T>[];
}

/**
 * Returns a weight for sorting knockout rounds sequentially:
 * Round of 64 (64) -> Round of 32 (32) -> Round of 16 (16) -> Quarter Finals (8) -> Semi Finals (4) -> Final (2) -> Placement playoff (1)
 *
 * Placement playoffs ("3rd Place Playoff", "7th Place Playoff", ...) are contested by the
 * losers of a semi-final, so they render at the end of the bracket that feeds them rather
 * than at the front. Stages such as "Plate Final (5th Place)" are finals in their own right
 * and are caught by the `final` check before the placement rule is reached.
 */
export function getRoundWeight(roundName: string, stageType?: string): number {
    const name = (roundName || '').toLowerCase();
    const type = (stageType || '').toLowerCase();

    const isSemi = name.includes('semi') || type.includes('semi');
    const isQuarter = name.includes('quarter') || type.includes('quarter');

    if (!isSemi && !isQuarter) {
        if (name.includes('final')) return 2;
        if (name.includes('playoff') || name.includes('place') || name.includes('3/4')
            || name.includes('bronze') || type === 'third_place') {
            return 1;
        }
    }
    if (isSemi || type === 'semi_final') return 4;
    if (isQuarter || type === 'quarter_final') return 8;
    if (name.includes('16') || type === 'round_of_16') return 16;
    if (name.includes('32')) return 32;
    if (name.includes('64')) return 64;
    return 100; // Fallback
}

const BRACKET_TYPE_IDS = ['PLATE', 'BOWL', 'SHIELD', 'SPOON', 'FORK', 'CLASSIFICATION'];

/** Display order of bracket groups, strongest first. */
const BRACKET_ORDER = ['CUP', 'PLATE', 'BOWL', 'SHIELD', 'SPOON', 'FORK', 'CLASSIFICATION'];

function compareBracketTypeIds(a: string, b: string): number {
    const idxA = BRACKET_ORDER.indexOf(a);
    const idxB = BRACKET_ORDER.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
}

/**
 * Identifies which bracket category (CUP, PLATE, BOWL, SHIELD, etc.) a stage/match belongs to.
 *
 * An explicit stage type always wins over the name heuristic. This matters for placement
 * stages such as "Fork Final (11th Place)", which is typed BOWL because it is contested by
 * the losers of the Bowl semis — matching on its name alone would strand it in its own group.
 * SPOON/FORK/CLASSIFICATION are retained here so brackets generated before that change keep
 * rendering as they always did.
 */
export function getBracketTypeId(stageName: string = '', stageType: string = ''): string {
    const nameUpper = stageName.toUpperCase();
    const typeUpper = stageType.toUpperCase();

    if (BRACKET_TYPE_IDS.includes(typeUpper)) return typeUpper;

    // Fall back to the stage name for manually created or legacy stages with no useful type.
    const byName = BRACKET_TYPE_IDS.find(id => nameUpper.includes(id));
    if (byName) return byName;

    return 'CUP'; // Default main knockout bracket
}

/**
 * Returns user-friendly bracket title
 */
export function getBracketTitle(typeId: string): string {
    switch (typeId) {
        case 'CUP': return 'Cup Bracket';
        case 'PLATE': return 'Plate Bracket';
        case 'BOWL': return 'Bowl Bracket';
        case 'SHIELD': return 'Shield Bracket';
        case 'SPOON': return 'Spoon Bracket';
        case 'FORK': return 'Fork Bracket';
        case 'CLASSIFICATION': return 'Classification Bracket';
        default: return `${typeId.charAt(0) + typeId.slice(1).toLowerCase()} Bracket`;
    }
}

/**
 * Reads a match's stage type from whichever shape the caller uses.
 *
 * The organiser API nests the stage as an object; the public API flattens it to a name string
 * with `stageType` alongside. Without checking both, the public bracket had no type to group on
 * and fell back to matching the stage *name*, which misfiles any renamed bracket — a Shield
 * bracket called "Development" landed under Cup on the public site but Shield in the dashboard.
 */
function resolveStageType(match: { stage?: any; stageType?: string }): string {
    if (match.stage && typeof match.stage === 'object' && match.stage.stageType) {
        return match.stage.stageType;
    }
    return match.stageType || '';
}

/**
 * Groups matches into distinct Bracket Groups (Cup, Plate, Bowl, Shield) and sorts rounds sequentially within each group.
 */
export function groupMatchesIntoBrackets<T extends {
    id: string;
    stage?: any;
    stageType?: string;
    stageDisplayOrder?: number;
    code?: string;
    matchCode?: string;
    matchDate?: string;
    kickOffTime?: string;
}>(matches: T[]): BracketGroup<T>[] {
    // 1. Filter out pool/group matches
    const knockoutMatches = matches.filter(m => {
        const stageName = (typeof m.stage === 'string' ? m.stage : m.stage?.name || '').toLowerCase();
        // `typeof null === 'object'`, so a null stage — or one with no stageType — would
        // otherwise reach .toLowerCase() as undefined and throw, breaking the whole render.
        const stageType = resolveStageType(m).toLowerCase();
        if (stageType === 'pool') return false;
        return !stageName.includes('pool') && !stageName.includes('group');
    });

    // 2. Map matches into bracketType -> stageName -> match[]
    const bracketMap = new Map<string, Map<string, { displayOrder: number; stageType?: string; matches: T[] }>>();

    knockoutMatches.forEach(match => {
        const stageObj = typeof match.stage === 'object' ? match.stage : null;
        const stageName = typeof match.stage === 'string' ? match.stage : stageObj?.name || 'Knockout';
        const stageType = resolveStageType(match);
        const displayOrder = match.stageDisplayOrder ?? stageObj?.displayOrder ?? 0;

        const typeId = getBracketTypeId(stageName, stageType);

        if (!bracketMap.has(typeId)) {
            bracketMap.set(typeId, new Map());
        }

        const stagesInBracket = bracketMap.get(typeId)!;
        if (!stagesInBracket.has(stageName)) {
            stagesInBracket.set(stageName, { displayOrder, stageType, matches: [] });
        }

        stagesInBracket.get(stageName)!.matches.push(match);
    });

    // 3. Build ordered BracketGroups
    const result: BracketGroup<T>[] = [];

    // Sort bracket types by standard hierarchy (CUP -> PLATE -> BOWL -> SHIELD)
    const sortedTypeIds = Array.from(bracketMap.keys()).sort(compareBracketTypeIds);

    sortedTypeIds.forEach(typeId => {
        const stageMap = bracketMap.get(typeId)!;
        const rounds: BracketRound<T>[] = [];

        stageMap.forEach((data, stageName) => {
            // Sort matches inside round by code/kickOffTime
            const sortedMatches = [...data.matches].sort((a, b) => {
                const codeA = a.code || a.matchCode || '';
                const codeB = b.code || b.matchCode || '';
                return codeA.localeCompare(codeB);
            });

            const roundWeight = getRoundWeight(stageName, data.stageType);

            rounds.push({
                id: stageName,
                name: stageName,
                stageType: data.stageType,
                displayOrder: data.displayOrder,
                roundWeight,
                matches: sortedMatches,
            });
        });

        // Sort rounds within bracket from earliest round to final (highest roundWeight to lowest roundWeight)
        // e.g. Quarter Finals (8) -> Semi Finals (4) -> Final (2)
        rounds.sort((a, b) => {
            if (a.roundWeight !== b.roundWeight) {
                return b.roundWeight - a.roundWeight;
            }
            return a.displayOrder - b.displayOrder;
        });

        result.push({
            id: typeId,
            title: getBracketTitle(typeId),
            rounds,
        });
    });

    return result;
}

/** Minimal shape of a stage needed to place it in a bracket. */
export interface BracketStageLike {
    id: string;
    name: string;
    stageType?: string;
    displayOrder: number;
}

/**
 * Groups matches into brackets and folds in stages that have no matches yet, so an
 * organiser sees the shape of a bracket before any fixtures exist.
 *
 * This is the single entry point every bracket view should use. Previously the editor
 * merged empty stages itself while the dashboard's read-only view grouped stages flatly on
 * its own, so the two disagreed about the same tournament.
 */
export function buildBracketGroups<T extends {
    id: string;
    stage?: any;
    stageType?: string;
    stageDisplayOrder?: number;
    code?: string;
    matchCode?: string;
    matchDate?: string;
    kickOffTime?: string;
}>(matches: T[], stages: BracketStageLike[] = []): BracketGroup<T>[] {
    const groupMap = new Map<string, BracketGroup<T>>();
    groupMatchesIntoBrackets(matches).forEach(group => groupMap.set(group.id, group));

    stages.forEach(stage => {
        const typeId = getBracketTypeId(stage.name, stage.stageType);
        if (!groupMap.has(typeId)) {
            groupMap.set(typeId, { id: typeId, title: getBracketTitle(typeId), rounds: [] });
        }
        const group = groupMap.get(typeId)!;
        const alreadyPresent = group.rounds.some(r => r.name === stage.name || r.id === stage.id);
        if (!alreadyPresent) {
            group.rounds.push({
                id: stage.id,
                name: stage.name,
                stageType: stage.stageType,
                displayOrder: stage.displayOrder,
                roundWeight: getRoundWeight(stage.name, stage.stageType),
                matches: [],
            });
        }
    });

    groupMap.forEach(group => {
        group.rounds.sort((a, b) => {
            if (a.roundWeight !== b.roundWeight) return b.roundWeight - a.roundWeight;
            return a.displayOrder - b.displayOrder;
        });
    });

    return Array.from(groupMap.values()).sort((a, b) => compareBracketTypeIds(a.id, b.id));
}

/**
 * Which side won, or null if undecided.
 *
 * Checks the explicit winner first: byes and walkovers complete with no scores at all, so
 * comparing `homeScore` to `awayScore` would treat them as a draw and highlight neither side.
 */
export function getWinningSide(match: {
    homeTeamId?: string;
    awayTeamId?: string;
    winnerTeamId?: string;
    homeScore?: number | null;
    awayScore?: number | null;
}): 'home' | 'away' | null {
    if (match.winnerTeamId) {
        if (match.winnerTeamId === match.homeTeamId) return 'home';
        if (match.winnerTeamId === match.awayTeamId) return 'away';
    }
    if (match.homeScore == null || match.awayScore == null) return null;
    if (match.homeScore > match.awayScore) return 'home';
    if (match.awayScore > match.homeScore) return 'away';
    return null;
}
