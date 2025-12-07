/**
 * Helper to get the full URL for an image.
 * If the path starts with 'http', it returns it as is.
 * If the path starts with '/uploads', it prepends the API URL (defaulting to localhost:8080).
 */
export const getImageUrl = (path?: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    if (path.startsWith('/uploads')) {
        // In a real app we'd use import.meta.env.VITE_API_URL
        // For now hardcoding the backend host logic to match axios config
        return `http://localhost:8080${path}`;
    }
    return path;
};
