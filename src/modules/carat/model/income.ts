import type { TimelinePayload } from '@/modules/carat/data/timeline-types';
import type { CaratSettings } from '@/store/carat.store';
import {
  CHAMPIONS_MEETING_REWARDS,
  CLUB_RANK_MONTHLY_CARATS,
  DAILY_CARAT_PACK_MONTHLY_CARATS,
  LEAGUE_OF_HEROES_REWARDS,
  TEAM_TRIALS_WEEKLY_CARATS,
  TRAINING_PASS_MONTHLY_CARATS,
  WEEKS_PER_MONTH
} from './income-tables';

export type ProjectedIncome = {
  carats: number;
  umaTickets: number;
  supportTickets: number;
};

const DAYS_PER_MONTH = 365.25 / 12;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const RESET_HOUR_UTC = 22;

// Daily-quest carat baseline (daily + weekly mission carats), per server, per
// day. Source: reference spreadsheet "Carat Calculator" column AN.
const DAILY_QUEST_CARATS_PER_DAY = {
  global: 75 + 150 / 7,
  jp: 50 + 100 / 7
} as const;

// Flat recurring pull tickets per month, per ticket type (spreadsheet AU21).
const MONTHLY_BASELINE_TICKETS_PER_TYPE = 4;

// Training pass pull tickets per month, per ticket type (spreadsheet BH).
function trainingPassMonthlyTickets(trainingPass: CaratSettings['trainingPass']) {
  if (trainingPass === 'paid') return 4;
  if (trainingPass === 'free') return 2;
  return 0;
}

function safeRecordValue<T>(record: Record<string, T>, key: string, fallback: T) {
  return record[key] ?? fallback;
}

function normalizeToResetDate(date: Date) {
  const normalized = new Date(date);
  normalized.setUTCHours(RESET_HOUR_UTC, 0, 0, 0);

  if (date.getTime() < normalized.getTime()) {
    normalized.setUTCDate(normalized.getUTCDate() - 1);
  }

  return normalized;
}

export function monthlyRecurringCarats(settings: CaratSettings): ProjectedIncome {
  const teamTrialsWeekly = safeRecordValue(TEAM_TRIALS_WEEKLY_CARATS, settings.teamTrialsClass, 0);
  const clubRank = safeRecordValue(CLUB_RANK_MONTHLY_CARATS, settings.clubRank, 0);
  const trainingPass = safeRecordValue(TRAINING_PASS_MONTHLY_CARATS, settings.trainingPass, 0);
  const dailyPack = settings.dailyCaratPack ? DAILY_CARAT_PACK_MONTHLY_CARATS : 0;
  const dailyQuestPerDay =
    settings.server === 'jp' ? DAILY_QUEST_CARATS_PER_DAY.jp : DAILY_QUEST_CARATS_PER_DAY.global;
  const dailyQuest = dailyQuestPerDay * DAYS_PER_MONTH;

  // Recurring tickets accrue equally to both pools; the only per-type
  // difference in the source sheet is timeline campaign tickets, which are not
  // modelled here. CM/LoH tickets are added per event in projectIncome.
  const monthlyTicketsPerType =
    MONTHLY_BASELINE_TICKETS_PER_TYPE + trainingPassMonthlyTickets(settings.trainingPass);

  return {
    carats: dailyQuest + clubRank + dailyPack + trainingPass + teamTrialsWeekly * WEEKS_PER_MONTH,
    umaTickets: monthlyTicketsPerType,
    supportTickets: monthlyTicketsPerType
  };
}

function monthsBetween(fromDate: Date, toDate: Date) {
  return Math.max(0, (toDate.getTime() - fromDate.getTime()) / MS_PER_DAY / DAYS_PER_MONTH);
}

function eventDateValue(date: string | null | undefined) {
  if (!date) {
    return null;
  }

  const value = new Date(date).getTime();
  return Number.isFinite(value) ? value : null;
}

export function projectIncome(
  settings: CaratSettings,
  timeline: TimelinePayload,
  fromDate: Date,
  toDate: Date
): ProjectedIncome {
  const from = normalizeToResetDate(fromDate);
  const to = normalizeToResetDate(toDate);

  if (to.getTime() <= from.getTime()) {
    return { carats: 0, umaTickets: 0, supportTickets: 0 };
  }

  const monthly = monthlyRecurringCarats(settings);
  const monthCount = monthsBetween(from, to);
  let carats = monthly.carats * monthCount;
  let umaTickets = monthly.umaTickets * monthCount;
  let supportTickets = monthly.supportTickets * monthCount;

  const fromTime = from.getTime();
  const toTime = to.getTime();
  const cmReward = safeRecordValue(CHAMPIONS_MEETING_REWARDS, settings.cmPlacement, {
    carats: 0,
    tickets: 0
  });

  for (const event of timeline.events) {
    if (event.type !== 'champions_meeting') {
      continue;
    }

    const time = eventDateValue(event.global_release_date ?? event.jp_release_date);
    if (time !== null && time >= fromTime && time <= toTime) {
      carats += cmReward.carats;
      // CM ticket totals are split evenly between the two pools (sheet AS37 =
      // value / 2). Champion 10 -> 5 uma + 5 support.
      umaTickets += cmReward.tickets / 2;
      supportTickets += cmReward.tickets / 2;
    }
  }

  // TODO verify vs sheet: the current timeline payload has CM events but no distinct LoH event type,
  // so LoH is accrued linearly as a monthly expected reward. LoH ticket totals
  // are split evenly between the two pools (sheet AT37 = value / 2).
  const lohReward = safeRecordValue(LEAGUE_OF_HEROES_REWARDS, settings.lohRank, {
    carats: 0,
    tickets: 0
  });
  carats += lohReward.carats * monthCount;
  umaTickets += (lohReward.tickets / 2) * monthCount;
  supportTickets += (lohReward.tickets / 2) * monthCount;

  return { carats, umaTickets, supportTickets };
}

export function caratsAvailableAt(settings: CaratSettings, timeline: TimelinePayload, date: Date) {
  const income = projectIncome(settings, timeline, new Date(), date);

  // Tickets are no longer folded into carats; they accrue into typed pools in
  // computePlan instead.
  return settings.startingFreeCarats + income.carats;
}
