import { Activity, useState } from 'react';
import { Outlet } from 'react-router';
import { Construction, XIcon } from 'lucide-react';

import { LeftSidebar } from '@/layout/left-sidebar';
import { SimulationModeToggle } from '@/components/simulation-mode-toggle';
import { SkillPickerDrawer } from '@/modules/skills/components/skill-list/SkillPickerDrawer';
import { useSkillModalStore } from '@/modules/skills/store';
import { Alert, AlertTitle, AlertDescription, AlertAction } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
const DISMISS_KEY = 'compare-mode-notice-dismissed';

export function SimulationLayout() {
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(DISMISS_KEY) === '1');
  const [showMore, setShowMore] = useState(false);
  const { open, umaId, options, currentSkills, onSelect } = useSkillModalStore();

  const handleOpenChange = (value: boolean) => {
    useSkillModalStore.setState({ open: value });
  };

  return (
    <>
      <SkillPickerDrawer
        open={open}
        umaId={umaId}
        options={options}
        currentSkills={currentSkills}
        onSelect={onSelect}
        onOpenChange={handleOpenChange}
      />
      <LeftSidebar />

      <div className="flex flex-col flex-1 p-4 gap-4">
        {!dismissed && (
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <Construction className="text-amber-600 dark:text-amber-400" />

            <AlertTitle className="text-amber-700 dark:text-amber-300">Comparison Mode</AlertTitle>

            <AlertDescription className="text-amber-700/80 dark:text-amber-400/80 flex flex-col gap-2">
              <div className="text-xs">
                These tools compare bassin gain between configurations, not a race simulation. A
                full 9-runner race sim is being developed.
              </div>

              <div>
                <Button variant="outline" size="sm" onClick={() => setShowMore(!showMore)}>
                  {showMore ? 'Show less' : 'Read more'}
                </Button>
              </div>

              <Activity mode={showMore ? 'visible' : 'hidden'}>
                <div className="space-y-2 text-xs">
                  <div>
                    Each comparison runs two isolated simulations using the same seed and computes
                    the position difference in bassins (horse-lengths). There is no position
                    keeping, dueling, or spot struggle between compared runners.
                  </div>
                  <div>
                    Pacer settings have been removed as they don&apos;t apply to isolated
                    comparisons.
                  </div>
                </div>
              </Activity>
            </AlertDescription>

            <AlertAction className="flex flex-col gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  sessionStorage.setItem(DISMISS_KEY, '1');
                  setDismissed(true);
                }}
              >
                <XIcon />
              </Button>
            </AlertAction>
          </Alert>
        )}
        <SimulationModeToggle />
        <Outlet />
      </div>
    </>
  );
}
