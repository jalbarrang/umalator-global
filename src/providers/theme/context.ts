import { createContext, useContext } from 'react';
import { createThemeStore, ThemeStore } from './store';
import { useStore } from 'zustand';

export type ThemeStoreApi = ReturnType<typeof createThemeStore>;

export const ThemeStoreContext = createContext<ThemeStoreApi | undefined>(
  undefined,
);

export const useThemeStore = <T>(selector: (store: ThemeStore) => T): T => {
  const themeStoreContext = useContext(ThemeStoreContext);
  if (!themeStoreContext) {
    throw new Error(`useThemeStore must be used within ThemeStoreProvider`);
  }

  return useStore(themeStoreContext, selector);
};
