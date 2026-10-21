export function sortTournamentsForList<T extends { live?: boolean; startDate?: string | null; name: string }>(list: T[]): T[] {
    return [...list].sort((a, b) => {
        // 1. Live tournaments first
        if (a.live && !b.live) return -1;
        if (!a.live && b.live) return 1;

        // 2. startDate descending (latest first); missing/invalid date goes last
        const timeA = a.startDate ? new Date(a.startDate).getTime() : NaN;
        const timeB = b.startDate ? new Date(b.startDate).getTime() : NaN;
        const validA = !Number.isNaN(timeA);
        const validB = !Number.isNaN(timeB);

        if (validA && !validB) return -1;
        if (!validA && validB) return 1;
        if (validA && validB && timeA !== timeB) {
            return timeB - timeA;
        }

        // 3. Ties by name
        return a.name.localeCompare(b.name);
    });
}

export function sortForHomeFallback<T extends { live?: boolean; completed?: boolean; startDate?: string | null; name: string }>(list: T[]): T[] {
    return [...list]
        .filter(t => !t.completed)
        .sort((a, b) => {
            // 1. Live tournaments first
            if (a.live && !b.live) return -1;
            if (!a.live && b.live) return 1;

            // 2. Upcoming by startDate ascending (soonest first); missing/invalid date goes last
            const timeA = a.startDate ? new Date(a.startDate).getTime() : NaN;
            const timeB = b.startDate ? new Date(b.startDate).getTime() : NaN;
            const validA = !Number.isNaN(timeA);
            const validB = !Number.isNaN(timeB);

            if (validA && !validB) return -1;
            if (!validA && validB) return 1;
            if (validA && validB && timeA !== timeB) {
                return timeA - timeB;
            }

            // 3. Ties by name
            return a.name.localeCompare(b.name);
        })
        .slice(0, 6);
}
