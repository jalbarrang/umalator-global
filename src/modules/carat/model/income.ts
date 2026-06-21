import type { TimelinePayload } from '@/modules/carat/data/timeline-types';
import type { CaratSettings } from '@/store/carat.store';
import {
  CARAT_PER_PULL,
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
  tickets: number;
};

const DAYS_PER_MONTH = 365.25 / 12;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const RESET_HOUR_UTC = 22;

function safeRecordValue<T>(record: Record<string, T>, key: string, fallback: T) {
  return record[key] ?? fallback;
}

export function normalizeToResetDate(date: Date) {
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

  return {
    carats: settings.monthlyCarats + clubRank + dailyPack + trainingPass + teamTrialsWeekly * WEEKS_PER_MONTH,
    tickets: settings.monthlyTickets
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
    return { carats: 0, tickets: 0 };
  }

  const monthly = monthlyRecurringCarats(settings);
  const monthCount = monthsBetween(from, to);
  let carats = monthly.carats * monthCount;
  let tickets = monthly.tickets * monthCount;

  const fromTime = from.getTime();
  const toTime = to.getTime();
  const cmReward = safeRecordValue(CHAMPIONS_MEETING_REWARDS, settings.cmPlacement, { carats: 0, tickets: 0 });

  for (const event of timeline.events) {
    if (event.type !== 'champions_meeting') {
      continue;
    }

    const time = eventDateValue(event.global_release_date ?? event.jp_release_date);
    if (time !== null && time >= fromTime && time <= toTime) {
      carats += cmReward.carats;
      tickets += cmReward.tickets;
    }
  }

  // TODO verify vs sheet: the current timeline payload has CM events but no distinct LoH event type,
  // so LoH is accrued linearly as a monthly expected reward.
  const lohReward = safeRecordValue(LEAGUE_OF_HEROES_REWARDS, settings.lohRank, { carats: 0, tickets: 0 });
  carats += lohReward.carats * monthCount;
  tickets += lohReward.tickets * monthCount;

  return { carats, tickets };
}

export function caratsAvailableAt(settings: CaratSettings, timeline: TimelinePayload, date: Date) {
  const income = projectIncome(settings, timeline, new Date(), date);

  return settings.startingFreeCarats + income.carats + income.tickets * CARAT_PER_PULL;
}
