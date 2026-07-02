import { useEffect, useState } from 'react';
import { ThemeStoreContext } from './context';
import { applyTheme, createThemeStore } from './store';

interface ThemeStoreProviderProps {
  children: React.ReactNode;
}

export const ThemeStoreProvider = ({ children }: ThemeStoreProviderProps) => {
  const [store] = useState(() => createThemeStore());

  useEffect(() => {
    applyTheme(store.getState().theme);

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      if (store.getState().theme === 'system') {
        applyTheme('system');
      }
    };

    mql.addEventListener('change', handleSystemChange);
    return () => mql.removeEventListener('change', handleSystemChange);
  }, [store]);

  return <ThemeStoreContext.Provider value={store}>{children}</ThemeStoreContext.Provider>;
};
