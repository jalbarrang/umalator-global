import type { ReactNode } from 'react';
import i18n from '@/i18n';
import { createTypedParser } from '@/lib/sunday-tools/skills/parser/ConditionParser';
import rawConditionTranslations from './condition-translations.json';

type OperatorKey = 'eq' | 'neq' | 'lt' | 'lte' | 'gt' | 'gte';

type ConditionTranslation = {
  label: string;
} & Partial<Record<OperatorKey, string>> &
  Record<string, string | undefined>;

type ConditionTranslationMap = Record<string, ConditionTranslation>;

interface HumanReadableCondition {
  name: string;
  label: string;
  translation?: ConditionTranslation;
  formatArg: (arg: number) => string;
}

const conditionTranslations = rawConditionTranslations as ConditionTranslationMap;

const percentConditions = new Set([
  'distance_diff_rate',
  'distance_rate',
  'distance_rate_after_random',
  'hp_per',
  'order_rate',
  'random_lot',
  'running_style_count_same_rate',
]);

const secondConditions = new Set([
  'accumulatetime',
  'behind_near_lane_time',
  'behind_near_lane_time_set1',
  'blocked_all_continuetime',
  'blocked_front_continuetime',
  'blocked_side_continuetime',
  'infront_near_lane_time',
  'overtake_target_no_order_up_time',
  'overtake_target_time',
]);

const meterConditions = new Set([
  'course_distance',
  'distance_diff_top',
  'remain_distance',
  'remain_distance_viewer_id',
]);

const enumConditions = new Set([
  'distance_type',
  'grade',
  'ground_condition',
  'ground_type',
  'motivation',
  'rotation',
  'running_style',
  'season',
  'slope',
  'time',
  'weather',
]);

function formatDecimal(n: number) {
  return Number.isInteger(n) ? n.toString() : n.toFixed(1).replace(/\.0$/, '');
}

function ordinal(n: number) {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function humanizeConditionName(name: string) {
  return name
    .split('_')
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ');
}

function getEnumLabel(conditionName: string, arg: number): string | null {
  if (!enumConditions.has(conditionName)) {
    return null;
  }

  const localized = i18n.t(`skilldetails.${conditionName}.${arg}`);
  return localized.startsWith('skilldetails.') ? null : localized;
}

function formatArg(conditionName: string, arg: number): string {
  if (conditionName === 'distance_diff_top_float') {
    return `${formatDecimal(arg / 10)}m`;
  }

  if (conditionName === 'track_id') {
    const trackName = i18n.t(`tracknames.${arg}`);
    return trackName.startsWith('tracknames.') ? arg.toString() : `${trackName} (${arg})`;
  }

  if (conditionName === 'bashin_diff_behind' || conditionName === 'bashin_diff_infront') {
    return `${arg} bashin (~${formatDecimal(arg * 2.5)}m)`;
  }

  const enumLabel = getEnumLabel(conditionName, arg);
  if (enumLabel) {
    return enumLabel;
  }

  if (percentConditions.has(conditionName)) {
    return `${arg}%`;
  }

  if (secondConditions.has(conditionName)) {
    return `${arg}s`;
  }

  if (meterConditions.has(conditionName)) {
    return `${arg}m`;
  }

  return arg.toString();
}

function interpolate(template: string, conditionName: string, arg: number) {
  const trackName = i18n.t(`tracknames.${arg}`);
  const track = trackName.startsWith('tracknames.') ? `${arg}` : `${trackName} (${arg})`;
  const variables: Record<string, string> = {
    v: arg.toString(),
    ord: ordinal(arg),
    percent: `${arg}%`,
    cm: Math.round((arg / 100) * 9).toString(),
    loh: Math.round((arg / 100) * 12).toString(),
    seconds: `${arg}s`,
    meters: `${arg}m`,
    floatMeters: `${formatDecimal(arg / 10)}m`,
    bashin: `${arg} bashin (~${formatDecimal(arg * 2.5)}m)`,
    track,
    value: formatArg(conditionName, arg),
  };

  return template.replace(/\{\{(\w+)\}\}/g, (_match, variableName: string) => {
    return variables[variableName] ?? arg.toString();
  });
}

function resolveReadableText(
  translation: ConditionTranslation | undefined,
  opKey: OperatorKey,
  conditionName: string,
  arg: number,
) {
  if (!translation) {
    return null;
  }

  const specificTemplate = translation[`${opKey}_${arg}`];
  if (specificTemplate) {
    return interpolate(specificTemplate, conditionName, arg);
  }

  const genericTemplate = translation[opKey];
  if (genericTemplate) {
    return interpolate(genericTemplate, conditionName, arg);
  }

  return null;
}

const humanReadableConditions = new Proxy(
  {},
  {
    get(_target: object, prop: string | symbol): HumanReadableCondition | undefined {
      if (typeof prop !== 'string') {
        return undefined;
      }

      const translation = conditionTranslations[prop];

      return {
        name: prop,
        label: translation?.label ?? humanizeConditionName(prop),
        translation,
        formatArg(arg: number) {
          return formatArg(prop, arg);
        },
      };
    },
  },
);

interface OpFormatter {
  format: () => ReactNode;
}

class HumanAndFormatter {
  constructor(
    readonly left: OpFormatter,
    readonly right: OpFormatter,
  ) {}

  format() {
    return (
      <>
        {this.left.format()}
        {this.right.format()}
      </>
    );
  }
}

class HumanOrFormatter {
  constructor(
    readonly left: OpFormatter,
    readonly right: OpFormatter,
  ) {}

  format() {
    return (
      <>
        <div className="border-l-2 border-foreground/10 pl-3 ml-0.5">{this.left.format()}</div>
        <div className="flex items-center gap-2 py-1">
          <div className="flex-1 border-t border-dashed border-foreground/15" />
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground select-none">
            or
          </span>
          <div className="flex-1 border-t border-dashed border-foreground/15" />
        </div>
        <div className="border-l-2 border-foreground/10 pl-3 ml-0.5">{this.right.format()}</div>
      </>
    );
  }
}

function HumanCmpFormatter(opKey: OperatorKey, opSymbol: string) {
  return class {
    constructor(
      readonly cond: HumanReadableCondition,
      readonly arg: number,
    ) {}

    format() {
      const readableText = resolveReadableText(
        this.cond.translation,
        opKey,
        this.cond.name,
        this.arg,
      );

      const text =
        readableText ?? `${this.cond.label} ${opSymbol} ${this.cond.formatArg(this.arg)}`;

      return (
        <div className="flex items-start gap-1.5 py-px">
          <span className="shrink-0 mt-[7px] w-1 h-1 rounded-full bg-foreground/40" />
          <span>{text}</span>
        </div>
      );
    }
  };
}

export const HumanReadableParser = createTypedParser(
  humanReadableConditions as Record<string, HumanReadableCondition>,
  {
    and: HumanAndFormatter,
    or: HumanOrFormatter,
    eq: HumanCmpFormatter('eq', '=='),
    neq: HumanCmpFormatter('neq', '!='),
    lt: HumanCmpFormatter('lt', '<'),
    lte: HumanCmpFormatter('lte', '<='),
    gt: HumanCmpFormatter('gt', '>'),
    gte: HumanCmpFormatter('gte', '>='),
  },
);
