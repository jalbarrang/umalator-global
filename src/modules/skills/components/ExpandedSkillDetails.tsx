import { useEffect, useRef } from 'react';
import type { SkillEntry } from '@/modules/data/skills';
import { FormatParser, formatEffect } from '@/modules/skills/components/formatters';
import { cn } from '@/lib/utils';
import i18n from '@/i18n';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';

type ExpandedSkillDetailsProps = {
  id: string;
  skillData: Pick<SkillEntry, 'alternatives'>;
  dismissable?: boolean;
  distanceFactor?: number;
  forcedPosition?: number;
  onPositionChange?: (position: string | undefined) => void;
};

export function ExpandedSkillDetails(props: ExpandedSkillDetailsProps) {
  const { skillData, forcedPosition, onPositionChange } = props;

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.value = forcedPosition?.toString() ?? '';
    }
  }, [inputRef, forcedPosition]);

  return (
    <div className={cn('bg-background border-2 rounded-b-sm flex flex-col')}>
      <div className="text-sm p-2">
        <div>
          {i18n.t('skilldetails.id')}
          {props.id}
        </div>

        {skillData.alternatives.map((alternative, index) => {
          const precondition = alternative.precondition ?? '';

          return (
            <div key={index} className="skillDetailsSection">
              {precondition.length > 0 && (
                <>
                  {i18n.t('skilldetails.preconditions')}
                  <div className="skillConditions">{FormatParser.parse(precondition).format()}</div>
                </>
              )}

              {i18n.t('skilldetails.conditions')}

              <div className="skillConditions">
                {FormatParser.parse(alternative.condition).format()}
              </div>

              {i18n.t('skilldetails.effects')}

              <div className="skillEffects">
                {alternative.effects.map((ef, effectIndex) => {
                  const type = ef.type;
                  const modifier = ef.modifier / 10000;
                  const effectType = formatEffect[type as keyof typeof formatEffect];
                  const effectValue = effectType ? effectType(modifier) : modifier;

                  return (
                    <div key={effectIndex} className="skillEffect">
                      <span className="skillEffectType">{i18n.t(`skilleffecttypes.${type}`)}</span>

                      <span className="skillEffectValue">{effectValue}</span>
                    </div>
                  );
                })}
              </div>

              {alternative.baseDuration > 0 && (
                <span className="skillDuration">
                  {i18n.t('skilldetails.baseduration')}{' '}
                  {i18n.t('skilldetails.seconds', {
                    n: alternative.baseDuration / 10000,
                  })}
                </span>
              )}

              {props.distanceFactor && alternative.baseDuration > 0 && (
                <span className="skillDuration">
                  {i18n.t('skilldetails.effectiveduration', {
                    distance: props.distanceFactor,
                  })}{' '}
                  {i18n.t('skilldetails.seconds', {
                    n: +(
                      (alternative.baseDuration / 10000) *
                      (props.distanceFactor / 1000)
                    ).toFixed(2),
                  })}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <Separator />

      <div className="flex flex-col gap-2 p-2">
        <Label>Force @ position (m):</Label>

        <InputGroup>
          <InputGroupInput
            ref={inputRef}
            type="number"
            placeholder="Optional"
            onBlur={(e) => onPositionChange?.(e.currentTarget.value)}
            min={0}
            step={10}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              variant="outline"
              size="sm"
              onClick={() => onPositionChange?.(undefined)}
            >
              Clear
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </div>
  );
}
