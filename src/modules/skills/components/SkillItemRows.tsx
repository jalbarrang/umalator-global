import {
  SkillItemActions,
  SkillItemBody,
  SkillItemCostAction,
  SkillItemDetailsActions,
  SkillItemIdentity,
  SkillItemMain,
  SkillItemRail,
  SkillItemRoot,
} from '@/modules/skills/components/skill-list/skill-item';

export function SimpleSkillRow({
  dismissable = false,
  className,
}: Readonly<{
  dismissable?: boolean;
  className?: string;
}>) {
  return (
    <SkillItemRoot className={className}>
      <SkillItemRail />
      <SkillItemBody className="p-1 px-2">
        <SkillItemMain>
          <SkillItemIdentity />
          <SkillItemActions>
            <SkillItemDetailsActions dismissable={dismissable} />
          </SkillItemActions>
        </SkillItemMain>
      </SkillItemBody>
    </SkillItemRoot>
  );
}

export function SummarySkillRow({
  dismissable = false,
}: Readonly<{
  dismissable?: boolean;
}>) {
  return (
    <SkillItemRoot size="summary">
      <SkillItemRail />
      <SkillItemBody className="flex-col gap-2">
        <SkillItemMain className="p-1 px-2">
          <SkillItemIdentity />
          <SkillItemDetailsActions dismissable={dismissable} className="shrink-0" />
        </SkillItemMain>
        <SkillItemCostAction layout="summary" />
      </SkillItemBody>
    </SkillItemRoot>
  );
}

export function InlineCostSkillRow({
  dismissable = false,
}: Readonly<{
  dismissable?: boolean;
}>) {
  return (
    <SkillItemRoot>
      <SkillItemRail />
      <SkillItemBody className="p-1 px-2">
        <SkillItemMain>
          <SkillItemIdentity />
          <SkillItemActions>
            <SkillItemCostAction layout="inline" />
            <SkillItemDetailsActions dismissable={dismissable} />
          </SkillItemActions>
        </SkillItemMain>
      </SkillItemBody>
    </SkillItemRoot>
  );
}
