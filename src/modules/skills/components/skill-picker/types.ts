import { groups_filters } from '../../filters';

export type FilterState = Record<string, Record<string, boolean>>;
export type FilterGroup = keyof typeof groups_filters;
