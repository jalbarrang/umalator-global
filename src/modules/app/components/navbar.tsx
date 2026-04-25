import { NavLink, useLocation } from 'react-router';
import { useCallback, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { SnapshotSwitcher } from '@/components/snapshot-switcher';
import { cn } from '@/lib/utils';
import { setShowChangelogModal, setShowCreditsModal } from '@/store/ui.store';
import { MenuIcon, ScrollTextIcon, UsersIcon } from 'lucide-react';

type NavItem = {
  value: string;
  label: string;
  to: string;
};

export function Navbar() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentTab = useMemo(() => {
    if (location.pathname.startsWith('/runners')) return 'runners';
    if (location.pathname === '/skill-planner') return 'skill-planner';
    if (location.pathname.startsWith('/race-sim')) return 'race-sim';
    return 'simulation';
  }, [location.pathname]);

  const navItems = useMemo<NavItem[]>(
    () => [
      { value: 'simulation', label: 'Compare', to: '/' },
      { value: 'skill-planner', label: 'Skill Planner', to: '/skill-planner' },
      { value: 'race-sim', label: 'Race Sim', to: '/race-sim' },
      { value: 'runners', label: 'Veterans', to: '/runners' },
    ],
    [],
  );

  const handleNavClick = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  return (
    <header className="flex py-2 justify-between items-center border-b px-4 shrink-0">
      <div className="md:hidden">
        <Drawer open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} direction="top">
          <DrawerTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open navigation menu">
              <MenuIcon className="h-5 w-5" />
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerTitle className="sr-only">Navigation</DrawerTitle>
            <nav className="flex flex-col p-2 gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.value}
                  to={item.to}
                  draggable={false}
                  onClick={handleNavClick}
                  className={cn(
                    'rounded-md px-3 py-2 text-sm font-medium text-left transition-colors',
                    currentTab === item.value
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                  )}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="border-t px-3 py-2">
              <SnapshotSwitcher />
            </div>
          </DrawerContent>
        </Drawer>
      </div>

      <nav className="hidden md:flex items-center gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.value}
            to={item.to}
            draggable={false}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              currentTab === item.value
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
            )}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <div className="hidden md:block">
          <SnapshotSwitcher />
        </div>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="outline"
                className="flex h-9 w-9 items-center justify-center"
                render={
                  <a
                    href="https://github.com/jalbarrang/umalator-global"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Open GitHub project"
                  />
                }
              />
            }
          >
            <img src="/svg/github.svg" alt="" aria-hidden="true" className="h-4 w-4 dark:invert" />
          </TooltipTrigger>
          <TooltipContent>GitHub</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="outline"
                className="flex h-9 w-9 items-center justify-center"
                onClick={() => setShowCreditsModal(true)}
                aria-label="Open credits"
              />
            }
          >
            <UsersIcon className="h-4 w-4" />
          </TooltipTrigger>
          <TooltipContent>Credits</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="outline"
                className="flex h-9 w-9 items-center justify-center"
                onClick={() => setShowChangelogModal(true)}
                aria-label="Open changelog"
              />
            }
          >
            <ScrollTextIcon className="h-4 w-4" />
          </TooltipTrigger>
          <TooltipContent>Changelog</TooltipContent>
        </Tooltip>
        <ThemeToggle />
      </div>
    </header>
  );
}
