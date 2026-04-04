import { cn } from '@/lib/utils';
import { useSkillItem } from './context';
import { SkillItemCostAction, SkillItemDetailsActions } from './actions';
import {
  SkillItemAccessory,
  SkillItemActions,
  SkillItemBody,
  SkillItemIdentity,
  SkillItemMain,
} from './primitives';
import type { SkillItemLayoutProps } from './types';

export function SkillItemDefaultLayout(props: Readonly<SkillItemLayoutProps>) {
  const { dismissable = false, accessory, onDismiss, className } = props;
  const { hasCost } = useSkillItem();

  return (
    <SkillItemBody className={cn('p-1 px-2', className)}>
      <SkillItemMain>
        <SkillItemIdentity />
        {accessory ? <SkillItemAccessory className="w-[112px]">{accessory}</SkillItemAccessory> : null}
        <SkillItemActions>
          {hasCost ? <SkillItemCostAction layout="inline" /> : null}
          <SkillItemDetailsActions dismissable={dismissable} onDismiss={onDismiss} />
        </SkillItemActions>
      </SkillItemMain>
    </SkillItemBody>
  );
}

export function SkillItemCostSummaryLayout(
  props: Readonly<Omit<SkillItemLayoutProps, 'accessory'>>,
) {
  const { dismissable = false, onDismiss, className } = props;

  return (
    <SkillItemBody className={cn('flex-col gap-2', className)}>
      <SkillItemMain className="p-1 px-2">
        <SkillItemIdentity />
        <SkillItemDetailsActions dismissable={dismissable} onDismiss={onDismiss} className="shrink-0" />
      </SkillItemMain>
      <SkillItemCostAction layout="summary" />
    </SkillItemBody>
  );
}
