import { Activity } from 'react';
import { cn } from '@/lib/utils';
import i18n from '@/i18n';
import { isEvolutionSkill, isGoldSkill, isUniqueSkill, isWhiteSkill } from '@/store/runners.store';
import { useSkillItem } from './context';
import { SkillIcon } from './SkillIcon';
import type { SkillItemIdentityProps, SkillItemRailProps, SkillItemRootProps } from './types';

export function SkillItemIdentity(props: Readonly<SkillItemIdentityProps>) {
  const { iconId, skillId, className, labelProps = { className: 'text-sm' } } = props;
  const { className: labelClassName, ...labelRest } = labelProps;

  const context = useSkillItem();
  const resolvedIconId = iconId ?? context.skill.iconId;
  const resolvedSkillId = skillId ?? context.skill.id;

  return (
    <div
      data-slot="skill-item-identity"
      className={cn('flex min-w-0 flex-1 items-center gap-2', className)}
    >
      <Activity mode={resolvedIconId ? 'visible' : 'hidden'}>
        <SkillIcon iconId={resolvedIconId} />
      </Activity>

      <span
        className={cn('leading-tight text-foreground wrap-break-word', labelClassName)}
        {...labelRest}
      >
        {resolvedSkillId ? i18n.t(`skillnames.${resolvedSkillId}`) : null}
      </span>
    </div>
  );
}

export function SkillItemRoot(props: Readonly<SkillItemRootProps>) {
  const {
    skillId,
    interactive = false,
    selected = false,
    isHovered = false,
    isFocused = false,
    size = 'default',
    className,
    onKeyDown,
    ...rest
  } = props;
  const context = useSkillItem();
  const resolvedSkillId = skillId ?? context.skillId;

  return (
    <div
      data-slot="skill-item"
      data-size={size}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      data-skillid={interactive ? resolvedSkillId : undefined}
      data-event={interactive ? 'select-skill' : undefined}
      className={cn(
        'flex h-auto min-h-[32px] rounded-md border-2 bg-background data-[size=summary]:min-h-[48px]',
        {
          'ring-2 ring-primary': selected,
          'bg-yellow-200/70 dark:bg-yellow-800/40': isHovered || isFocused,
        },
        className,
      )}
      onKeyDown={(event) => {
        if (interactive && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          event.currentTarget.click();
        }

        onKeyDown?.(event);
      }}
      {...rest}
    />
  );
}

export function SkillItemRail(props: Readonly<SkillItemRailProps>) {
  const { rarity, className, ...rest } = props;
  const context = useSkillItem();
  const resolvedRarity = rarity ?? context.skill.rarity;

  return (
    <div
      data-slot="skill-item-rail"
      className={cn(
        'flex w-3 rounded-l',
        {
          'skill-white': resolvedRarity != null && isWhiteSkill(resolvedRarity),
          'skill-gold': resolvedRarity != null && isGoldSkill(resolvedRarity),
          'skill-unique': resolvedRarity != null && isUniqueSkill(resolvedRarity),
          'skill-pink': resolvedRarity != null && isEvolutionSkill(resolvedRarity),
        },
        className,
      )}
      {...rest}
    />
  );
}

export function SkillItemBody(props: Readonly<React.ComponentProps<'div'>>) {
  const { className, ...rest } = props;

  return (
    <div data-slot="skill-item-body" className={cn('flex min-w-0 flex-1', className)} {...rest} />
  );
}

export function SkillItemMain(props: Readonly<React.ComponentProps<'div'>>) {
  const { className, ...rest } = props;

  return (
    <div
      data-slot="skill-item-main"
      className={cn('flex min-w-0 flex-1 items-center gap-2', className)}
      {...rest}
    />
  );
}

export function SkillItemAccessory(props: Readonly<React.ComponentProps<'div'>>) {
  const { className, ...rest } = props;

  return (
    <div
      data-slot="skill-item-accessory"
      className={cn('shrink-0', className)}
      onClick={(event) => {
        event.stopPropagation();
      }}
      {...rest}
    />
  );
}

export function SkillItemActions(props: Readonly<React.ComponentProps<'div'>>) {
  const { className, ...rest } = props;

  return (
    <div
      data-slot="skill-item-actions"
      className={cn('flex shrink-0 items-center', className)}
      {...rest}
    />
  );
}
