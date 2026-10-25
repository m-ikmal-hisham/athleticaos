import { useUIStore } from '@/store/ui.store';
import { useEffectiveTheme } from '@/hooks/useEffectiveTheme';

/** Light/dark switch for public visitors: flips the theme they currently see and remembers it. */
export function usePublicThemeToggle() {
    const setTheme = useUIStore((s) => s.setTheme);
    const effectiveTheme = useEffectiveTheme();
    const toggleTheme = () => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark');
    return { effectiveTheme, toggleTheme };
}
