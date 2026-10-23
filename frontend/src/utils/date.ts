export const calculateAge = (dob: string | Date | undefined | null): number | null => {
    if (!dob) return null;

    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    return age;
};

export const formatDate = (date: string | Date | undefined | null): string => {
    if (!date) return '—';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';

    return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
};

// Date-of-birth bounds for <input type="date">. Without max, browsers accept 5–6 digit years
// typed by hand ("21996-07-27"), which the backend cannot read (prod ref 48f1831f).
export const DOB_MIN = '1900-01-01';

/** Today as YYYY-MM-DD in the local time zone (the format date inputs use). */
export const todayIsoDate = (): string => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** True for a YYYY-MM-DD date with a 4-digit year between DOB_MIN and today. */
export const isValidDob = (dob: string): boolean =>
    /^\d{4}-\d{2}-\d{2}$/.test(dob) && dob >= DOB_MIN && dob <= todayIsoDate();
