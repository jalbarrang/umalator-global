// import { useEffect } from 'react';
import { createJSONStorage, persist } from 'zustand/middleware';
import { create } from 'zustand';

type Theme = 'light' | 'dark';

export type ThemeState = {
  theme: Theme;
};

export type ThemeStore = ThemeState & {
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

export const applyTheme = (resolvedTheme: 'light' | 'dark') => {
  if (typeof window === 'undefined') return;

  const root = window.document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(resolvedTheme);
};

export const defaultThemeState: ThemeState = {
  theme: 'dark',
};

export const createThemeStore = (initState: ThemeState = defaultThemeState) => {
  return create<ThemeStore>()(
    persist(
      (set, get) => {
        return {
          ...initState,
          setTheme: (theme: Theme) => {
            applyTheme(theme);
            set({ theme });
          },
          toggleTheme: () => {
            const { theme, setTheme } = get();
            const newTheme = theme === 'dark' ? 'light' : 'dark';
            setTheme(newTheme);
          },
        };
      },
      {
        name: 'umalator-theme',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({ theme: state.theme }),
      },
    ),
  );
};
