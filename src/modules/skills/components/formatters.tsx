import { Tooltip } from '@/components/Tooltip';
import { getParser } from '@simulation/lib/ConditionParser';
import i18n from '@/i18n';
import { ReactNode } from 'react';

export interface ConditionFormatter {
  name: string;
  formatArg(arg: number): ReactNode;
}

function fmtSeconds(arg: number) {
  return i18n.t('skilldetails.seconds', { n: arg });
}

function fmtPercent(arg: number) {
  return `${arg}%`;
}

function fmtMeters(arg: number) {
  return i18n.t('skilldetails.meters', { n: arg });
}

function fmtString(strId: string) {
  return function (arg: number) {
    return (
      <Tooltip title={arg.toString()} tall={'en'}>
        {i18n.t(`skilldetails.${strId}.${arg}`)}
      </Tooltip>
    );
  };
}

const conditionFormatters = new Proxy(
  {
    accumulatetime: fmtSeconds,
    bashin_diff_behind(arg: number) {
      return (
        <Tooltip title={i18n.t('skilldetails.meters', { n: arg * 2.5 })}>
          {i18n.t('skilldetails.basinn', { n: arg })}
        </Tooltip>
      );
    },
    bashin_diff_infront(arg: number) {
      return (
        <Tooltip title={i18n.t('skilldetails.meters', { n: arg * 2.5 })}>
          {i18n.t('skilldetails.basinn', { n: arg })}
        </Tooltip>
      );
    },
    behind_near_lane_time: fmtSeconds,
    behind_near_lane_time_set1: fmtSeconds,
    blocked_all_continuetime: fmtSeconds,
    blocked_front_continuetime: fmtSeconds,
    blocked_side_continuetime: fmtSeconds,
    course_distance: fmtMeters,
    distance_diff_rate: fmtPercent,
    distance_diff_top(arg: number) {
      return (
        <Tooltip title={i18n.t('skilldetails.basinn', { n: arg / 2.5 })}>
          {i18n.t('skilldetails.meters', { n: arg })}
        </Tooltip>
      );
    },
    distance_diff_top_float(arg: number) {
      return (
        <Tooltip title={i18n.t('skilldetails.basinn', { n: arg / 25 })}>
          {i18n.t('skilldetails.meters', { n: (arg / 10).toFixed(1) })}
        </Tooltip>
      );
    },
    distance_rate: fmtPercent,
    distance_rate_after_random: fmtPercent,
    distance_type: fmtString('distance_type'),
    grade: fmtString('grade'),
    ground_condition: fmtString('ground_condition'),
    ground_type: fmtString('ground_type'),
    hp_per: fmtPercent,
    infront_near_lane_time: fmtSeconds,
    motivation: fmtString('motivation'),
    order_rate(arg: number) {
      return (
        <Tooltip
          title={i18n.t('skilldetails.order_rate', {
            cm: Math.round((arg / 100) * 9),
            loh: Math.round((arg / 100) * 12),
          })}
        >
          {arg}
        </Tooltip>
      );
    },
    overtake_target_no_order_up_time: fmtSeconds,
    overtake_target_time: fmtSeconds,
    random_lot: fmtPercent,
    remain_distance: fmtMeters,
    rotation: fmtString('rotation'),
    running_style: fmtString('running_style'),
    season: fmtString('season'),
    slope: fmtString('slope'),
    time: fmtString('time'),
    track_id(arg: number) {
      return (
        <Tooltip title={arg.toString()} tall={'en'}>
          {i18n.t(`tracknames.${arg}`)}
        </Tooltip>
      );
    },
    weather: fmtString('weather'),
  },
  {
    get(o: object, prop: string) {
      if (prop in o) {
        return { name: prop, formatArg: o[prop as keyof typeof o] };
      }

      return {
        name: prop,
        formatArg(arg: number) {
          return arg.toString();
        },
      };
    },
  },
);

interface OpFormatter {
  format(): ReactNode;
}

class AndFormatter {
  constructor(
    readonly left: OpFormatter,
    readonly right: OpFormatter,
  ) {}

  format() {
    return (
      <>
        {this.left.format()}
        <span className="operatorAnd">&amp;</span>
        {this.right.format()}
      </>
    );
  }
}

class OrFormatter {
  constructor(
    readonly left: OpFormatter,
    readonly right: OpFormatter,
  ) {}

  format() {
    return (
      <>
        {this.left.format()}
        <span className="operatorOr">
          @<span className="operatorOrText">or</span>
        </span>
        {this.right.format()}
      </>
    );
  }
}

function CmpFormatter(op: string) {
  return class {
    constructor(
      readonly cond: ConditionFormatter,
      readonly arg: number,
    ) {}

    format() {
      return (
        <div className="condition">
          <span className="conditionName">{this.cond.name}</span>
          <span className="conditionOp">{op}</span>
          <span className="conditionArg">{this.cond.formatArg(this.arg)}</span>
        </div>
      );
    }
  };
}

export const FormatParser = getParser<ConditionFormatter, OpFormatter>(
  conditionFormatters as Record<string, ConditionFormatter>,
  {
    and: AndFormatter,
    or: OrFormatter,
    eq: CmpFormatter('=='),
    neq: CmpFormatter('!='),
    lt: CmpFormatter('<'),
    lte: CmpFormatter('<='),
    gt: CmpFormatter('>'),
    gte: CmpFormatter('>='),
  },
);

function forceSign(n: number) {
  return n <= 0 ? n.toString() : '+' + n;
}

// eslint-disable-next-line react-refresh/only-export-components
export const formatStat = forceSign;

function formatSpeed(n: number) {
  return i18n.t('skilldetails.speed', { n: forceSign(n) });
}

// eslint-disable-next-line react-refresh/only-export-components
export const formatEffect = {
  1: formatStat,
  2: formatStat,
  3: formatStat,
  4: formatStat,
  5: formatStat,
  9: (n: number) => `${(n * 100).toFixed(1)}%`,
  21: formatSpeed,
  22: formatSpeed,
  27: formatSpeed,
  31: (n: number) => i18n.t('skilldetails.accel', { n: forceSign(n) }),
  42: (n: number) => i18n.t('skilldetails.durationincrease', { n }),
};
