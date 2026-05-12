import type { ReactNode } from 'react';
import {
  SkillItemActions,
  SkillItemBody,
  SkillItemIdentity,
  SkillItemMain,
  SkillItemRail,
  SkillItemRoot,
} from '@/modules/skills/components/skill-list/skill-item/primitives';
import { SkillItemDetailsActions } from '@/modules/skills/components/skill-list/skill-item/actions';

export function OcrDetectedSkillRow({
  dismissable,
  onDismiss,
  replaceAction,
}: Readonly<{ dismissable: boolean; onDismiss?: () => void; replaceAction?: ReactNode }>) {
  return (
    <SkillItemRoot>
      <SkillItemRail />
      <SkillItemBody className="p-1 px-2">
        <SkillItemMain>
          <SkillItemIdentity />

          <SkillItemActions>
            {dismissable && replaceAction}
            <SkillItemDetailsActions dismissable={dismissable} onDismiss={onDismiss} />
          </SkillItemActions>
        </SkillItemMain>
      </SkillItemBody>
    </SkillItemRoot>
  );
}
