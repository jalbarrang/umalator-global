import { useEffect, useState } from 'react';
import { createSkillPickerStore, SkillPickerStoreContext } from './store';

type SkillPickerProviderProps = {
  children: React.ReactNode;
};

export const SkillPickerProvider = ({ children }: SkillPickerProviderProps) => {
  const [store] = useState(() => createSkillPickerStore());

  useEffect(() => {
    return () => {
      const { actions } = store.getState();
      actions.clearFilters();
    };
  }, [store]);

  return (
    <SkillPickerStoreContext.Provider value={store}>{children}</SkillPickerStoreContext.Provider>
  );
};
