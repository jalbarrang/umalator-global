import { BookmarkIcon, CrosshairIcon, ShieldAlertIcon, SlidersHorizontalIcon, UsersIcon } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { RunnersPanel } from '@/modules/runners/components/runners-panel';
import { AdvancedSettingsPanel } from '@/components/advanced-settings-panel';
import { PresetsPanel } from '@/components/presets-panel';
import { DebuffsPanel } from '@/modules/simulation/components/DebuffsPanel';
import { ForcedPositionsPanel } from '@/modules/simulation/components/ForcedPositionsPanel';
import { useDebuffs } from '@/modules/simulation/stores/compare.store';
import { useForcedPositions } from '@/modules/simulation/stores/forced-positions.store';
import { setLeftSidebar, useLeftSidebar } from '@/store/ui.store';

export const LeftSidebar = () => {
  const { activePanel, hidden } = useLeftSidebar();
  const { uma1, uma2 } = useForcedPositions();
  const { uma1: uma1Debuffs, uma2: uma2Debuffs } = useDebuffs();
  const location = useLocation();
  const hasForcedPositions = Object.keys(uma1).length > 0 || Object.keys(uma2).length > 0;
  const hasDebuffs = uma1Debuffs.length > 0 || uma2Debuffs.length > 0;

  const isCompareRunnersView = location.pathname === '/';

  const panels = useMemo(() => {
    const basePanels = [
      {
        id: 'runners',
        label: 'Runners',
        icon: UsersIcon,
        content: <RunnersPanel />,
        hasBadge: false,
      },
      {
        id: 'presets',
        label: 'Presets',
        icon: BookmarkIcon,
        content: <PresetsPanel />,
        hasBadge: false,
      },
      {
        id: 'advanced-settings',
        label: 'Advanced Settings',
        icon: SlidersHorizontalIcon,
        content: <AdvancedSettingsPanel />,
        hasBadge: false,
      },
    ];

    if (isCompareRunnersView) {
      basePanels.push({
        id: 'forced-positions',
        label: 'Force Skill Positions',
        icon: CrosshairIcon,
        content: <ForcedPositionsPanel />,
        hasBadge: hasForcedPositions,
      });
      basePanels.push({
        id: 'debuffs',
        label: 'Debuffs',
        icon: ShieldAlertIcon,
        content: <DebuffsPanel />,
        hasBadge: hasDebuffs,
      });
    }

    return basePanels;
  }, [hasDebuffs, hasForcedPositions, isCompareRunnersView]);

  useEffect(() => {
    const panelIsValid = panels.some((panel) => panel.id === activePanel);
    if (!panelIsValid) {
      setLeftSidebar({ activePanel: 'runners' });
    }
  }, [activePanel, panels]);

  const activePanelContent = useMemo(() => {
    return panels.find((panel) => panel.id === activePanel)?.content;
  }, [activePanel, panels]);

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
                    className={cn('relative h-9 w-9', activePanel === panel.id && 'bg-accent')}
                    onClick={() => {
                      if (activePanel === panel.id && !hidden) {
                        setLeftSidebar({ hidden: true });
                      } else {
                        setLeftSidebar({ activePanel: panel.id, hidden: false });
                      }
                    }}
                  >
                    <panel.icon className="h-4 w-4" />
                    {panel.hasBadge && (
                      <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary ring-1 ring-background" />
                    )}
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
