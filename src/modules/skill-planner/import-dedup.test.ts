import { beforeEach, describe, expect, it } from 'vitest';
import { importFromCode, startOver, useSkillPlannerStore } from './skill-planner.store';

const runner = {
  outfitId: '100101',
  speed: 1200,
  stamina: 1000,
  power: 800,
  guts: 400,
  wisdom: 600
};

const getCandidateIds = () => Object.keys(useSkillPlannerStore.getState().candidates).sort();

describe('importFromCode family dedup', () => {
  beforeEach(() => {
    startOver();
  });

  it('keeps the gold when an imported family also lists its white prerequisite', () => {
    // Beeline Burst (gold 200361) + Straightaway Adept (white sibling 200362).
    importFromCode({
      runner,
      obtainedSkillIds: [],
      candidates: [
        { skillId: '200361', hintLevel: 0 },
        { skillId: '200362', hintLevel: 0 }
      ],
      budget: 1000,
      hasFastLearner: false
    });

    expect(getCandidateIds()).toEqual(['200361']);
  });

  it('keeps the gold regardless of candidate ordering', () => {
    // White sibling listed before the gold — must still collapse to the gold.
    importFromCode({
      runner,
      obtainedSkillIds: [],
      candidates: [
        { skillId: '200362', hintLevel: 0 },
        { skillId: '200361', hintLevel: 0 }
      ],
      budget: 1000,
      hasFastLearner: false
    });

    expect(getCandidateIds()).toEqual(['200361']);
  });

  it('collapses a mixed gold / ◎ / ○ family down to the gold', () => {
    // Firm Conditions ○ (200152), ◎ (200151) + Firm Course Menace gold (200154).
    importFromCode({
      runner,
      obtainedSkillIds: [],
      candidates: [
        { skillId: '200152', hintLevel: 0 },
        { skillId: '200151', hintLevel: 0 },
        { skillId: '200154', hintLevel: 0 }
      ],
      budget: 1000,
      hasFastLearner: false
    });

    expect(getCandidateIds()).toEqual(['200154']);
  });

  it('keeps the ◎ upgrade tier over the ○ base for a pure-white family', () => {
    importFromCode({
      runner,
      obtainedSkillIds: [],
      candidates: [
        { skillId: '200152', hintLevel: 0 }, // ○ base
        { skillId: '200151', hintLevel: 0 } // ◎ upgrade
      ],
      budget: 1000,
      hasFastLearner: false
    });

    expect(getCandidateIds()).toEqual(['200151']);
  });

  it('preserves unrelated candidates across different families', () => {
    importFromCode({
      runner,
      obtainedSkillIds: [],
      candidates: [
        { skillId: '200154', hintLevel: 0 }, // Firm Course Menace (gold)
        { skillId: '200361', hintLevel: 0 } // Beeline Burst (gold)
      ],
      budget: 1000,
      hasFastLearner: false
    });

    expect(getCandidateIds()).toEqual(['200154', '200361']);
  });
});
