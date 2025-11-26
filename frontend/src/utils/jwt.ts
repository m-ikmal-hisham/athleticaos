export const getToken = () => localStorage.getItem('athos_token');
export const setToken = (token: string) => localStorage.setItem('athos_token', token);
export const removeToken = () => localStorage.removeItem('athos_token');
export const isAuthenticated = () => !!getToken();
