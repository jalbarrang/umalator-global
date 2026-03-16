import { useCallback, useMemo } from 'react';
import {
  addObtainedSkill,
  removeCandidate,
  removeObtainedSkill,
  setCandidateHintLevel,
  useSkillPlannerStore,
} from '../skill-planner.store';
import { calculateSkillCost } from '../cost-calculator';
import type { CandidateSkill, HintLevel } from '../types';
import { getUniqueSkillForByUmaId } from '@/modules/skills/utils';
import { Separator } from '@/components/ui/separator';
import { SkillItem } from '@/modules/skills/components/skill-list/SkillItem';
import type { SkillMeta } from '@/modules/skills/components/skill-list/skill-item.context';
import { getBaseTier, getUpgradeTier, getWhiteVersion } from '@/modules/skills/skill-relationships';
import { skillCollection } from '@/modules/data/skills';

export function CandidateSkillList() {
  const { candidates, runner, obtainedSkills, hasFastLearner } = useSkillPlannerStore();

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
      return {
        hintLevel: candidate?.hintLevel ?? 0,
        bought: obtainedSkills.includes(skillId),
      };
    },
    [candidates, obtainedSkills],
  );

  const totalNetCost = useMemo(() => {
    let total = 0;
    for (const candidate of candidateList) {
      if (obtainedSkills.includes(candidate.skillId)) continue;
      total += computeTotalNetCost(
        candidate.skillId,
        candidate.hintLevel,
        hasFastLearner,
        getSkillMeta,
      );
    }
    return total;
  }, [candidateList, obtainedSkills, hasFastLearner, getSkillMeta]);

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
        {candidateList.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p className="text-sm">No candidate skills added yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {candidateList.map((candidate) => (
              <CandidateSkillItem
                key={candidate.skillId}
                candidate={candidate}
                isUnique={candidate.skillId === uniqueSkillId}
                hasFastLearner={hasFastLearner}
                onHintLevelChange={handleHintLevelChange}
                onBoughtChange={handleBoughtChange}
                onRemove={handleRemove}
                getSkillMeta={getSkillMeta}
              />
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
  onHintLevelChange: (skillId: string, level: number) => void;
  onBoughtChange: (skillId: string, bought: boolean) => void;
  onRemove: (skillId: string) => void;
  getSkillMeta: (skillId: string) => SkillMeta;
};

function CandidateSkillItem(props: CandidateSkillItemProps) {
  const {
    candidate,
    isUnique,
    hasFastLearner,
    onHintLevelChange,
    onBoughtChange,
    onRemove,
    getSkillMeta,
  } = props;

  const netCost = useMemo(
    () => computeTotalNetCost(candidate.skillId, candidate.hintLevel, hasFastLearner, getSkillMeta),
    [candidate.skillId, candidate.hintLevel, hasFastLearner, getSkillMeta],
  );

  return (
    <SkillItem
      skillId={candidate.skillId}
      dismissable={!isUnique}
      spCost={netCost}
      hasFastLearner={hasFastLearner}
      onHintLevelChange={onHintLevelChange}
      onBoughtChange={onBoughtChange}
      onRemove={onRemove}
      getSkillMeta={getSkillMeta}
    />
  );
}

export function computeTotalNetCost(
  skillId: string,
  hintLevel: HintLevel,
  hasFastLearner: boolean,
  getSkillMeta: (id: string) => SkillMeta,
): number {
  const selfNet = calculateSkillCost(skillId, hintLevel, hasFastLearner);
  const skill = skillCollection[skillId];

  if (skill.rarity !== 2) return selfNet;

  const whiteVersionId = getWhiteVersion(skillId);
  if (!whiteVersionId) return selfNet;

  const baseTierId = getBaseTier(whiteVersionId);
  const upgradeTierId = getUpgradeTier(baseTierId);
  const prereqIds = [baseTierId, upgradeTierId].filter((pid): pid is string =>
    Boolean(pid && pid !== skillId),
  );

  let prereqNet = 0;
  for (const pid of new Set(prereqIds)) {
    const meta = getSkillMeta(pid);
    if (meta.bought) continue;
    prereqNet += calculateSkillCost(pid, meta.hintLevel as HintLevel, hasFastLearner);
  }

  return selfNet + prereqNet;
}
