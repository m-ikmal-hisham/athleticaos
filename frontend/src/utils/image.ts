/**
 * Helper to get the full URL for an image.
 * If the path starts with 'http', it returns it as is.
 * If the path starts with '/', it prepends the backend base URL.
 */
export const getImageUrl = (path?: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;

    // Get API URL from env or default to relative path
    const apiUrl = import.meta.env.VITE_API_URL || '';

    // Strip '/api/v1' or '/api' from the end to get the base URL
    // This assumes uploads are served from the root context, e.g. {baseUrl}/uploads/
    const baseUrl = apiUrl.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '');

    // Ensure path starts with /
    const cleanPath = path.startsWith('/') ? path : `/${path}`;

    return `${baseUrl}${cleanPath}`;
};

