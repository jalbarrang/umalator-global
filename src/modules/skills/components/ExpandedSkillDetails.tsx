import { SkillData } from '@/modules/skills/utils';
import {
  FormatParser,
  formatEffect,
} from '@/modules/skills/components/formatters';
import { cn } from '@/lib/utils';
import i18n from '@/i18n';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

type ExpandedSkillDetailsProps = {
  id: string;
  skillData: SkillData;
  dismissable?: boolean;
  distanceFactor?: number;
  forcedPosition?: number;
  onPositionChange?: (position: number) => void;
};

export function ExpandedSkillDetails(props: ExpandedSkillDetailsProps) {
  const { skillData } = props;

  return (
    <div className={cn('bg-background border-2 rounded-b-sm flex flex-col')}>
      <div className="text-sm p-2">
        <div>
          {i18n.t('skilldetails.id')}
          {props.id}
        </div>

        {skillData.alternatives.map((alt, index) => (
          <div key={index} className="skillDetailsSection">
            {alt.precondition.length > 0 && (
              <>
                {i18n.t('skilldetails.preconditions')}
                <div className="skillConditions">
                  {FormatParser.parse(
                    FormatParser.tokenize(alt.precondition),
                  ).format()}
                </div>
              </>
            )}

            {i18n.t('skilldetails.conditions')}

            <div className="skillConditions">
              {FormatParser.parse(
                FormatParser.tokenize(alt.condition),
              ).format()}
            </div>

            {i18n.t('skilldetails.effects')}

            <div className="skillEffects">
              {alt.effects.map((ef, effectIndex) => (
                <div key={effectIndex} className="skillEffect">
                  <span className="skillEffectType">
                    {i18n.t(`skilleffecttypes.${ef.type}`)}
                  </span>

                  <span className="skillEffectValue">
                    {ef.type in formatEffect
                      ? formatEffect[ef.type](ef.modifier / 10000)
                      : ef.modifier / 10000}
                  </span>
                </div>
              ))}
            </div>

            {alt.baseDuration > 0 && (
              <span className="skillDuration">
                {i18n.t('skilldetails.baseduration')}{' '}
                {i18n.t('skilldetails.seconds', {
                  n: alt.baseDuration / 10000,
                })}
              </span>
            )}

            {props.distanceFactor && alt.baseDuration > 0 && (
              <span className="skillDuration">
                {i18n.t('skilldetails.effectiveduration', {
                  distance: props.distanceFactor,
                })}{' '}
                {i18n.t('skilldetails.seconds', {
                  n: +(
                    (alt.baseDuration / 10000) *
                    (props.distanceFactor / 1000)
                  ).toFixed(2),
                })}
              </span>
            )}
          </div>
        ))}
      </div>

      <Separator />

      <div className="flex flex-col gap-2 p-2">
        <Label>Force @ position (m):</Label>

        <Input
          type="number"
          className="text-sm"
          placeholder="Optional"
          value={props.forcedPosition}
          onInput={(e) => props.onPositionChange(+e.currentTarget.value)}
          onClick={(e) => e.stopPropagation()}
          min={0}
          step={10}
        />
      </div>
    </div>
  );
}
