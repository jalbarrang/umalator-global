declare module '@/modules/data/skill_data.json' {
  type ISkillEffect = { type: number; modifier: number; target: number };

  type ISkillAlternative = {
    precondition: string;
    condition: string;
    baseDuration: number;
    effects: Array<ISkillEffect>;
  };

  type ISkillData = {
    alternatives: Array<ISkillAlternative>;
    rarity: number;
  };

  const skillsDataList: Record<string, ISkillData>;

  export default skillsDataList;
}

declare module '@/modules/data/skill_meta.json' {
  type ISkillMeta = {
    groupId: number;
    iconId: string;
    baseCost: number;
    order: number;
  };

  const skillMetaList: Record<string, ISkillMeta>;

  export default skillMetaList;
}

declare module '@/modules/data/skillnames.json' {
  const skillNamesList: Record<string, Array<string>>;

  export default skillNamesList;
}
