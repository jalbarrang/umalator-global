import { create } from 'zustand';

type SkillModalStore = {
  open: boolean;
  umaId: string;
  options: string[];
  currentSkills: string[];
  onSelect: (skills: string[]) => void;
};

export const useSkillModalStore = create<SkillModalStore>()((_) => ({
  open: false,
  umaId: '',
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
  const { umaId, options, currentSkills, onSelect } = params;

  useSkillModalStore.setState({ open: true, umaId, options, currentSkills, onSelect });
};

export const updateCurrentSkills = (skills: string[]) => {
  useSkillModalStore.setState({ currentSkills: skills });
};

export const resetSkillPicker = () => {
  useSkillModalStore.setState({
    umaId: '',
    options: [],
    currentSkills: [],
    onSelect: () => {},
  });
};
