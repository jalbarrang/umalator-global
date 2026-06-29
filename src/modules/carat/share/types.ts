import type { CaratSettings, PlannedBanner, SelectorChoice } from '@/store/carat.store';
import type { PaidPackPurchases } from '@/modules/carat/model/paid';

export const CARAT_PLAN_SNAPSHOT_VERSION = 1 as const;

export type CaratPlanSnapshot = {
  version: typeof CARAT_PLAN_SNAPSHOT_VERSION;
  timestamp: number;
  name: string;
  settings: CaratSettings;
  plannedBanners: PlannedBanner[];
  paidPurchases: Record<string, PaidPackPurchases>;
  selectorChoices: Record<string, SelectorChoice>;
};
