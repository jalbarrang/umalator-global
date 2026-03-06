import {
  BookmarkIcon,
  CircleAlert,
  CrosshairIcon,
  SlidersHorizontalIcon,
  UsersIcon,
} from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Sidebar, SidebarContent, SidebarGroup, SidebarHeader } from '@/components/ui/sidebar';
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
  const { activePanel } = useLeftSidebar();
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
    <Sidebar
      side="left"
      collapsible="offcanvas"
      className="md:inset-y-auto! md:top-(--simulation-top-offset)! md:h-[calc(100svh-var(--simulation-top-offset))]!"
    >
      <SidebarHeader className="border-b p-1">
        <div className="flex flex-row items-center gap-1">
          {panels.map((panel) => (
            <Tooltip key={panel.id}>
              <TooltipTrigger
                render={
                  <Button
                    variant={activePanel === panel.id ? 'secondary' : 'ghost'}
                    size="icon"
                    className={cn('relative size-11', activePanel === panel.id && 'bg-accent')}
                    aria-label={panel.label}
                    onClick={() => {
                      setLeftSidebar({ activePanel: panel.id });
                    }}
                  >
                    <panel.icon className="h-4 w-4" />
                    {panel.hasBadge && (
                      <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary ring-1 ring-background" />
                    )}
                  </Button>
                }
              />
              <TooltipContent side="bottom">
                <p>{panel.label}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="h-full p-0">
          <div className="min-h-0 flex-1">{activePanelContent}</div>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};
