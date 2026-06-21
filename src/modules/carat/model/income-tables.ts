export const CARAT_PER_PULL = 150;

export const TEAM_TRIALS_WEEKLY_CARATS = {
  'class-6': 375,
  'class-5.5': 262,
  'class-5': 225,
  'class-4': 150,
  'class-3': 75,
  'class-2': 35,
  'class-1': 0
} as const;

export const CLUB_RANK_MONTHLY_CARATS = {
  ss: 4500,
  's+': 3600,
  s: 3150,
  'a+': 2700,
  a: 2250,
  'b+': 1800,
  b: 1350,
  'c+': 900,
  c: 450,
  'd+': 225
} as const;

export const CHAMPIONS_MEETING_REWARDS = {
  none: { carats: 0, tickets: 0 },
  champion: { carats: 3300, tickets: 10 },
  second: { carats: 2400, tickets: 8 },
  third: { carats: 1600, tickets: 6 },
  'group-b-1st': { carats: 1800, tickets: 6 },
  'group-b-2nd': { carats: 1250, tickets: 4 },
  'group-b-3rd': { carats: 1000, tickets: 2 },
  'open-league-1st': { carats: 1500, tickets: 6 },
  'open-league-2nd': { carats: 1250, tickets: 4 },
  'open-league-3rd': { carats: 1000, tickets: 2 }
} as const;

export const LEAGUE_OF_HEROES_REWARDS = {
  none: { carats: 0, tickets: 0 },
  'platinum-4': { carats: 3300, tickets: 4 },
  'platinum-3': { carats: 2800, tickets: 4 },
  'platinum-2': { carats: 2300, tickets: 4 },
  'platinum-1': { carats: 1800, tickets: 4 },
  'gold-4': { carats: 1300, tickets: 4 },
  'gold-3': { carats: 1000, tickets: 2 },
  'gold-2': { carats: 700, tickets: 2 },
  'gold-1': { carats: 550, tickets: 0 },
  'silver-4': { carats: 400, tickets: 0 }
} as const;

export const DAILY_CARAT_PACK_MONTHLY_CARATS = 2000;

export const TRAINING_PASS_MONTHLY_CARATS = {
  none: 0,
  free: 500,
  paid: 2200
} as const;

export const WEEKS_PER_MONTH = 4.345;
