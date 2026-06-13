import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type AnalyticsConsent = 'granted' | 'denied';

type AnalyticsConsentStore = {
  consent: AnalyticsConsent | null;
};

const STORE_NAME = 'torena-analytics-consent';

export const useAnalyticsConsentStore = create<AnalyticsConsentStore>()(
  persist((): AnalyticsConsentStore => ({ consent: null }), {
    name: STORE_NAME,
    storage: createJSONStorage(() => localStorage)
  })
);

export const setAnalyticsConsent = (consent: AnalyticsConsent) => {
  useAnalyticsConsentStore.setState({ consent });
};
