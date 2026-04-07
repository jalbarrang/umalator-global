import { useCallback, useMemo } from 'react';
import {
  getSkillPlanningMeta,
  removeCandidate,
  setCandidateHintLevel,
  useSkillPlannerStore,
} from '../skill-planner.store';
import type { CandidateSkill, HintLevel } from '../types';
import { Separator } from '@/components/ui/separator';
import {
  SkillItemBody,
  SkillItemCostAction,
  SkillItemDetailsActions,
  SkillItemIdentity,
  SkillItem,
  SkillItemMain,
  SkillItemRail,
  SkillItemRoot,
  type SkillMeta,
} from '@/modules/skills/components/skill-list/skill-item';
import {
  buildDedupedSkillListNetTotal,
  buildSkillCostSummary,
  type SkillCostSummary,
} from '@/modules/skills/skill-cost-summary';

export function CandidateSkillList() {
  const { candidates, skillMetaById, obtainedSkillIds, hasFastLearner } = useSkillPlannerStore();

  const candidateList = useMemo(() => Object.values(candidates), [candidates]);

  const handleHintLevelChange = useCallback((skillId: string, level: number) => {
    setCandidateHintLevel(skillId, level as HintLevel);
  }, []);

  const handleRemove = useCallback((skillId: string) => {
    removeCandidate(skillId);
  }, []);

  // Re-derive getSkillMeta when store meta or obtained skills change so
  // cost summaries and the popover always reflect the latest hint levels.
  const getSkillMeta = useCallback(
    (skillId: string): SkillMeta => {
      const meta = getSkillPlanningMeta(skillId);
      return {
        hintLevel: meta.hintLevel,
        bought: meta.bought ?? false,
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally re-derive when store data changes
    [skillMetaById, obtainedSkillIds],
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
        {candidateList.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <p className="text-sm">No candidate skills added yet.</p>
          </div>
        )}

        {candidateList.length > 0 && (
          <div className="flex flex-wrap items-stretch gap-2">
            {candidateList.map((candidate) => (
              <div
                key={candidate.skillId}
                className="basis-full min-w-0 sm:min-w-[280px] sm:basis-[320px] flex-1"
              >
                <CandidateSkillItem
                  candidate={candidate}
                  hasFastLearner={hasFastLearner}
                  costSummary={costSummaryBySkillId[candidate.skillId]}
                  onHintLevelChange={handleHintLevelChange}
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
  hasFastLearner: boolean;
  costSummary: SkillCostSummary;
  onHintLevelChange: (skillId: string, level: number) => void;
  onRemove: (skillId: string) => void;
  getSkillMeta: (skillId: string) => SkillMeta;
};

function CandidateSkillRow() {
  return (
    <SkillItemRoot size="summary">
      <SkillItemRail />
      <SkillItemBody className="flex-col gap-2">
        <SkillItemMain className="p-1 px-2">
          <SkillItemIdentity />
          <SkillItemDetailsActions dismissable className="shrink-0" />
        </SkillItemMain>

        <SkillItemCostAction layout="summary" />
      </SkillItemBody>
    </SkillItemRoot>
  );
}

function CandidateSkillItem(props: Readonly<CandidateSkillItemProps>) {
  const { candidate, hasFastLearner, costSummary, onHintLevelChange, onRemove, getSkillMeta } =
    props;

  return (
    <SkillItem
      skillId={candidate.skillId}
      hasFastLearner={hasFastLearner}
      costSummary={costSummary}
      onHintLevelChange={onHintLevelChange}
      onRemove={onRemove}
      getSkillMeta={getSkillMeta}
    >
      <CandidateSkillRow />
    </SkillItem>
  );
}
