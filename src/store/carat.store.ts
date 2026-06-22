import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { defaultPaidPackPurchases, type PaidPackPurchases } from '@/modules/carat/model/paid';

const CARAT_STORE_NAME = 'umalator-carat';

export type CaratServer = 'global' | 'jp';
export type TrainingPass = 'none' | 'free' | 'paid';

export type CaratSettings = {
  server: CaratServer;
  startingFreeCarats: number;
  startingPaidCarats: number;
  umaTickets: number;
  supportTickets: number;
  monthlyCarats: number;
  monthlyTickets: number;
  teamTrialsClass: string;
  clubRank: string;
  cmPlacement: string;
  lohRank: string;
  dailyCaratPack: boolean;
  trainingPass: TrainingPass;
  trackPaidCarats: boolean;
};

export type PlannedBanner = {
  id: string;
  plannedPulls: number;
  startingDupes: number;
  // Desired total copies per rate-up card, keyed by pickup card id. Absent or 0
  // means "not targeted". Empty object falls back to the single-card odds view.
  copyGoals: Record<string, number>;
  // Copies the player already owns per rate-up card (reruns), keyed by pickup
  // card id. These reduce how many copies the banner needs to supply.
  ownedCopies: Record<string, number>;
  order: number;
};

export type SelectorChoice = {
  uma?: string;
  ssr?: string;
  stepUps?: Record<string, number>;
};

type CaratState = {
  settings: CaratSettings;
  plannedBanners: PlannedBanner[];
  paidPurchases: Record<string, PaidPackPurchases>;
  selectorChoices: Record<string, SelectorChoice>;
};

type CaratStore = CaratState;

export const defaultCaratSettings: CaratSettings = {
  server: 'global',
  startingFreeCarats: 24500,
  startingPaidCarats: 0,
  umaTickets: 0,
  supportTickets: 0,
  monthlyCarats: 15000,
  monthlyTickets: 27,
  teamTrialsClass: 'class-6',
  clubRank: 'b',
  cmPlacement: 'none',
  lohRank: 'none',
  dailyCaratPack: true,
  trainingPass: 'free',
  trackPaidCarats: false
};

export const defaultPlannedBanners: PlannedBanner[] = [
  {
    id: 'example-banner',
    plannedPulls: 200,
    startingDupes: 0,
    copyGoals: {},
    ownedCopies: {},
    order: 0
  }
];

const initialCaratState: CaratState = {
  settings: defaultCaratSettings,
  plannedBanners: defaultPlannedBanners,
  paidPurchases: {},
  selectorChoices: {}
};

export const useCaratStore = create<CaratStore>()(
  persist(() => initialCaratState, {
    name: CARAT_STORE_NAME,
    storage: createJSONStorage(() => localStorage),
    merge: (persisted, current) => {
      const state = persisted as Partial<CaratState>;
      return {
        ...current,
        ...state,
        settings: { ...defaultCaratSettings, ...state.settings },
        plannedBanners: (state.plannedBanners ?? defaultPlannedBanners).map((banner) => ({
          ...banner,
          copyGoals: banner.copyGoals ?? {},
          ownedCopies: banner.ownedCopies ?? {}
        })),
        paidPurchases: state.paidPurchases ?? {},
        selectorChoices: state.selectorChoices ?? {}
      };
    }
  })
);

export function setCaratSetting<K extends keyof CaratSettings>(key: K, value: CaratSettings[K]) {
  useCaratStore.setState((state) => ({
    settings: {
      ...state.settings,
      [key]: value
    }
  }));
}

export function updateCaratSettings(settings: Partial<CaratSettings>) {
  useCaratStore.setState((state) => ({
    settings: {
      ...state.settings,
      ...settings
    }
  }));
}

export function addPlannedBanner(id: string) {
  useCaratStore.setState((state) => {
    if (state.plannedBanners.some((banner) => banner.id === id)) {
      return state;
    }

    const nextOrder = Math.max(-1, ...state.plannedBanners.map((banner) => banner.order)) + 1;

    return {
      plannedBanners: [
        ...state.plannedBanners,
        {
          id,
          plannedPulls: 0,
          startingDupes: 0,
          copyGoals: {},
          ownedCopies: {},
          order: nextOrder
        }
      ]
    };
  });
}

export function removePlannedBanner(id: string) {
  useCaratStore.setState((state) => ({
    plannedBanners: state.plannedBanners.filter((banner) => banner.id !== id)
  }));
}

export function restorePlannedBanner(banner: PlannedBanner) {
  useCaratStore.setState((state) => {
    if (state.plannedBanners.some((planned) => planned.id === banner.id)) {
      return state;
    }

    return {
      plannedBanners: [...state.plannedBanners, banner].sort((a, b) => a.order - b.order)
    };
  });
}

export function setPlannedPulls(id: string, plannedPulls: number) {
  useCaratStore.setState((state) => ({
    plannedBanners: state.plannedBanners.map((banner) =>
      banner.id === id ? { ...banner, plannedPulls } : banner
    )
  }));
}

export function setCopyGoal(bannerId: string, cardId: number, copies: number) {
  useCaratStore.setState((state) => ({
    plannedBanners: state.plannedBanners.map((banner) => {
      if (banner.id !== bannerId) return banner;
      const nextGoals = { ...banner.copyGoals };
      const value = Math.max(0, Math.min(5, Math.floor(copies || 0)));
      if (value <= 0) {
        delete nextGoals[cardId];
      } else {
        nextGoals[cardId] = value;
      }
      return { ...banner, copyGoals: nextGoals };
    })
  }));
}

export function setOwnedCopies(bannerId: string, cardId: number, copies: number) {
  useCaratStore.setState((state) => ({
    plannedBanners: state.plannedBanners.map((banner) => {
      if (banner.id !== bannerId) return banner;
      const nextOwned = { ...banner.ownedCopies };
      const value = Math.max(0, Math.min(4, Math.floor(copies || 0)));
      if (value <= 0) {
        delete nextOwned[cardId];
      } else {
        nextOwned[cardId] = value;
      }
      return { ...banner, ownedCopies: nextOwned };
    })
  }));
}

export function reorderPlannedBanners(idsInOrder: string[]) {
  useCaratStore.setState((state) => {
    const orderById = new Map(idsInOrder.map((id, order) => [id, order]));

    return {
      plannedBanners: state.plannedBanners.map((banner) => ({
        ...banner,
        order: orderById.get(banner.id) ?? banner.order
      }))
    };
  });
}

export function setPaidPackPurchase(
  anniversaryId: string,
  packId: keyof PaidPackPurchases,
  quantity: number
) {
  useCaratStore.setState((state) => ({
    paidPurchases: {
      ...state.paidPurchases,
      [anniversaryId]: {
        ...defaultPaidPackPurchases,
        ...state.paidPurchases[anniversaryId],
        [packId]: Math.max(0, Math.floor(quantity || 0))
      }
    }
  }));
}

export function setSelectorChoice(anniversaryId: string, choice: Partial<SelectorChoice>) {
  useCaratStore.setState((state) => ({
    selectorChoices: {
      ...state.selectorChoices,
      [anniversaryId]: {
        ...state.selectorChoices[anniversaryId],
        ...choice
      }
    }
  }));
}

export function resetCaratPlan() {
  useCaratStore.setState(initialCaratState);
}
