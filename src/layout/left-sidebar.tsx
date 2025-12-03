import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { SettingsIcon, UsersIcon } from 'lucide-react';
import { RunnersPanel } from '@/modules/runners/components/runners-panel';
import { RacetrackSettings } from '@/modules/racetrack/components/racetrack-settings';
import { setLeftSidebar, useLeftSidebar } from '@/store/ui.store';
import { useMemo } from 'react';

const panels = [
  {
    id: 'runners',
    label: 'Runners',
    icon: UsersIcon,
    content: <RunnersPanel />,
  },
  {
    id: 'racetrack-settings',
    label: 'Race Settings',
    icon: SettingsIcon,
    content: <RacetrackSettings />,
  },
];

export const LeftSidebar = () => {
  const { activePanel, hidden } = useLeftSidebar();

  const activePanelContent = useMemo(() => {
    return panels.find((panel) => panel.id === activePanel)?.content;
  }, [activePanel]);

  return (
    <div className="flex">
      {/* Activity Bar */}
      <div className="flex flex-col w-12 bg-muted/50 border-r">
        <div className="flex flex-col gap-1 p-1">
          {panels.map((panel) => (
            <Tooltip key={panel.id}>
              <TooltipTrigger asChild>
                <Button
                  variant={activePanel === panel.id ? 'secondary' : 'ghost'}
                  size="icon"
                  className={cn(
                    'h-9 w-9',
                    activePanel === panel.id && 'bg-accent',
                  )}
                  onClick={() => {
                    if (activePanel === panel.id && !hidden) {
                      setLeftSidebar({ hidden: true });
                    } else {
                      setLeftSidebar({ activePanel: panel.id, hidden: false });
                    }
                  }}
                >
                  <panel.icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{panel.label}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>

      {/* Side Panel */}
      <div
        className={cn('flex flex-col w-[500px] border-r bg-background', {
          'w-0 overflow-hidden': hidden,
        })}
      >
        <div className="flex flex-col h-full">
          {/* Panel Content */}
          <div className="flex-1 min-h-0">{activePanelContent}</div>
        </div>
      </div>
    </div>
  );
};
