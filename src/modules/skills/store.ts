import { create } from 'zustand';

type SkillModalStore = {
  open: boolean;
  options: string[];
  currentSkills: string[];
  onSelect: (skills: string[]) => void;
};

export const useSkillModalStore = create<SkillModalStore>()((_) => ({
  open: false,
  options: [],
  currentSkills: [],
  onSelect: () => {},
}));

type OpenSkillPickerParams = {
  runnerId: string;
  umaId: string;
  currentSkills: string[];
  options: string[];
  onSelect: (skills: string[]) => void;
};

export const openSkillPicker = (params: OpenSkillPickerParams) => {
  const { options, currentSkills, onSelect } = params;

  useSkillModalStore.setState({ open: true, options, currentSkills, onSelect });
};

export const updateCurrentSkills = (skills: string[]) => {
  useSkillModalStore.setState({ currentSkills: skills });
};

export const resetSkillPicker = () => {
  useSkillModalStore.setState({
    options: [],
    currentSkills: [],
    onSelect: () => {},
  });
};
