import { Activity } from 'react';
import type { SkillEntry } from '@/modules/data/skills';
import type { SkillAlternative } from '@/lib/sunday-tools/skills/skill.types';
import { FormatParser, formatEffect } from '@/modules/skills/components/formatters';
import { HumanReadableParser } from '@/modules/skills/components/human-readable-formatter';
import { cn } from '@/lib/utils';
import i18n from '@/i18n';
import { Code } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { SkillIcon } from './skill-list/SkillItem';

type ExpandedSkillDetailsProps = {
  id: string;
  skill: SkillEntry;
  dismissable?: boolean;
  distanceFactor?: number;
};

function AlternativeDetails({
  alternative,
  distanceFactor,
}: {
  alternative: SkillAlternative;
  distanceFactor?: number;
}) {
  const precondition = alternative.precondition ?? '';

  return (
    <div className="flex flex-col gap-2">
      {precondition.length > 0 && (
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
            {i18n.t('skilldetails.preconditions')}
          </div>
          <div className="pl-1">{HumanReadableParser.parse(precondition).format()}</div>
          <Collapsible>
            <CollapsibleTrigger className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer mt-1">
              <Code className="w-3 h-3" />
              Raw
            </CollapsibleTrigger>
            <CollapsibleContent>
              <pre className="mt-1 p-2 rounded bg-foreground/5 border border-foreground/10 text-xs font-mono overflow-x-auto">
                {FormatParser.parse(precondition).format()}
              </pre>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      <div>
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
          {i18n.t('skilldetails.conditions')}
        </div>
        <div className="pl-1">
          {HumanReadableParser.parse(alternative.condition).format()}
        </div>
        <Collapsible>
          <CollapsibleTrigger className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer mt-1">
            <Code className="w-3 h-3" />
            Raw
          </CollapsibleTrigger>
          <CollapsibleContent>
            <pre className="mt-1 p-2 rounded bg-foreground/5 border border-foreground/10 text-xs font-mono overflow-x-auto">
              {FormatParser.parse(alternative.condition).format()}
            </pre>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <div>
        {i18n.t('skilldetails.effects')}

        <div>
          {alternative.effects.map((ef, effectIndex) => {
            const type = ef.type;
            const modifier = ef.modifier / 10000;
            const effectType = formatEffect[type as keyof typeof formatEffect];
            const effectValue = effectType ? effectType(modifier) : modifier;

            return (
              <div key={effectIndex} className="flex items-center gap-2">
                <div>{i18n.t(`skilleffecttypes.${type}`)}</div>
                <div>{effectValue}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        {alternative.baseDuration > 0 && (
          <div>
            {i18n.t('skilldetails.baseduration')}{' '}
            {i18n.t('skilldetails.seconds', {
              n: alternative.baseDuration / 10000,
            })}
          </div>
        )}

        {distanceFactor && alternative.baseDuration > 0 && (
          <div>
            {i18n.t('skilldetails.effectiveduration', {
              distance: distanceFactor,
            })}{' '}
            {i18n.t('skilldetails.seconds', {
              n: +(
                (alternative.baseDuration / 10000) *
                (distanceFactor / 1000)
              ).toFixed(2),
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function ExpandedSkillDetails(props: ExpandedSkillDetailsProps) {
  const { skill: skillData } = props;

  return (
    <div className={cn('bg-background border-2 rounded-b-sm flex flex-col')}>
      <div className="text-sm p-2">
        <div className="flex flex-col gap-1 mb-1">
          <div className="flex items-center gap-2">
            <Activity mode="visible">
              <SkillIcon iconId={skillData.iconId} />
            </Activity>
            <div className="text-sm font-medium">{skillData.name}</div>
          </div>
          <div className="text-xs text-muted-foreground">
            {i18n.t('skilldetails.id')}
            {props.id}
          </div>
        </div>

        {skillData.alternatives.length > 1 ? (
          <Tabs defaultValue={0}>
            <TabsList>
              {skillData.alternatives.map((_, index) => (
                <TabsTrigger key={index} value={index}>
                  Alt {index + 1}
                </TabsTrigger>
              ))}
            </TabsList>
            {skillData.alternatives.map((alternative, index) => (
              <TabsContent key={index} value={index}>
                <AlternativeDetails
                  alternative={alternative}
                  distanceFactor={props.distanceFactor}
                />
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <AlternativeDetails
            alternative={skillData.alternatives[0]}
            distanceFactor={props.distanceFactor}
          />
        )}
      </div>
    </div>
  );
}
