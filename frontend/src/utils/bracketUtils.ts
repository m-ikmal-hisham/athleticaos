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
 * Round of 64 (64) -> Round of 32 (32) -> Round of 16 (16) -> Quarter Finals (8) -> Semi Finals (4) -> 3rd Place (3) -> Final (2)
 */
export function getRoundWeight(roundName: string, stageType?: string): number {
    const name = (roundName || '').toLowerCase();
    const type = (stageType || '').toLowerCase();

    if (name.includes('final') && !name.includes('semi') && !name.includes('quarter') && !type.includes('semi') && !type.includes('quarter')) {
        if (name.includes('third') || name.includes('3rd') || name.includes('bronze') || type === 'third_place') {
            return 3;
        }
        return 2; // Final
    }
    if (name.includes('semi') || type.includes('semi') || type === 'semi_final') return 4;
    if (name.includes('quarter') || type.includes('quarter') || type === 'quarter_final') return 8;
    if (name.includes('16') || type === 'round_of_16') return 16;
    if (name.includes('32')) return 32;
    if (name.includes('64')) return 64;
    return 100; // Fallback
}

/**
 * Identifies which bracket category (CUP, PLATE, BOWL, SHIELD, etc.) a stage/match belongs to.
 */
export function getBracketTypeId(stageName: string = '', stageType: string = ''): string {
    const nameUpper = stageName.toUpperCase();
    const typeUpper = stageType.toUpperCase();

    if (typeUpper === 'PLATE' || nameUpper.includes('PLATE')) return 'PLATE';
    if (typeUpper === 'BOWL' || nameUpper.includes('BOWL')) return 'BOWL';
    if (typeUpper === 'SHIELD' || nameUpper.includes('SHIELD')) return 'SHIELD';
    if (typeUpper === 'SPOON' || nameUpper.includes('SPOON')) return 'SPOON';
    if (typeUpper === 'FORK' || nameUpper.includes('FORK')) return 'FORK';
    if (typeUpper === 'CLASSIFICATION' || nameUpper.includes('CLASSIFICATION')) return 'CLASSIFICATION';
    
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
 * Groups matches into distinct Bracket Groups (Cup, Plate, Bowl, Shield) and sorts rounds sequentially within each group.
 */
export function groupMatchesIntoBrackets<T extends {
    id: string;
    stage?: any;
    stageDisplayOrder?: number;
    code?: string;
    matchCode?: string;
    matchDate?: string;
    kickOffTime?: string;
}>(matches: T[]): BracketGroup<T>[] {
    // 1. Filter out pool/group matches
    const knockoutMatches = matches.filter(m => {
        const stageName = (typeof m.stage === 'string' ? m.stage : m.stage?.name || '').toLowerCase();
        const stageType = (typeof m.stage === 'object' ? m.stage?.stageType : '').toLowerCase();
        if (stageType === 'pool') return false;
        return !stageName.includes('pool') && !stageName.includes('group');
    });

    // 2. Map matches into bracketType -> stageName -> match[]
    const bracketMap = new Map<string, Map<string, { displayOrder: number; stageType?: string; matches: T[] }>>();

    knockoutMatches.forEach(match => {
        const stageObj = typeof match.stage === 'object' ? match.stage : null;
        const stageName = typeof match.stage === 'string' ? match.stage : stageObj?.name || 'Knockout';
        const stageType = stageObj?.stageType || '';
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
    const bracketOrder = ['CUP', 'PLATE', 'BOWL', 'SHIELD', 'SPOON', 'FORK', 'CLASSIFICATION'];
    const result: BracketGroup<T>[] = [];

    // Sort bracket types by standard hierarchy (CUP -> PLATE -> BOWL -> SHIELD)
    const sortedTypeIds = Array.from(bracketMap.keys()).sort((a, b) => {
        const idxA = bracketOrder.indexOf(a);
        const idxB = bracketOrder.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
    });

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
