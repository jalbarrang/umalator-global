import { useEffect, useState } from 'react';
import { ThemeStoreContext } from './context';
import { applyTheme, createThemeStore } from './store';

interface ThemeStoreProviderProps {
  children: React.ReactNode;
}

export const ThemeStoreProvider = ({ children }: ThemeStoreProviderProps) => {
  const [store] = useState(() => createThemeStore());

  useEffect(() => {
    const { theme } = store.getState();
    applyTheme(theme);
  }, [store]);

  return (
    <ThemeStoreContext.Provider value={store}>
      {children}
    </ThemeStoreContext.Provider>
  );
};
