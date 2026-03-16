import { SkillType } from '@/lib/sunday-tools/skills/definitions';

export type EffectSymbolProps = {
  effectType: number;
  color: { fill: string; stroke: string };
  size?: number;
};

export const EffectSymbol = (props: EffectSymbolProps) => {
  const { effectType, color, size = 4 } = props;

  if (effectType === SkillType.Recovery) {
    return (
      <polygon
        points={`0,-${size} ${size},0 0,${size} -${size},0`}
        fill={color.fill}
        stroke={color.stroke}
        strokeWidth="1"
      />
    );
  }

  if (effectType === SkillType.Accel) {
    return (
      <>
        <polyline
          points={`${-size},-${size - 1} 0,0 ${-size},${size - 1}`}
          fill="none"
          stroke={color.stroke}
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          points={`0,-${size - 1} ${size},0 0,${size - 1}`}
          fill="none"
          stroke={color.stroke}
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    );
  }

  if (effectType === SkillType.LaneMovementSpeed || effectType === SkillType.ChangeLane) {
    return (
      <>
        {/* Horizontal Line */}
        <line
          x1={-size + 0.5}
          y1="0"
          x2={size - 0.5}
          y2="0"
          stroke={color.stroke}
          strokeWidth="1"
          strokeLinecap="round"
        />

        {/* Left Arrow */}
        <polyline
          points={`${-size + 3},-${size - 2} ${-size + 1},0 ${-size + 3},${size - 2}`}
          fill="none"
          stroke={color.stroke}
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Right Arrow */}
        <polyline
          points={`${size - 3},-${size - 2} ${size - 1},0 ${size - 3},${size - 2}`}
          fill="none"
          stroke={color.stroke}
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    );
  }

  if (
    effectType === SkillType.TargetSpeed ||
    effectType === SkillType.CurrentSpeed ||
    effectType === SkillType.CurrentSpeedWithNaturalDeceleration
  ) {
    return (
      <polygon
        points={`0,-${size - 1} ${size - 1},${size - 1} -${size - 1},${size - 1}`}
        fill={color.fill}
        stroke={color.stroke}
        strokeWidth="1"
      />
    );
  }

  return <circle cx="0" cy="0" r={size} fill={color.fill} stroke={color.stroke} strokeWidth="1" />;
};
