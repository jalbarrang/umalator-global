import {
  SkillService,
  type SkillActivationCheck,
  type SkillsMap
} from '@/modules/data/services/SkillService';

export type GameToraSkillServiceOptions = {
  releasedSkillIds: Iterable<string>;
  activationChecks: Record<string, SkillActivationCheck>;
};

export class GameToraSkillService extends SkillService {
  constructor(skillsData: SkillsMap, options: GameToraSkillServiceOptions) {
    super(skillsData, options);
  }
}
