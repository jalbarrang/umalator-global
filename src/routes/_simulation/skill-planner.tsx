import { useEffect } from 'react';
import { HelpCircleIcon } from 'lucide-react';
import { addCandidate } from '@/modules/skill-planner/store';
import { Panel, PanelContent, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { CandidateSkillList } from '@/modules/skill-planner/components/CandidateSkillList';
import { CostModifiersPanel } from '@/modules/skill-planner/components/CostModifiersPanel';
import { SkillPlannerResults } from '@/modules/skill-planner/components/SkillPlannerResults';
import { HelpDialog, useHelpDialog } from '@/modules/skill-planner/components/HelpDialog';
import { useSkillModalStore } from '@/modules/skills/store';

export function SkillPlanner() {
  const { open: helpOpen, setOpen: setHelpOpen } = useHelpDialog();

  // Set up skill picker to add candidates
  useEffect(() => {
    const unsubscribe = useSkillModalStore.subscribe((state) => {
      // When a skill is selected, add it as a candidate
      if (state.open && state.onSelect) {
        const originalOnSelect = state.onSelect;

        useSkillModalStore.setState({
          onSelect: (skills: Array<string>) => {
            // Add the first skill in the array as a candidate
            if (skills.length > 0) {
              addCandidate(skills[0], 0);
            }
            // Call the original handler
            originalOnSelect(skills);
            // Close the modal after selection
            useSkillModalStore.setState({ open: false });
          },
        });
      }
    });

    return unsubscribe;
  }, []);

  return (
    <>
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />

      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
        {/* Left Panel - Candidate Skills */}
        <Panel className="flex-1 lg:w-1/2">
          <PanelHeader>
            <PanelTitle className="flex items-center justify-between">
              <span>Candidate Skills</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setHelpOpen(true)}
                className="h-8 w-8 p-0"
              >
                <HelpCircleIcon className="w-4 h-4" />
              </Button>
            </PanelTitle>
          </PanelHeader>
        <PanelContent className="flex flex-col overflow-hidden">
          <CandidateSkillList />
        </PanelContent>
      </Panel>

      {/* Right Panel - Optimization Controls & Results */}
      <Panel className="flex-1 lg:w-1/2">
        <PanelHeader>
          <PanelTitle>Optimization</PanelTitle>
        </PanelHeader>
        <PanelContent className="flex flex-col gap-4">
          <CostModifiersPanel />
          <SkillPlannerResults />
        </PanelContent>
      </Panel>
      </div>
    </>
  );
}

