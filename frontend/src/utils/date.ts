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
