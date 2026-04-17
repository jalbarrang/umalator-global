import {
  BookmarkIcon,
  CircleAlert,
  CrosshairIcon,
  SidebarClose,
  SlidersHorizontalIcon,
  UsersIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo } from 'react';
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

type Panel = {
  id: string;
  label: string;
  icon: React.ElementType;
  content: React.ReactNode;
  hasBadge: boolean;
};

export const LeftSidebar = () => {
  const { activePanel, hidden } = useLeftSidebar();
  const { uma1, uma2 } = useForcedPositions();
  const { uma1: uma1Debuffs, uma2: uma2Debuffs } = useDebuffs();
  const location = useLocation();
  const hasForcedPositions = Object.keys(uma1).length > 0 || Object.keys(uma2).length > 0;
  const hasDebuffs = uma1Debuffs.length > 0 || uma2Debuffs.length > 0;

  const isCompareRunnersView = location.pathname === '/';

  const panels = useMemo(() => {
    const basePanels: Panel[] = [
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
        icon: CircleAlert,
        content: <DebuffsPanel />,
        hasBadge: hasDebuffs,
      });
    }

    return basePanels;
  }, [hasDebuffs, hasForcedPositions, isCompareRunnersView]);

  const handleCloseSidebar = useCallback(() => {
    setLeftSidebar({ hidden: true });
  }, []);

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
    <div
      className={cn('flex flex-col border-r shrink-0 overflow-hidden', {
        'w-dvw md:w-[550px]': !hidden,
        'w-0': hidden,
      })}
    >
      {/* Activity Bar */}
      <div className="flex w-full justify-between bg-muted/50">
        <div className="flex flex-1 min-w-0 items-center justify-center gap-1 p-1">
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
              <TooltipContent>
                <p>{panel.label}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        <div className="flex items-center justify-center">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={handleCloseSidebar}
                >
                  <SidebarClose className="h-4 w-4" />
                </Button>
              }
            />
            <TooltipContent>Close</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Side Panel */}
      <div className="flex flex-col flex-1 min-h-0 min-w-0 bg-background">
        <div className="flex flex-1 min-h-0 min-w-0 overflow-auto">{activePanelContent}</div>
      </div>
    </div>
  );
};
