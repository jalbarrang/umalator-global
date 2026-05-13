import { getIconUrl } from '@/assets/icons';

export type SkillIconProps = Readonly<{ iconId: string }>;

export function SkillIcon({ iconId }: SkillIconProps) {
  return <img className="size-8" src={getIconUrl(`${iconId}.png`)} alt={iconId} />;
}
