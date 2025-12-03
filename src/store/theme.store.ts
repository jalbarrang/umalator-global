import { useEffect } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
}

const applyTheme = (resolvedTheme: 'light' | 'dark') => {
  if (typeof window === 'undefined') return;

  const root = window.document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(resolvedTheme);
};

const useThemeStore = create<ThemeState>()(
  persist(
    (_) => ({
      theme: 'light',
    }),
    {
      name: 'umalator-theme',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export const useTheme = () => {
  const { theme } = useThemeStore();

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return { theme };
};

export const setTheme = (theme: Theme) => {
  applyTheme(theme);

  useThemeStore.setState({
    theme,
  });
};

export const toggleTheme = () => {
  const { theme } = useThemeStore.getState();
  const newTheme = theme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
};
