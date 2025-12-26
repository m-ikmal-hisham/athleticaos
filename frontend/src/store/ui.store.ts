
import { create } from "zustand";
import { persist } from "zustand/middleware";

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

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      theme: "system",

      setTheme: (theme: Theme) => {
        set({ theme });
        // Apply effective theme
        const effectiveTheme = theme === 'system' ? getSystemTheme() : theme;
        document.documentElement.setAttribute("data-theme", effectiveTheme);
        if (effectiveTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },

      getEffectiveTheme: () => {
        const { theme } = get();
        return theme === 'system' ? getSystemTheme() : theme;
      },

      activeTournamentId: null,
      setActiveTournamentId: (id: string | null) => set({ activeTournamentId: id }),
    }),
    {
      name: "athos-ui-storage", // content is persisted to localStorage
      // partialize: (state) => ({ theme: state.theme, activeTournamentId: state.activeTournamentId }), // Optional: persist only specific fields
      onRehydrateStorage: () => (state) => {
        // Re-apply theme on hydration
        if (state) {
          const effectiveTheme = state.theme === 'system' ? getSystemTheme() : state.theme;
          document.documentElement.setAttribute("data-theme", effectiveTheme);
          if (effectiveTheme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      }
    }
  )
);

// Listen for system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const store = useUIStore.getState();
    if (store.theme === 'system') {
      const effectiveTheme = getSystemTheme();
      document.documentElement.setAttribute("data-theme", effectiveTheme);
      if (effectiveTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  });
}
