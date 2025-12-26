import { create } from "zustand";

type Theme = 'light' | 'dark' | 'system';

interface UIState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  getEffectiveTheme: () => 'light' | 'dark';
  activeTournamentId: string | null;
  setActiveTournamentId: (id: string | null) => void;
}

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const useUIStore = create<UIState>((set, get) => ({
  theme: (localStorage.getItem("athos-theme") as Theme) || "system",

  setTheme: (theme: Theme) => {
    localStorage.setItem("athos-theme", theme);
    set({ theme });

    // Apply effective theme
    const effectiveTheme = theme === 'system' ? getSystemTheme() : theme;
    document.documentElement.setAttribute("data-theme", effectiveTheme);
  },

  getEffectiveTheme: () => {
    const { theme } = get();
    return theme === 'system' ? getSystemTheme() : theme;
  },

  activeTournamentId: null,
  setActiveTournamentId: (id: string | null) => set({ activeTournamentId: id }),
}));

// Listen for system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const store = useUIStore.getState();
    if (store.theme === 'system') {
      const effectiveTheme = getSystemTheme();
      document.documentElement.setAttribute("data-theme", effectiveTheme);
    }
  });
}
