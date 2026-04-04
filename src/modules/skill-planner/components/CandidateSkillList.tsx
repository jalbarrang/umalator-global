import { useCallback, useMemo } from 'react';
import {
  addObtainedSkill,
  removeCandidate,
  removeObtainedSkill,
  setCandidateHintLevel,
  useSkillPlannerStore,
} from '../skill-planner.store';
import type { CandidateSkill, HintLevel } from '../types';
import { getUniqueSkillForByUmaId } from '@/modules/skills/utils';
import { Separator } from '@/components/ui/separator';
import {
  SkillItem,
  SkillItemContent,
  type SkillMeta,
} from '@/modules/skills/components/skill-list/skill-item';
import {
  buildDedupedSkillListNetTotal,
  buildSkillCostSummary,
  type SkillCostSummary,
} from '@/modules/skills/skill-cost-summary';

export function CandidateSkillList() {
  const { candidates, skillMetaById, runner, hasFastLearner } = useSkillPlannerStore();

  const candidateList = useMemo(() => Object.values(candidates), [candidates]);

  const uniqueSkillId = useMemo(() => {
    if (!runner.outfitId) return '';

    return getUniqueSkillForByUmaId(runner.outfitId);
  }, [runner.outfitId]);

  const handleHintLevelChange = useCallback((skillId: string, level: number) => {
    setCandidateHintLevel(skillId, level as HintLevel);
  }, []);

  const handleBoughtChange = useCallback((skillId: string, bought: boolean) => {
    if (bought) {
      addObtainedSkill(skillId);
    } else {
      removeObtainedSkill(skillId);
    }
  }, []);

  const handleRemove = useCallback((skillId: string) => {
    removeCandidate(skillId);
  }, []);

  const getSkillMeta = useCallback(
    (skillId: string): SkillMeta => {
      const candidate = candidates[skillId];
      const meta = skillMetaById[skillId];
      return {
        hintLevel: meta?.hintLevel ?? candidate?.hintLevel ?? 0,
        bought: meta?.bought ?? false,
      };
    },
    [candidates, skillMetaById],
  );

  const costSummaryBySkillId = useMemo(() => {
    const map: Record<string, SkillCostSummary> = {};

    for (const candidate of candidateList) {
      map[candidate.skillId] = buildSkillCostSummary({
        skillId: candidate.skillId,
        hasFastLearner,
        getSkillMeta,
      });
    }

    return map;
  }, [candidateList, hasFastLearner, getSkillMeta]);

  const totalNetCost = useMemo(() => {
    return buildDedupedSkillListNetTotal({
      visibleSkillIds: candidateList.map((candidate) => candidate.skillId),
      hasFastLearner,
      getSkillMeta,
    });
  }, [candidateList, hasFastLearner, getSkillMeta]);

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
        {candidateList.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p className="text-sm">No candidate skills added yet.</p>
          </div>
        ) : (
          <div className="flex flex-wrap items-stretch gap-2">
            {candidateList.map((candidate) => (
              <div
                key={candidate.skillId}
                className="basis-full min-w-0 sm:min-w-[280px] sm:basis-[320px] flex-1"
              >
                <CandidateSkillItem
                  candidate={candidate}
                  isUnique={candidate.skillId === uniqueSkillId}
                  hasFastLearner={hasFastLearner}
                  costSummary={costSummaryBySkillId[candidate.skillId]}
                  onHintLevelChange={handleHintLevelChange}
                  onBoughtChange={handleBoughtChange}
                  onRemove={handleRemove}
                  getSkillMeta={getSkillMeta}
                />
              </div>
            ))}
          </div>
        )}

        {candidateList.length > 0 && (
          <>
            <Separator />
            <div className="text-sm text-muted-foreground">
              <div className="flex justify-end gap-2">
                <span>Skills:</span>
                <span className="font-medium">{candidateList.length}</span>
              </div>
              <div className="flex justify-end gap-2">
                <span>SP needed:</span>
                <span className="font-semibold">{totalNetCost} SP</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

type CandidateSkillItemProps = {
  candidate: CandidateSkill;
  isUnique: boolean;
  hasFastLearner: boolean;
  costSummary: SkillCostSummary;
  onHintLevelChange: (skillId: string, level: number) => void;
  onBoughtChange: (skillId: string, bought: boolean) => void;
  onRemove: (skillId: string) => void;
  getSkillMeta: (skillId: string) => SkillMeta;
};

function CandidateSkillItem(props: Readonly<CandidateSkillItemProps>) {
  const {
    candidate,
    isUnique,
    hasFastLearner,
    costSummary,
    onHintLevelChange,
    onBoughtChange,
    onRemove,
    getSkillMeta,
  } = props;

  return (
    <SkillItem
      skillId={candidate.skillId}
      hasFastLearner={hasFastLearner}
      costSummary={costSummary}
      onHintLevelChange={onHintLevelChange}
      onBoughtChange={onBoughtChange}
      onRemove={onRemove}
      getSkillMeta={getSkillMeta}
    >
      <SkillItemContent dismissable={!isUnique} />
    </SkillItem>
  );
}
