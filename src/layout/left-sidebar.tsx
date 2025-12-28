import { BookmarkIcon, SlidersHorizontalIcon, UsersIcon } from 'lucide-react';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { RunnersPanel } from '@/modules/runners/components/runners-panel';
import { AdvancedSettingsPanel } from '@/components/advanced-settings-panel';
import { PresetsPanel } from '@/components/presets-panel';
import { setLeftSidebar, useLeftSidebar } from '@/store/ui.store';

const panels = [
  {
    id: 'runners',
    label: 'Runners',
    icon: UsersIcon,
    content: <RunnersPanel />,
  },
  {
    id: 'presets',
    label: 'Presets',
    icon: BookmarkIcon,
    content: <PresetsPanel />,
  },
  {
    id: 'advanced-settings',
    label: 'Advanced Settings',
    icon: SlidersHorizontalIcon,
    content: <AdvancedSettingsPanel />,
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
              <TooltipTrigger
                render={
                  <Button
                    variant={activePanel === panel.id ? 'secondary' : 'ghost'}
                    size="icon"
                    className={cn('h-9 w-9', activePanel === panel.id && 'bg-accent')}
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
                }
              />
              <TooltipContent side="right">
                <p>{panel.label}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>

      {/* Side Panel */}
      <div
        className={cn(
          // Base styles
          'flex flex-col border-r bg-background',
          {
            'w-[calc(100dvw-3rem)] md:w-[450px]': !hidden,
            'w-0 overflow-hidden': hidden,
          },
        )}
      >
        <div className="flex flex-col h-full">
          {/* Panel Content */}
          <div className="flex-1 min-h-0">{activePanelContent}</div>
        </div>
      </div>
    </div>
  );
};
