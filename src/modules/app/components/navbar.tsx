import { NavLink, useLocation } from 'react-router';
import { useCallback, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { MenuIcon } from 'lucide-react';

import { useIsMobile } from '@/hooks/use-mobile';

type NavItem = {
  value: string;
  label: string;
  to: string;
};

export function Navbar() {
  const { pathname } = useLocation();

  const isMobile = useIsMobile();

  const currentTab = useMemo(() => {
    if (pathname.startsWith('/runners')) return 'runners';
    if (pathname === '/skill-planner') return 'skill-planner';
    if (pathname === '/skills') return 'skills';
    if (pathname === '/support-cards') return 'support-cards';
    if (pathname === '/carat-calculator') return 'carat-calculator';
    if (pathname.startsWith('/race-sim')) return 'race-sim';
    return 'simulation';
  }, [pathname]);

  const navItems = useMemo<NavItem[]>(
    () => [
      { value: 'simulation', label: 'Compare', to: '/' },
      { value: 'skill-planner', label: 'Skill Planner', to: '/skill-planner' },
      { value: 'skills', label: 'Skills', to: '/skills' },
      { value: 'support-cards', label: 'Support Cards', to: '/support-cards' },
      { value: 'carat-calculator', label: 'Carat Calculator', to: '/carat-calculator' },
      { value: 'race-sim', label: 'Race Sim', to: '/race-sim' },
      { value: 'runners', label: 'Veterans', to: '/runners' }
    ],
    []
  );

  return (
    <header className="flex py-2 justify-between items-center border-b px-4 shrink-0">
      {isMobile ? (
        <MobileNavbar navItems={navItems} currentTab={currentTab} />
      ) : (
        <DesktopNavbar navItems={navItems} currentTab={currentTab} />
      )}

      <div className="flex items-center gap-2">
        <ThemeToggle />
      </div>
    </header>
  );
}

type MobileNavbarProps = {
  navItems: NavItem[];
  currentTab: string;
};

const MobileNavbar = (props: MobileNavbarProps) => {
  const { navItems, currentTab } = props;

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  return (
    <Drawer open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} direction="top">
      <DrawerTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open navigation menu">
          <MenuIcon className="size-5" />
        </Button>
      </DrawerTrigger>

      <DrawerContent aria-describedby="">
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
                {
                  'bg-accent text-accent-foreground': currentTab === item.value,
                  'text-muted-foreground hover:bg-accent/50 hover:text-foreground':
                    currentTab !== item.value
                }
              )}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </DrawerContent>
    </Drawer>
  );
};

type DesktopNavbarProps = {
  navItems: NavItem[];
  currentTab: string;
};

const DesktopNavbar = (props: DesktopNavbarProps) => {
  const { navItems, currentTab } = props;

  return (
    <nav className="flex items-center gap-1">
      {navItems.map((item) => (
        <NavLink
          key={item.value}
          to={item.to}
          draggable={false}
          className={cn('rounded-md px-3 py-1.5 text-sm font-medium transition-colors', {
            'bg-accent text-accent-foreground': item.value === currentTab,
            'text-muted-foreground hover:bg-accent/50 hover:text-foreground':
              item.value !== currentTab
          })}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
};
